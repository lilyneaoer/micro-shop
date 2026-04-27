import { Controller } from 'egg';
import { formatResponse, formatError, ErrorCode } from '../utils/response';
import { OrderStatus } from '../model/order';

/**
 * Order management controller
 * Requirements: 3.5, 3.6, 3.7, 5.1, 5.4, 5.5, 5.6, 5.7
 */
export default class OrderController extends Controller {
  /**
   * POST /api/orders
   * Submit a new order (customer)
   * Requirements: 3.5, 3.6, 3.7
   */
  async create() {
    const { ctx } = this;

    // Session authentication required
    const sessionId = ctx.state.sessionId;
    const tableId = ctx.state.tableId;

    const { items, customer_remark } = ctx.request.body as {
      items?: Array<{ dish_id: string; sku_id?: string; quantity: number }>;
      customer_remark?: string;
    };

    // Validation
    if (!items || !Array.isArray(items) || items.length === 0) {
      ctx.status = 400;
      ctx.body = formatError(ErrorCode.VALIDATION_ERROR, '订单项不能为空');
      return;
    }

    // Validate each item
    for (const item of items) {
      if (!item.dish_id || typeof item.dish_id !== 'string') {
        ctx.status = 400;
        ctx.body = formatError(ErrorCode.VALIDATION_ERROR, '菜品ID不能为空');
        return;
      }

      if (
        typeof item.quantity !== 'number' ||
        item.quantity <= 0 ||
        !Number.isInteger(item.quantity)
      ) {
        ctx.status = 400;
        ctx.body = formatError(ErrorCode.VALIDATION_ERROR, '数量必须为正整数');
        return;
      }

      if (item.sku_id !== undefined && item.sku_id !== null && typeof item.sku_id !== 'string') {
        ctx.status = 400;
        ctx.body = formatError(ErrorCode.VALIDATION_ERROR, 'SKU ID 格式不正确');
        return;
      }
    }

    // Get merchant_id from session's table
    const session: any = await ctx.model.Session.findOne({
      where: { id: sessionId },
      include: [
        {
          model: ctx.model.Table,
          as: 'table',
          attributes: ['merchant_id'],
        },
      ],
    });

    if (!session) {
      ctx.status = 401;
      ctx.body = formatError(ErrorCode.SESSION_EXPIRED, 'Session 不存在');
      return;
    }

    // Get merchant_id from table
    const table: any = await ctx.model.Table.findOne({
      where: { id: tableId },
    });

    if (!table) {
      ctx.status = 404;
      ctx.body = formatError(ErrorCode.NOT_FOUND, '桌台不存在');
      return;
    }

    const merchantId = table.merchant_id;

    const result = await ctx.service.order.createOrder(merchantId, {
      table_id: tableId,
      session_id: sessionId,
      items,
      customer_remark,
    });

    if (!result.success) {
      if (result.code === ErrorCode.DISH_UNAVAILABLE) {
        ctx.status = 422;
        ctx.body = formatError(result.code, result.message, {
          unavailableDishes: result.unavailableDishes,
        });
      } else if (result.code === ErrorCode.NOT_FOUND) {
        ctx.status = 404;
        ctx.body = formatError(result.code, result.message);
      } else if (result.code === ErrorCode.TABLE_UNAVAILABLE) {
        ctx.status = 422;
        ctx.body = formatError(result.code, result.message);
      } else if (result.code === ErrorCode.SESSION_EXPIRED) {
        ctx.status = 401;
        ctx.body = formatError(result.code, result.message);
      } else {
        ctx.status = 500;
        ctx.body = formatError(result.code, result.message);
      }
      return;
    }

    ctx.status = 201;
    ctx.body = formatResponse(result.order, '订单创建成功');
  }

  /**
   * GET /api/orders/:id
   * Get order details
   * Requirements: 5.4
   * Supports both JWT auth (merchant) and session auth (customer)
   */
  async show() {
    const { ctx } = this;
    const orderId = ctx.params.id;

    // Check if this is a merchant request (JWT) or customer request (session)
    const isMerchantRequest = !!ctx.state.merchantId && !ctx.state.sessionId;
    const isCustomerRequest = !!ctx.state.sessionId;

    if (!isMerchantRequest && !isCustomerRequest) {
      ctx.status = 401;
      ctx.body = formatError(ErrorCode.UNAUTHORIZED, '未授权');
      return;
    }

    if (isMerchantRequest) {
      // Merchant request - use merchantId
      const merchantId = ctx.state.merchantId;
      const order = await ctx.service.order.getOrderById(merchantId, orderId);

      if (!order) {
        ctx.status = 404;
        ctx.body = formatError(ErrorCode.NOT_FOUND, '订单不存在');
        return;
      }

      ctx.status = 200;
      ctx.body = formatResponse(order);
    } else {
      // Customer request - verify order belongs to session
      const sessionId = ctx.state.sessionId;
      const order: any = await ctx.model.Order.findOne({
        where: {
          id: orderId,
          session_id: sessionId,
        },
      });

      if (!order) {
        ctx.status = 404;
        ctx.body = formatError(ErrorCode.NOT_FOUND, '订单不存在');
        return;
      }

      const completeOrder = await ctx.service.order.getOrderById(order.merchant_id, orderId);

      ctx.status = 200;
      ctx.body = formatResponse(completeOrder);
    }
  }

  /**
   * GET /api/orders
   * Get orders list (merchant only)
   * Requirements: 5.5
   */
  async index() {
    const { ctx } = this;
    const merchantId = ctx.state.merchantId;

    const { status, table_id, start_date, end_date, limit, offset } = ctx.query as {
      status?: string;
      table_id?: string;
      start_date?: string;
      end_date?: string;
      limit?: string;
      offset?: string;
    };

    // Validate status if provided
    const validStatuses: OrderStatus[] = [
      '待支付',
      '已支付',
      '已接单',
      '已完成',
      '已取消',
      '已退款',
    ];
    if (status && !validStatuses.includes(status as OrderStatus)) {
      ctx.status = 400;
      ctx.body = formatError(ErrorCode.VALIDATION_ERROR, '订单状态不合法');
      return;
    }

    // Validate limit and offset
    const parsedLimit = limit ? parseInt(limit, 10) : undefined;
    const parsedOffset = offset ? parseInt(offset, 10) : undefined;

    if (parsedLimit !== undefined && (isNaN(parsedLimit) || parsedLimit <= 0)) {
      ctx.status = 400;
      ctx.body = formatError(ErrorCode.VALIDATION_ERROR, 'limit 必须为正整数');
      return;
    }

    if (parsedOffset !== undefined && (isNaN(parsedOffset) || parsedOffset < 0)) {
      ctx.status = 400;
      ctx.body = formatError(ErrorCode.VALIDATION_ERROR, 'offset 必须为非负整数');
      return;
    }

    const orders = await ctx.service.order.getOrders(merchantId, {
      status: status as OrderStatus | undefined,
      table_id,
      start_date,
      end_date,
      limit: parsedLimit,
      offset: parsedOffset,
    });

    ctx.status = 200;
    ctx.body = formatResponse(orders);
  }

  /**
   * PUT /api/orders/:id/status
   * Update order status (merchant only)
   * Requirements: 5.6, 5.7
   */
  async updateStatus() {
    const { ctx } = this;
    const merchantId = ctx.state.merchantId;
    const orderId = ctx.params.id;

    const { status } = ctx.request.body as { status?: string };

    // Validation
    const validStatuses: OrderStatus[] = [
      '待支付',
      '已支付',
      '已接单',
      '已完成',
      '已取消',
      '已退款',
    ];
    if (!status || !validStatuses.includes(status as OrderStatus)) {
      ctx.status = 400;
      ctx.body = formatError(ErrorCode.VALIDATION_ERROR, '订单状态不合法');
      return;
    }

    const result = await ctx.service.order.updateOrderStatus(
      merchantId,
      orderId,
      status as OrderStatus,
    );

    if (!result.success) {
      if (result.code === ErrorCode.NOT_FOUND) {
        ctx.status = 404;
      } else if (result.code === ErrorCode.INVALID_STATUS_TRANSITION) {
        ctx.status = 422;
      } else {
        ctx.status = 500;
      }
      ctx.body = formatError(result.code, result.message);
      return;
    }

    ctx.status = 200;
    ctx.body = formatResponse(result.order, '订单状态更新成功');
  }

  /**
   * DELETE /api/orders/:id
   * Cancel order (customer only, 待支付 status)
   * Requirements: 5.7
   */
  async destroy() {
    const { ctx } = this;
    const sessionId = ctx.state.sessionId;
    const orderId = ctx.params.id;

    const result = await ctx.service.order.cancelOrder(sessionId, orderId);

    if (!result.success) {
      if (result.code === ErrorCode.NOT_FOUND) {
        ctx.status = 404;
      } else if (result.code === ErrorCode.INVALID_STATUS_TRANSITION) {
        ctx.status = 422;
      } else {
        ctx.status = 500;
      }
      ctx.body = formatError(result.code, result.message);
      return;
    }

    ctx.status = 200;
    ctx.body = formatResponse(result.order, '订单已取消');
  }

  /**
   * POST /api/orders/:id/refund
   * Refund order (merchant only)
   * Requirements: 7.4, 7.5, 7.6
   */
  async refund() {
    const { ctx } = this;
    const merchantId = ctx.state.merchantId;
    const orderId = ctx.params.id;

    const { refund_amount } = ctx.request.body as {
      refund_amount?: number;
    };

    // Validation
    if (
      typeof refund_amount !== 'number' ||
      refund_amount <= 0 ||
      !Number.isInteger(refund_amount)
    ) {
      ctx.status = 400;
      ctx.body = formatError(ErrorCode.VALIDATION_ERROR, '退款金额必须为正整数（单位：分）');
      return;
    }

    const result = await ctx.service.payment.refundOrder(merchantId, orderId, refund_amount);

    if (!result.success) {
      if (result.code === ErrorCode.NOT_FOUND) {
        ctx.status = 404;
      } else if (result.code === ErrorCode.REFUND_AMOUNT_EXCEEDED) {
        ctx.status = 422;
      } else if (
        result.code === ErrorCode.INVALID_STATUS_TRANSITION ||
        result.code === ErrorCode.VALIDATION_ERROR
      ) {
        ctx.status = 422;
      } else if (result.code === ErrorCode.WECHAT_PAY_FAILED) {
        ctx.status = 502;
      } else {
        ctx.status = 500;
      }
      ctx.body = formatError(result.code, result.message);
      return;
    }

    ctx.status = 200;
    ctx.body = formatResponse(
      {
        refundId: result.refund_id,
      },
      '退款成功',
    );
  }
}
