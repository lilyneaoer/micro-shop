import { Controller } from 'egg';
import { formatResponse, formatError, ErrorCode } from '../utils/response';

/**
 * Payment controller
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.7
 */
export default class PaymentController extends Controller {
  /**
   * POST /api/payments/prepay
   * Create WeChat Pay prepay order
   * Requirements: 4.1, 4.2
   */
  async prepay() {
    const { ctx } = this;

    // Session authentication required
    const sessionId = ctx.state.sessionId;

    const { order_id } = ctx.request.body as {
      order_id?: string;
    };

    // Validation
    if (!order_id || typeof order_id !== 'string') {
      ctx.status = 400;
      ctx.body = formatError(ErrorCode.VALIDATION_ERROR, '订单ID不能为空');
      return;
    }

    // Verify order belongs to current session
    const order: any = await ctx.model.Order.findOne({
      where: {
        id: order_id,
        session_id: sessionId,
      },
    });

    if (!order) {
      ctx.status = 404;
      ctx.body = formatError(ErrorCode.NOT_FOUND, '订单不存在或不属于当前会话');
      return;
    }

    // Get session to retrieve open_id
    const session: any = await ctx.model.Session.findOne({
      where: { id: sessionId },
    });

    if (!session) {
      ctx.status = 401;
      ctx.body = formatError(ErrorCode.SESSION_EXPIRED, 'Session 不存在');
      return;
    }

    const result = await ctx.service.payment.createPrepayOrder({
      order_id,
      amount: order.total_amount,
      description: `订单${order.order_no}`,
      open_id: session.open_id,
    });

    if (!result.success) {
      if (result.code === ErrorCode.NOT_FOUND) {
        ctx.status = 404;
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
        prepayId: result.prepay_id,
        paymentParams: result.payment_params,
      },
      '预支付订单创建成功',
    );
  }

  /**
   * POST /api/payments/notify
   * WeChat Pay callback notification handler
   * Requirements: 4.3, 4.4, 4.7
   */
  async notify() {
    const { ctx } = this;

    // Get signature from headers
    const signature = ctx.get('Wechatpay-Signature') || '';
    const timestamp = ctx.get('Wechatpay-Timestamp') || '';
    const nonce = ctx.get('Wechatpay-Nonce') || '';
    const serial = ctx.get('Wechatpay-Serial') || '';

    // Validate required headers
    if (!signature || !timestamp || !nonce || !serial) {
      ctx.status = 400;
      ctx.body = formatError(ErrorCode.PAYMENT_SIGNATURE_INVALID, '缺少必要的签名头');
      return;
    }

    // Get notification body
    const notification = ctx.request.body;

    if (!notification || typeof notification !== 'object') {
      ctx.status = 400;
      ctx.body = formatError(ErrorCode.VALIDATION_ERROR, '请求体格式不正确');
      return;
    }

    // Process payment notification
    const result = await ctx.service.payment.handlePaymentNotify(notification, signature);

    if (!result.success) {
      if (result.code === ErrorCode.PAYMENT_SIGNATURE_INVALID) {
        ctx.status = 400;
      } else if (result.code === ErrorCode.NOT_FOUND) {
        ctx.status = 404;
      } else {
        ctx.status = 500;
      }
      ctx.body = formatError(result.code, result.message);
      return;
    }

    // WeChat Pay expects a specific response format for successful processing
    ctx.status = 200;
    ctx.body = {
      code: 'SUCCESS',
      message: '成功',
    };
  }
}
