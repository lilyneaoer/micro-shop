import { Service } from 'egg';
import { Op, QueryTypes } from 'sequelize';
import { modelToCamelCase } from '../utils/caseConverter';

export interface DashboardData {
  today_revenue: number;
  today_order_count: number;
  today_avg_order_value: number;
  month_revenue: number;
}

export interface RevenueTrendItem {
  date: string;
  revenue: number;
  order_count: number;
}

export interface DishRankingItem {
  dish_id: string;
  dish_name: string;
  quantity: number;
  revenue: number;
}

/**
 * Stats service
 * Requirements: 8.1, 8.2, 8.3, 8.5, 8.6
 */
export default class StatsService extends Service {
  /**
   * Get dashboard data: today's revenue, order count, avg order value, this month's revenue
   * Requirement 8.1
   */
  async getDashboard(merchantId: string): Promise<DashboardData> {
    const now = new Date();

    // Today's date range (local midnight to now)
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    // This month's date range
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);

    // Query today's completed/paid orders (已支付, 已接单, 已完成, 已退款 are all "paid")
    const paidStatuses = ['已支付', '已接单', '已完成', '已退款'];

    const todayOrders: any[] = await this.app.model.Order.findAll({
      where: {
        merchant_id: merchantId,
        status: {
          [Op.in]: paidStatuses,
        },
        paid_at: {
          [Op.between]: [todayStart, todayEnd],
        },
      },
      attributes: ['total_amount'],
    });

    const today_order_count = todayOrders.length;
    const today_revenue = todayOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
    const today_avg_order_value =
      today_order_count > 0 ? Math.round(today_revenue / today_order_count) : 0;

    // Query this month's revenue
    const monthOrders: any[] = await this.app.model.Order.findAll({
      where: {
        merchant_id: merchantId,
        status: {
          [Op.in]: paidStatuses,
        },
        paid_at: {
          [Op.gte]: monthStart,
        },
      },
      attributes: ['total_amount'],
    });

    const month_revenue = monthOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);

    return modelToCamelCase({
      today_revenue,
      today_order_count,
      today_avg_order_value,
      month_revenue,
    });
  }

  /**
   * Get revenue trend for a date range (max 90 days)
   * Requirement 8.2, 8.6:
   * - For dates within the last 7 days: real-time aggregation from orders
   * - For dates older than 7 days: read from daily_stats pre-computed cache
   */
  async getRevenueTrend(
    merchantId: string,
    startDate: string,
    endDate: string,
  ): Promise<RevenueTrendItem[]> {
    // Parse dates
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Clamp to max 90 days
    const maxDays = 90;
    const diffMs = end.getTime() - start.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24)) + 1;
    if (diffDays > maxDays) {
      // Truncate end date to start + 90 days
      end.setTime(start.getTime() + (maxDays - 1) * 24 * 60 * 60 * 1000);
    }

    // Determine the cutoff: dates older than 7 days use daily_stats cache
    const now = new Date();
    const sevenDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7, 0, 0, 0, 0);

    // Build a map of date -> { revenue, order_count }
    const resultMap = new Map<string, { revenue: number; order_count: number }>();

    // Initialize all dates in range with zeros
    const current = new Date(start);
    while (current <= end) {
      const dateStr = this.formatDate(current);
      resultMap.set(dateStr, { revenue: 0, order_count: 0 });
      current.setDate(current.getDate() + 1);
    }

    // Determine which dates need cache vs real-time
    const cacheStart = start < sevenDaysAgo ? start : null;
    const cacheEnd = end < sevenDaysAgo ? end : new Date(sevenDaysAgo.getTime() - 1);
    const realtimeStart = start >= sevenDaysAgo ? start : sevenDaysAgo;
    const realtimeEnd = end;

    // Fetch from daily_stats cache for dates older than 7 days (Requirement 8.6)
    if (cacheStart && cacheStart < sevenDaysAgo) {
      const cacheEndStr = this.formatDate(cacheEnd);
      const cacheStartStr = this.formatDate(cacheStart);

      const cachedStats: any[] = await this.app.model.DailyStats.findAll({
        where: {
          merchant_id: merchantId,
          stat_date: {
            [Op.between]: [cacheStartStr, cacheEndStr],
          },
        },
        attributes: ['stat_date', 'total_revenue', 'order_count'],
      });

      for (const stat of cachedStats) {
        const dateStr = typeof stat.stat_date === 'string'
          ? stat.stat_date
          : this.formatDate(new Date(stat.stat_date));
        resultMap.set(dateStr, {
          revenue: stat.total_revenue || 0,
          order_count: stat.order_count || 0,
        });
      }
    }

    // Fetch real-time aggregation for recent dates (within 7 days)
    if (realtimeStart <= realtimeEnd) {
      const realtimeStartFull = new Date(
        realtimeStart.getFullYear(),
        realtimeStart.getMonth(),
        realtimeStart.getDate(),
        0, 0, 0, 0,
      );
      const realtimeEndFull = new Date(
        realtimeEnd.getFullYear(),
        realtimeEnd.getMonth(),
        realtimeEnd.getDate(),
        23, 59, 59, 999,
      );

      const paidStatuses = ['已支付', '已接单', '已完成', '已退款'];

      // Use raw SQL for date-based aggregation
      const realtimeRows: Array<{ date: string; revenue: string; order_count: string }> =
        await this.app.model.query(
          `SELECT
            DATE(paid_at AT TIME ZONE 'UTC') AS date,
            SUM(total_amount) AS revenue,
            COUNT(*) AS order_count
          FROM orders
          WHERE merchant_id = :merchantId
            AND status IN (:statuses)
            AND paid_at >= :startDate
            AND paid_at <= :endDate
          GROUP BY DATE(paid_at AT TIME ZONE 'UTC')
          ORDER BY date ASC`,
          {
            replacements: {
              merchantId,
              statuses: paidStatuses,
              startDate: realtimeStartFull,
              endDate: realtimeEndFull,
            },
            type: QueryTypes.SELECT,
          },
        );

      for (const row of realtimeRows) {
        const dateStr = row.date;
        if (resultMap.has(dateStr)) {
          resultMap.set(dateStr, {
            revenue: parseInt(row.revenue, 10) || 0,
            order_count: parseInt(row.order_count, 10) || 0,
          });
        }
      }
    }

    // Convert map to sorted array
    const result: RevenueTrendItem[] = [];
    const iter = new Date(start);
    while (iter <= end) {
      const dateStr = this.formatDate(iter);
      const entry = resultMap.get(dateStr) || { revenue: 0, order_count: 0 };
      result.push({
        date: dateStr,
        revenue: entry.revenue,
        order_count: entry.order_count,
      });
      iter.setDate(iter.getDate() + 1);
    }

    return modelToCamelCase(result);
  }

  /**
   * Get top 10 dishes by sales volume in a date range
   * Requirement 8.3
   */
  async getDishRanking(
    merchantId: string,
    startDate: string,
    endDate: string,
  ): Promise<DishRankingItem[]> {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const startFull = new Date(start.getFullYear(), start.getMonth(), start.getDate(), 0, 0, 0, 0);
    const endFull = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999);

    const paidStatuses = ['已支付', '已接单', '已完成', '已退款'];

    // Aggregate dish sales from order_items joined with orders
    const rows: Array<{
      dish_id: string;
      dish_name: string;
      quantity: string;
      revenue: string;
    }> = await this.app.model.query(
      `SELECT
        oi.dish_id,
        oi.dish_name,
        SUM(oi.quantity) AS quantity,
        SUM(oi.subtotal) AS revenue
      FROM order_items oi
      INNER JOIN orders o ON oi.order_id = o.id
      WHERE o.merchant_id = :merchantId
        AND o.status IN (:statuses)
        AND o.paid_at >= :startDate
        AND o.paid_at <= :endDate
      GROUP BY oi.dish_id, oi.dish_name
      ORDER BY quantity DESC
      LIMIT 10`,
      {
        replacements: {
          merchantId,
          statuses: paidStatuses,
          startDate: startFull,
          endDate: endFull,
        },
        type: QueryTypes.SELECT,
      },
    );

    const result = rows.map((row) => ({
      dish_id: row.dish_id,
      dish_name: row.dish_name,
      quantity: parseInt(row.quantity, 10) || 0,
      revenue: parseInt(row.revenue, 10) || 0,
    }));

    return modelToCamelCase(result);
  }

  /**
   * Aggregate previous day's stats and upsert into daily_stats
   * Called by the scheduled task
   * Requirement 8.6
   */
  async aggregateDailyStats(merchantId: string, date: string): Promise<void> {
    const targetDate = new Date(date);
    const startFull = new Date(
      targetDate.getFullYear(),
      targetDate.getMonth(),
      targetDate.getDate(),
      0, 0, 0, 0,
    );
    const endFull = new Date(
      targetDate.getFullYear(),
      targetDate.getMonth(),
      targetDate.getDate(),
      23, 59, 59, 999,
    );

    const paidStatuses = ['已支付', '已接单', '已完成', '已退款'];

    // Aggregate revenue and order count
    const orders: any[] = await this.app.model.Order.findAll({
      where: {
        merchant_id: merchantId,
        status: {
          [Op.in]: paidStatuses,
        },
        paid_at: {
          [Op.between]: [startFull, endFull],
        },
      },
      attributes: ['id', 'total_amount'],
    });

    const total_revenue = orders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
    const order_count = orders.length;

    // Aggregate top dishes
    const orderIds = orders.map((o) => o.id);
    let top_dishes = null;

    if (orderIds.length > 0) {
      const dishRows: Array<{
        dish_id: string;
        dish_name: string;
        quantity: string;
        revenue: string;
      }> = await this.app.model.query(
        `SELECT
          oi.dish_id,
          oi.dish_name,
          SUM(oi.quantity) AS quantity,
          SUM(oi.subtotal) AS revenue
        FROM order_items oi
        WHERE oi.order_id IN (:orderIds)
        GROUP BY oi.dish_id, oi.dish_name
        ORDER BY quantity DESC
        LIMIT 10`,
        {
          replacements: { orderIds },
          type: QueryTypes.SELECT,
        },
      );

      top_dishes = dishRows.map((row) => ({
        dish_id: row.dish_id,
        dish_name: row.dish_name,
        quantity: parseInt(row.quantity, 10) || 0,
        revenue: parseInt(row.revenue, 10) || 0,
      }));
    }

    // Upsert into daily_stats
    const existing: any = await this.app.model.DailyStats.findOne({
      where: {
        merchant_id: merchantId,
        stat_date: date,
      },
    });

    if (existing) {
      existing.total_revenue = total_revenue;
      existing.order_count = order_count;
      existing.top_dishes = top_dishes;
      await existing.save();
    } else {
      await this.app.model.DailyStats.create({
        merchant_id: merchantId,
        stat_date: date,
        total_revenue,
        order_count,
        top_dishes,
      } as any);
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
