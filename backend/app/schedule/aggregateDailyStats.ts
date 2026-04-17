import { Subscription } from 'egg';
import { QueryTypes } from 'sequelize';

/**
 * Scheduled task to aggregate previous day's stats into daily_stats table
 * Requirement 8.6: Pre-compute daily stats for queries older than 7 days
 * Runs every day at midnight (00:05 to ensure all orders from the previous day are settled)
 */
export default class AggregateDailyStats extends Subscription {
  /**
   * Schedule configuration
   * Runs at 00:05 every day
   */
  static get schedule() {
    return {
      cron: '0 5 0 * * *', // Every day at 00:05:00
      type: 'worker', // Run on one worker only
      immediate: false, // Don't run immediately on startup
    };
  }

  /**
   * Execute the scheduled task
   * Aggregates stats for the previous day for all merchants
   */
  async subscribe() {
    const { ctx } = this;

    try {
      // Calculate yesterday's date
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const dateStr = this.formatDate(yesterday);

      ctx.logger.info(`[AggregateDailyStats] Starting aggregation for date: ${dateStr}`);

      // Get all distinct merchant IDs that have orders
      const merchantRows: Array<{ merchant_id: string }> = await ctx.model.query(
        `SELECT DISTINCT merchant_id FROM orders WHERE DATE(paid_at AT TIME ZONE 'UTC') = :date`,
        {
          replacements: { date: dateStr },
          type: QueryTypes.SELECT,
        },
      );

      if (merchantRows.length === 0) {
        ctx.logger.info(`[AggregateDailyStats] No orders found for date: ${dateStr}`);
        return;
      }

      ctx.logger.info(
        `[AggregateDailyStats] Aggregating stats for ${merchantRows.length} merchants`,
      );

      // Aggregate stats for each merchant
      for (const row of merchantRows) {
        try {
          await ctx.service.stats.aggregateDailyStats(row.merchant_id, dateStr);
          ctx.logger.info(
            `[AggregateDailyStats] Aggregated stats for merchant ${row.merchant_id} on ${dateStr}`,
          );
        } catch (err) {
          ctx.logger.error(
            `[AggregateDailyStats] Failed to aggregate stats for merchant ${row.merchant_id}:`,
            err,
          );
        }
      }

      ctx.logger.info(`[AggregateDailyStats] Completed aggregation for date: ${dateStr}`);
    } catch (error) {
      ctx.logger.error('[AggregateDailyStats] Error during daily stats aggregation:', error);
    }
  }

  /**
   * Format a Date object to 'YYYY-MM-DD' string
   */
  private formatDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}
