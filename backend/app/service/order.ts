import { Service } from 'egg';
import { ErrorCode } from '../utils/response';
import { OrderStatus } from '../model/order';
import { Op, Transaction } from 'sequelize';

export interface OrderItemInput {
  dish_id: string;
  sku_id?: string | null;
  quantity: number;
}

export interface CreateOrderInput {
  table_id: string;
  session_id: string;
  items: OrderItemInput[];
  customer_remark?: string;
}

export interface OrderItemDetail {
  dish_id: string;
  sku_id: string | null;
  dish_name: string;
  sku_name: string | null;
  unit_price: number;
  quantity: number;
  subtotal: number;
}

export default class OrderService extends Service {
  /**
   * Calculate order total amount from order items
   * Requirement 3.5, 3.6: Calculate total amount from cart items
   */
  calculateOrderTotal(items: OrderItemDetail[]): number {
    return items.reduce((total, item) => total + item.subtotal, 0);
  }

  /**
   * Validate order status transition
   * Requirement 5.1, 5.6: Enforce valid status flow
   *
   * Valid transitions:
   * - 待支付 → 已支付
   * - 待支付 → 已取消
   * - 已支付 → 已接单
   * - 已支付 → 已取消
   * - 已接单 → 已完成
   * - 已接单 → 已取消
   * - 已完成 → 已退款
   */
  validateStatusTransition(currentStatus: OrderStatus, newStatus: OrderStatus): boolean {
    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      待支付: ['已支付', '已取消'],
      已支付: ['已接单', '已取消'],
      已接单: ['已完成', '已取消'],
      已完成: ['已退款'],
      已取消: [], // Cannot transition from 已取消
      已退款: [], // Cannot transition from 已退款
    };

    const allowedNextStatuses = validTransitions[currentStatus] || [];
    return allowedNextStatuses.includes(newStatus);
  }

  /**
   * Create a new order with validation and transaction
   * Requirements 3.5, 3.6, 3.7, 5.1
   */
  async createOrder(
    merchantId: string,
    input: CreateOrderInput,
  ): Promise<
    | { success: true; order: any }
    | { success: false; code: number; message: string; unavailableDishes?: string[] }
  > {
    const { table_id, session_id, items, customer_remark } = input;

    // Validate table exists and belongs to merchant
    const table: any = await this.app.model.Table.findOne({
      where: {
        id: table_id,
        merchant_id: merchantId,
      },
    });

    if (!table) {
      return {
        success: false,
        code: ErrorCode.NOT_FOUND,
        message: '桌台不存在',
      };
    }

    if (!table.is_active) {
      return {
        success: false,
        code: ErrorCode.TABLE_UNAVAILABLE,
        message: '该桌台不可用，请联系服务员',
      };
    }

    // Validate session exists and belongs to table
    const session: any = await this.app.model.Session.findOne({
      where: {
        id: session_id,
        table_id,
      },
    });

    if (!session) {
      return {
        success: false,
        code: ErrorCode.NOT_FOUND,
        message: 'Session 不存在',
      };
    }

    // Check if session is expired
    if (new Date(session.expires_at) < new Date()) {
      return {
        success: false,
        code: ErrorCode.SESSION_EXPIRED,
        message: 'Session 已过期，请重新扫码',
      };
    }

    // Validate items array
    if (!items || items.length === 0) {
      return {
        success: false,
        code: ErrorCode.VALIDATION_ERROR,
        message: '订单项不能为空',
      };
    }

    // Extract all dish IDs and SKU IDs
    const dishIds = items.map((item) => item.dish_id);
    const skuIds = items.filter((item) => item.sku_id).map((item) => item.sku_id as string);

    // Fetch all dishes
    const dishes: any[] = await this.app.model.Dish.findAll({
      where: {
        id: {
          [Op.in]: dishIds,
        },
        merchant_id: merchantId,
      },
    });

    // Fetch all SKUs if any
    let skus: any[] = [];
    if (skuIds.length > 0) {
      skus = await this.app.model.Sku.findAll({
        where: {
          id: {
            [Op.in]: skuIds,
          },
        },
      });
    }

    // Validate dish availability (Requirement 3.6, 3.7)
    const unavailableDishes: string[] = [];

    for (const item of items) {
      const dish = dishes.find((d) => d.id === item.dish_id);

      if (!dish) {
        unavailableDishes.push(item.dish_id);
        continue;
      }

      if (!dish.is_available) {
        unavailableDishes.push(dish.name);
        continue;
      }

      // If SKU is specified, validate SKU availability
      if (item.sku_id) {
        const sku = skus.find((s) => s.id === item.sku_id);
        if (!sku || !sku.is_available) {
          unavailableDishes.push(`${dish.name} (${sku?.name || '规格不存在'})`);
        }
      }
    }

    // If any dishes are unavailable, reject order creation (Requirement 3.7)
    if (unavailableDishes.length > 0) {
      return {
        success: false,
        code: ErrorCode.DISH_UNAVAILABLE,
        message: '订单包含已下架的菜品',
        unavailableDishes,
      };
    }

    // Prepare order items with snapshots
    const orderItemsData: OrderItemDetail[] = items.map((item) => {
      const dish = dishes.find((d) => d.id === item.dish_id)!;
      let sku = null;
      let unit_price = dish.price;
      let sku_name = null;

      if (item.sku_id) {
        sku = skus.find((s) => s.id === item.sku_id);
        if (sku) {
          unit_price = dish.price + sku.price_delta;
          sku_name = sku.name;
        }
      }

      const subtotal = unit_price * item.quantity;

      return {
        dish_id: item.dish_id,
        sku_id: item.sku_id || null,
        dish_name: dish.name,
        sku_name,
        unit_price,
        quantity: item.quantity,
        subtotal,
      };
    });

    // Calculate total amount
    const total_amount = this.calculateOrderTotal(orderItemsData);

    // Generate order number (format: timestamp + random)
    const order_no = `${Date.now()}${Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, '0')}`;

    // Create order and order items in a transaction
    const transaction: Transaction = await this.app.model.transaction();

    try {
      // Create order
      const order: any = await this.app.model.Order.create(
        {
          order_no,
          merchant_id: merchantId,
          table_id,
          session_id,
          total_amount,
          status: '待支付',
          customer_remark: customer_remark || null,
          paid_at: null,
        } as any,
        { transaction },
      );

      // Create order items
      const orderItemsToCreate = orderItemsData.map((item) => ({
        order_id: order.id,
        dish_id: item.dish_id,
        sku_id: item.sku_id,
        dish_name: item.dish_name,
        sku_name: item.sku_name,
        unit_price: item.unit_price,
        quantity: item.quantity,
        subtotal: item.subtotal,
      }));

      await this.app.model.OrderItem.bulkCreate(orderItemsToCreate as any[], { transaction });

      await transaction.commit();

      // Fetch the complete order with items
      const completeOrder = await this.getOrderById(merchantId, order.id);

      return {
        success: true,
        order: completeOrder,
      };
    } catch (error) {
      await transaction.rollback();
      this.ctx.logger.error('Order creation failed:', error);
      return {
        success: false,
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        message: '订单创建失败',
      };
    }
  }

  /**
   * Get order by ID with items
   * Requirement 5.4: Get order details
   */
  async getOrderById(merchantId: string, orderId: string) {
    const order: any = await this.app.model.Order.findOne({
      where: {
        id: orderId,
        merchant_id: merchantId,
      },
    });

    if (!order) {
      return null;
    }

    // Fetch order items
    const orderItems: any[] = await this.app.model.OrderItem.findAll({
      where: {
        order_id: orderId,
      },
    });

    // Fetch table info
    const table: any = await this.app.model.Table.findOne({
      where: {
        id: order.table_id,
      },
    });

    return {
      ...order.toJSON(),
      items: orderItems.map((item) => item.toJSON()),
      table: table ? { table_no: table.table_no, area: table.area } : null,
    };
  }

  /**
   * Get orders list with filters
   * Requirement 5.5: Get orders list
   */
  async getOrders(
    merchantId: string,
    filters?: {
      status?: OrderStatus;
      table_id?: string;
      start_date?: string;
      end_date?: string;
      limit?: number;
      offset?: number;
    },
  ) {
    const where: Record<string, unknown> = { merchant_id: merchantId };

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.table_id) {
      where.table_id = filters.table_id;
    }

    if (filters?.start_date || filters?.end_date) {
      where.created_at = {};
      if (filters.start_date) {
        (where.created_at as any)[Op.gte] = new Date(filters.start_date);
      }
      if (filters.end_date) {
        (where.created_at as any)[Op.lte] = new Date(filters.end_date);
      }
    }

    const orders: any[] = await this.app.model.Order.findAll({
      where,
      order: [['created_at', 'DESC']],
      limit: filters?.limit || 50,
      offset: filters?.offset || 0,
    });

    // Fetch table info for each order
    const tableIds = [...new Set(orders.map((order) => order.table_id))];
    const tables: any[] = await this.app.model.Table.findAll({
      where: {
        id: {
          [Op.in]: tableIds,
        },
      },
    });

    const tableMap = new Map(tables.map((table) => [table.id, table]));

    return orders.map((order) => {
      const table = tableMap.get(order.table_id);
      return {
        ...order.toJSON(),
        table: table ? { table_no: table.table_no, area: table.area } : null,
      };
    });
  }

  /**
   * Update order status
   * Requirement 5.6, 5.7: Update order status with validation
   */
  async updateOrderStatus(
    merchantId: string,
    orderId: string,
    newStatus: OrderStatus,
  ): Promise<{ success: true; order: any } | { success: false; code: number; message: string }> {
    const order: any = await this.app.model.Order.findOne({
      where: {
        id: orderId,
        merchant_id: merchantId,
      },
    });

    if (!order) {
      return {
        success: false,
        code: ErrorCode.NOT_FOUND,
        message: '订单不存在',
      };
    }

    const currentStatus = order.status as OrderStatus;

    // Validate status transition (Requirement 5.6)
    if (!this.validateStatusTransition(currentStatus, newStatus)) {
      return {
        success: false,
        code: ErrorCode.INVALID_STATUS_TRANSITION,
        message: `无法从 ${currentStatus} 转换到 ${newStatus}`,
      };
    }

    // Update order status
    order.status = newStatus;

    // If transitioning to 已支付, set paid_at
    if (newStatus === '已支付' && !order.paid_at) {
      order.paid_at = new Date();
    }

    await order.save();

    // Push order status change via WebSocket (Requirement 5.2, 5.3)
    try {
      await this.service.websocket.pushOrderStatusChanged(
        orderId,
        merchantId,
        order.table_id,
        newStatus,
      );
    } catch (error) {
      this.ctx.logger.error('Failed to push order status change via WebSocket:', error);
      // Don't fail the request if WebSocket push fails
    }

    // Fetch complete order with items
    const completeOrder = await this.getOrderById(merchantId, orderId);

    return {
      success: true,
      order: completeOrder,
    };
  }

  /**
   * Cancel order (customer-initiated)
   * Requirement 5.7: Customer can cancel order in 待支付 status
   */
  async cancelOrder(
    sessionId: string,
    orderId: string,
  ): Promise<{ success: true; order: any } | { success: false; code: number; message: string }> {
    const order: any = await this.app.model.Order.findOne({
      where: {
        id: orderId,
        session_id: sessionId,
      },
    });

    if (!order) {
      return {
        success: false,
        code: ErrorCode.NOT_FOUND,
        message: '订单不存在',
      };
    }

    // Only allow cancellation if order is in 待支付 status
    if (order.status !== '待支付') {
      return {
        success: false,
        code: ErrorCode.INVALID_STATUS_TRANSITION,
        message: '只能取消待支付状态的订单',
      };
    }

    order.status = '已取消';
    await order.save();

    // Push order status change via WebSocket (Requirement 5.2, 5.3)
    try {
      await this.service.websocket.pushOrderStatusChanged(
        orderId,
        order.merchant_id,
        order.table_id,
        '已取消',
      );
    } catch (error) {
      this.ctx.logger.error('Failed to push order status change via WebSocket:', error);
      // Don't fail the request if WebSocket push fails
    }

    // Fetch complete order with items
    const completeOrder = await this.getOrderById(order.merchant_id, orderId);

    return {
      success: true,
      order: completeOrder,
    };
  }

  /**
   * Get orders by session (customer view)
   * Requirement 10.4: Customer can view all orders in current session
   */
  async getOrdersBySession(sessionId: string) {
    const orders: any[] = await this.app.model.Order.findAll({
      where: {
        session_id: sessionId,
      },
      order: [['created_at', 'DESC']],
    });

    // Fetch order items for each order
    const orderIds = orders.map((order) => order.id);
    const orderItems: any[] = await this.app.model.OrderItem.findAll({
      where: {
        order_id: {
          [Op.in]: orderIds,
        },
      },
    });

    const orderItemsMap = new Map<string, any[]>();
    orderItems.forEach((item) => {
      if (!orderItemsMap.has(item.order_id)) {
        orderItemsMap.set(item.order_id, []);
      }
      orderItemsMap.get(item.order_id)!.push(item.toJSON());
    });

    return orders.map((order) => ({
      ...order.toJSON(),
      items: orderItemsMap.get(order.id) || [],
    }));
  }
}
