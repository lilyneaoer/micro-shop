import { Subscription } from 'egg';
import { Op } from 'sequelize';

/**
 * Scheduled task to cancel expired unpaid orders
 * Requirement 4.6: Orders unpaid for 15+ minutes should be auto-cancelled
 * Runs every minute
 */
export default class CancelExpiredOrders extends Subscription {
  /**
   * Schedule configuration
   * Runs every minute (cron: '0 * * * * *')
   */
  static get schedule() {
    return {
      cron: '0 * * * * *', // Every minute at 0 seconds
      type: 'worker', // Run on one worker only
      immediate: false, // Don't run immediately on startup
    };
  }

  /**
   * Execute the scheduled task
   */
  async subscribe() {
    const { ctx } = this;

    try {
      // Calculate the cutoff time (15 minutes ago)
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

      // Find all orders that are:
      // 1. In 待支付 status
      // 2. Created more than 15 minutes ago
      const expiredOrders: any[] = await ctx.model.Order.findAll({
        where: {
          status: '待支付',
          created_at: {
            [Op.lt]: fifteenMinutesAgo,
          },
        },
      });

      if (expiredOrders.length === 0) {
        ctx.logger.info('[CancelExpiredOrders] No expired orders found');
        return;
      }

      ctx.logger.info(
        `[CancelExpiredOrders] Found ${expiredOrders.length} expired orders to cancel`,
      );

      // Batch update orders to 已取消 status
      const orderIds = expiredOrders.map((order) => order.id);

      const [updatedCount] = await ctx.model.Order.update(
        {
          status: '已取消',
        },
        {
          where: {
            id: {
              [Op.in]: orderIds,
            },
            status: '待支付', // Double-check status to avoid race conditions
          },
        },
      );

      ctx.logger.info(
        `[CancelExpiredOrders] Successfully cancelled ${updatedCount} expired orders`,
      );

      // Update corresponding payment records to failed status
      await ctx.model.Payment.update(
        {
          status: 'failed',
        },
        {
          where: {
            order_id: {
              [Op.in]: orderIds,
            },
            status: 'pending',
          },
        },
      );

      ctx.logger.info(`[CancelExpiredOrders] Updated payment records for cancelled orders`);
    } catch (error) {
      ctx.logger.error('[CancelExpiredOrders] Error cancelling expired orders:', error);
    }
  }
}
