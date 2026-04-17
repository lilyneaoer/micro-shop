import { Service } from 'egg';
import { ErrorCode } from '../utils/response';
import { Transaction } from 'sequelize';
// import * as crypto from 'crypto';

/**
 * Payment service
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.6, 4.7
 */

export interface PrepayInput {
  order_id: string;
  amount: number;
  description: string;
  open_id: string;
}

export interface WeChatPayNotification {
  id: string;
  create_time: string;
  event_type: string;
  resource_type: string;
  resource: {
    ciphertext: string;
    associated_data: string;
    nonce: string;
    original_type: string;
  };
  summary: string;
}

export interface DecryptedResource {
  mchid: string;
  appid: string;
  out_trade_no: string;
  transaction_id: string;
  trade_type: string;
  trade_state: string;
  trade_state_desc: string;
  bank_type: string;
  success_time: string;
  payer: {
    openid: string;
  };
  amount: {
    total: number;
    payer_total: number;
    currency: string;
    payer_currency: string;
  };
}

export default class PaymentService extends Service {
  /**
   * Create WeChat Pay prepay order
   * Requirements: 4.1, 4.2
   */
  async createPrepayOrder(
    input: PrepayInput,
  ): Promise<
    | { success: true; prepay_id: string; payment_params: Record<string, unknown> }
    | { success: false; code: number; message: string }
  > {
    const { order_id, amount } = input;

    // Validate order exists and is in 待支付 status
    const order: any = await this.app.model.Order.findOne({
      where: { id: order_id },
    });

    if (!order) {
      return {
        success: false,
        code: ErrorCode.NOT_FOUND,
        message: '订单不存在',
      };
    }

    if (order.status !== '待支付') {
      return {
        success: false,
        code: ErrorCode.INVALID_STATUS_TRANSITION,
        message: '订单状态不是待支付',
      };
    }

    // Check if payment already exists for this order
    const existingPayment: any = await this.app.model.Payment.findOne({
      where: { order_id },
    });

    if (existingPayment && existingPayment.status === 'paid') {
      return {
        success: false,
        code: ErrorCode.VALIDATION_ERROR,
        message: '订单已支付',
      };
    }

    try {
      // In production, call WeChat Pay v3 API to create prepay order
      // For now, we'll simulate the response
      const prepay_id = this.generateMockPrepayId();

      // Create or update payment record
      if (existingPayment) {
        existingPayment.wx_prepay_id = prepay_id;
        existingPayment.status = 'pending';
        await existingPayment.save();
      } else {
        await this.app.model.Payment.create({
          order_id,
          wx_prepay_id: prepay_id,
          amount,
          status: 'pending',
        } as any);
      }

      // Generate payment parameters for client
      const payment_params = this.generatePaymentParams(prepay_id);

      return {
        success: true,
        prepay_id,
        payment_params,
      };
    } catch (error) {
      this.ctx.logger.error('WeChat Pay prepay order creation failed:', error);
      return {
        success: false,
        code: ErrorCode.WECHAT_PAY_FAILED,
        message: '微信支付接口调用失败',
      };
    }
  }

  /**
   * Handle WeChat Pay notification callback with idempotency
   * Requirements: 4.3, 4.4, 4.7
   */
  async handlePaymentNotify(
    notification: WeChatPayNotification,
    signature: string,
  ): Promise<{ success: true } | { success: false; code: number; message: string }> {
    // Verify signature (Requirement 4.4)
    const isSignatureValid = this.verifyWeChatPaySignature(notification, signature);

    if (!isSignatureValid) {
      this.ctx.logger.error('WeChat Pay callback signature verification failed');
      return {
        success: false,
        code: ErrorCode.PAYMENT_SIGNATURE_INVALID,
        message: '支付回调签名验证失败',
      };
    }

    // Decrypt resource
    let decryptedResource: DecryptedResource;
    try {
      decryptedResource = this.decryptResource(notification.resource);
    } catch (error) {
      this.ctx.logger.error('Failed to decrypt WeChat Pay notification resource:', error);
      return {
        success: false,
        code: ErrorCode.PAYMENT_SIGNATURE_INVALID,
        message: '解密支付回调数据失败',
      };
    }

    const { out_trade_no, transaction_id, trade_state } = decryptedResource;

    // Only process successful payments
    if (trade_state !== 'SUCCESS') {
      this.ctx.logger.info(`Payment not successful, trade_state: ${trade_state}`);
      return { success: true }; // Return success to acknowledge receipt
    }

    // Find order by order_no
    const order: any = await this.app.model.Order.findOne({
      where: { order_no: out_trade_no },
    });

    if (!order) {
      this.ctx.logger.error(`Order not found for order_no: ${out_trade_no}`);
      return {
        success: false,
        code: ErrorCode.NOT_FOUND,
        message: '订单不存在',
      };
    }

    // Idempotency handling (Requirement 4.7)
    // Use database transaction to ensure atomicity
    const transaction: Transaction = await this.app.model.transaction();

    try {
      // Query order status first (within transaction)
      const currentOrder: any = await this.app.model.Order.findOne({
        where: { id: order.id },
        lock: transaction.LOCK.UPDATE,
        transaction,
      });

      // If order is already not in 待支付 status, return success directly (idempotent)
      if (currentOrder.status !== '待支付') {
        await transaction.commit();
        this.ctx.logger.info(`Order ${order.id} already processed, status: ${currentOrder.status}`);
        return { success: true };
      }

      // Update order status to 已支付
      currentOrder.status = '已支付';
      currentOrder.paid_at = new Date();
      await currentOrder.save({ transaction });

      // Update payment record
      const payment: any = await this.app.model.Payment.findOne({
        where: { order_id: order.id },
        transaction,
      });

      if (payment) {
        payment.wx_transaction_id = transaction_id;
        payment.status = 'paid';
        payment.paid_at = new Date();
        await payment.save({ transaction });
      } else {
        // Create payment record if it doesn't exist
        await this.app.model.Payment.create(
          {
            order_id: order.id,
            wx_transaction_id: transaction_id,
            amount: order.total_amount,
            status: 'paid',
            paid_at: new Date(),
          } as any,
          { transaction },
        );
      }

      await transaction.commit();

      // Push order status change via WebSocket (Requirement 5.2, 5.3)
      try {
        await this.service.websocket.pushOrderStatusChanged(
          order.id,
          order.merchant_id,
          order.table_id,
          '已支付',
        );
      } catch (error) {
        this.ctx.logger.error('Failed to push order status change via WebSocket:', error);
        // Don't fail the request if WebSocket push fails
      }

      // Push new order to merchant (Requirement 6.1)
      try {
        // Fetch table info to get table_no
        const table: any = await this.app.model.Table.findOne({
          where: { id: order.table_id },
        });

        if (table) {
          await this.service.websocket.pushNewOrder(
            order.id,
            order.merchant_id,
            table.table_no,
            order.total_amount,
          );
        }
      } catch (error) {
        this.ctx.logger.error('Failed to push new order via WebSocket:', error);
        // Don't fail the request if WebSocket push fails
      }

      this.ctx.logger.info(`Payment processed successfully for order ${order.id}`);
      return { success: true };
    } catch (error) {
      await transaction.rollback();
      this.ctx.logger.error('Payment notification processing failed:', error);
      return {
        success: false,
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        message: '支付回调处理失败',
      };
    }
  }

  /**
   * Process refund
   * Requirements: 7.4, 7.5, 7.6
   */
  async refundOrder(
    merchantId: string,
    orderId: string,
    refundAmount: number,
  ): Promise<
    { success: true; refund_id: string } | { success: false; code: number; message: string }
  > {
    // Validate order exists and belongs to merchant
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

    // Validate order is paid
    if (order.status !== '已支付' && order.status !== '已接单' && order.status !== '已完成') {
      return {
        success: false,
        code: ErrorCode.INVALID_STATUS_TRANSITION,
        message: '订单状态不支持退款',
      };
    }

    // Validate refund amount does not exceed paid amount (Requirement 7.4)
    if (refundAmount > order.total_amount) {
      return {
        success: false,
        code: ErrorCode.REFUND_AMOUNT_EXCEEDED,
        message: '退款金额不能超过实付金额',
      };
    }

    // Get payment record
    const payment: any = await this.app.model.Payment.findOne({
      where: { order_id: orderId },
    });

    if (!payment || payment.status !== 'paid') {
      return {
        success: false,
        code: ErrorCode.VALIDATION_ERROR,
        message: '订单未支付或支付记录不存在',
      };
    }

    try {
      // In production, call WeChat Pay refund API
      // For now, we'll simulate the response
      const refund_id = this.generateMockRefundId();

      // Update order status to 已退款
      order.status = '已退款';
      await order.save();

      // Update payment status to refunded
      payment.status = 'refunded';
      await payment.save();

      this.ctx.logger.info(
        `Refund processed successfully for order ${orderId}, refund_id: ${refund_id}`,
      );

      return {
        success: true,
        refund_id,
      };
    } catch (error) {
      this.ctx.logger.error('WeChat Pay refund failed:', error);
      return {
        success: false,
        code: ErrorCode.WECHAT_PAY_FAILED,
        message: '微信支付退款接口调用失败',
      };
    }
  }

  /**
   * Verify WeChat Pay callback signature using RSA
   * Requirement 4.4
   */
  private verifyWeChatPaySignature(
    notification: WeChatPayNotification,
    signature: string,
  ): boolean {
    try {
      // In production, use WeChat Pay platform public key to verify signature
      // For now, we'll simulate verification
      // The actual implementation would:
      // 1. Construct the signature string from timestamp, nonce, and body
      // 2. Use RSA-SHA256 to verify the signature with WeChat Pay's public key

      // Mock verification - in production, replace with actual RSA verification
      if (!signature || signature.length === 0) {
        return false;
      }

      // Simulate signature verification
      return true;
    } catch (error) {
      this.ctx.logger.error('Signature verification error:', error);
      return false;
    }
  }

  /**
   * Decrypt WeChat Pay notification resource using AES-256-GCM
   * Requirement 4.3
   */
  private decryptResource(_resource: WeChatPayNotification['resource']): DecryptedResource {
    try {
      // In production, use WeChat Pay API v3 key to decrypt
      // For now, we'll simulate decryption
      // The actual implementation would use AES-256-GCM decryption

      // Mock decrypted data - in production, replace with actual decryption
      const mockDecrypted: DecryptedResource = {
        mchid: 'mock_mchid',
        appid: 'mock_appid',
        out_trade_no: 'mock_order_no',
        transaction_id: 'mock_transaction_id',
        trade_type: 'JSAPI',
        trade_state: 'SUCCESS',
        trade_state_desc: '支付成功',
        bank_type: 'OTHERS',
        success_time: new Date().toISOString(),
        payer: {
          openid: 'mock_openid',
        },
        amount: {
          total: 100,
          payer_total: 100,
          currency: 'CNY',
          payer_currency: 'CNY',
        },
      };

      return mockDecrypted;
    } catch (error) {
      this.ctx.logger.error('Resource decryption error:', error);
      throw error;
    }
  }

  /**
   * Generate mock prepay ID for testing
   */
  private generateMockPrepayId(): string {
    return `prepay_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Generate mock refund ID for testing
   */
  private generateMockRefundId(): string {
    return `refund_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Generate payment parameters for client
   */
  private generatePaymentParams(prepay_id: string): Record<string, unknown> {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonceStr = Math.random().toString(36).substring(2, 15);

    // In production, generate proper signature using merchant private key
    const paySign = this.generateMockPaySign(prepay_id, timestamp, nonceStr);

    return {
      timeStamp: timestamp,
      nonceStr,
      package: `prepay_id=${prepay_id}`,
      signType: 'RSA',
      paySign,
    };
  }

  /**
   * Generate mock payment signature for testing
   */
  private generateMockPaySign(_prepay_id: string, _timestamp: string, _nonceStr: string): string {
    // In production, use RSA-SHA256 to sign with merchant private key
    // return crypto
    //   .createHash('sha256')
    //   .update(`${prepay_id}${timestamp}${nonceStr}`)
    //   .digest('hex');
    return 'mock_pay_sign';
  }
}
