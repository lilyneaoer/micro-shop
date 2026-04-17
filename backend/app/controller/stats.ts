import { Controller } from 'egg';
import { formatResponse, formatError, ErrorCode } from '../utils/response';

/**
 * Stats controller
 * Requirements: 8.1, 8.2, 8.3, 8.5, 8.6
 */
export default class StatsController extends Controller {
  /**
   * GET /api/stats/dashboard
   * Get dashboard data: today's revenue, order count, avg order value, this month's revenue
   * Requirement 8.1
   */
  async dashboard() {
    const { ctx } = this;
    const merchantId = ctx.state.merchantId;

    const data = await ctx.service.stats.getDashboard(merchantId);

    ctx.status = 200;
    ctx.body = formatResponse(data);
  }

  /**
   * GET /api/stats/revenue
   * Get daily revenue trend for a date range (max 90 days)
   * Query params: start_date (YYYY-MM-DD), end_date (YYYY-MM-DD)
   * Requirement 8.2, 8.6
   */
  async revenue() {
    const { ctx } = this;
    const merchantId = ctx.state.merchantId;

    const { start_date, end_date } = ctx.query as {
      start_date?: string;
      end_date?: string;
    };

    // Validate required params
    if (!start_date || !end_date) {
      ctx.status = 400;
      ctx.body = formatError(ErrorCode.VALIDATION_ERROR, 'start_date 和 end_date 为必填参数');
      return;
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(start_date) || !dateRegex.test(end_date)) {
      ctx.status = 400;
      ctx.body = formatError(ErrorCode.VALIDATION_ERROR, '日期格式必须为 YYYY-MM-DD');
      return;
    }

    const start = new Date(start_date);
    const end = new Date(end_date);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      ctx.status = 400;
      ctx.body = formatError(ErrorCode.VALIDATION_ERROR, '日期格式不合法');
      return;
    }

    if (start > end) {
      ctx.status = 400;
      ctx.body = formatError(ErrorCode.VALIDATION_ERROR, 'start_date 不能晚于 end_date');
      return;
    }

    // Check max 90 days range
    const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    if (diffDays > 90) {
      ctx.status = 400;
      ctx.body = formatError(ErrorCode.VALIDATION_ERROR, '查询范围不能超过 90 天');
      return;
    }

    const data = await ctx.service.stats.getRevenueTrend(merchantId, start_date, end_date);

    ctx.status = 200;
    ctx.body = formatResponse(data);
  }

  /**
   * GET /api/stats/dishes
   * Get top 10 dishes by sales volume in a date range
   * Query params: start_date (YYYY-MM-DD), end_date (YYYY-MM-DD)
   * Requirement 8.3
   */
  async dishes() {
    const { ctx } = this;
    const merchantId = ctx.state.merchantId;

    const { start_date, end_date } = ctx.query as {
      start_date?: string;
      end_date?: string;
    };

    // Validate required params
    if (!start_date || !end_date) {
      ctx.status = 400;
      ctx.body = formatError(ErrorCode.VALIDATION_ERROR, 'start_date 和 end_date 为必填参数');
      return;
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(start_date) || !dateRegex.test(end_date)) {
      ctx.status = 400;
      ctx.body = formatError(ErrorCode.VALIDATION_ERROR, '日期格式必须为 YYYY-MM-DD');
      return;
    }

    const start = new Date(start_date);
    const end = new Date(end_date);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      ctx.status = 400;
      ctx.body = formatError(ErrorCode.VALIDATION_ERROR, '日期格式不合法');
      return;
    }

    if (start > end) {
      ctx.status = 400;
      ctx.body = formatError(ErrorCode.VALIDATION_ERROR, 'start_date 不能晚于 end_date');
      return;
    }

    const data = await ctx.service.stats.getDishRanking(merchantId, start_date, end_date);

    ctx.status = 200;
    ctx.body = formatResponse(data);
  }
}
