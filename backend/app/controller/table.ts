import { Controller } from 'egg';
import { formatResponse, formatError, ErrorCode } from '../utils/response';

/**
 * Table management controller
 * Requirements: 1.1, 1.2, 1.6
 * All endpoints require JWT authentication (enforced in router.ts).
 */
export default class TableController extends Controller {
  /**
   * GET /api/tables
   * List all tables for the authenticated merchant.
   */
  async index() {
    const { ctx } = this;
    const merchantId = ctx.state.merchantId as string;
    const tables = await ctx.service.table.listTables(merchantId);
    ctx.status = 200;
    ctx.body = formatResponse(tables);
  }

  /**
   * POST /api/tables
   * Create a new table with a unique qr_token.
   */
  async create() {
    const { ctx } = this;
    const merchantId = ctx.state.merchantId as string;
    const { table_no, seat_count, area } = ctx.request.body as {
      table_no?: string;
      seat_count?: number;
      area?: string | null;
    };

    if (!table_no || typeof table_no !== 'string' || table_no.trim() === '') {
      ctx.status = 400;
      ctx.body = formatError(ErrorCode.VALIDATION_ERROR, '桌号不能为空');
      return;
    }
    if (seat_count === undefined || seat_count === null) {
      ctx.status = 400;
      ctx.body = formatError(ErrorCode.VALIDATION_ERROR, '座位数不能为空');
      return;
    }
    const seatCountNum = Number(seat_count);
    if (!Number.isInteger(seatCountNum) || seatCountNum < 1) {
      ctx.status = 400;
      ctx.body = formatError(ErrorCode.VALIDATION_ERROR, '座位数必须为正整数');
      return;
    }

    const result = await ctx.service.table.createTable(merchantId, {
      table_no: table_no.trim(),
      seat_count: seatCountNum,
      area: area ?? null,
    });

    if (!result.success) {
      ctx.status = 500;
      ctx.body = formatError(result.code, result.message);
      return;
    }
    ctx.status = 201;
    ctx.body = formatResponse(result.data, '桌台创建成功');
  }

  /**
   * PUT /api/tables/:id
   * Update an existing table. Regenerates qr_token on update.
   */
  async update() {
    const { ctx } = this;
    const merchantId = ctx.state.merchantId as string;
    const { id } = ctx.params as { id: string };
    const { table_no, seat_count, area, is_active } = ctx.request.body as {
      table_no?: string;
      seat_count?: number;
      area?: string | null;
      is_active?: boolean;
    };

    if (
      table_no === undefined &&
      seat_count === undefined &&
      area === undefined &&
      is_active === undefined
    ) {
      ctx.status = 400;
      ctx.body = formatError(ErrorCode.VALIDATION_ERROR, '至少需要提供一个更新字段');
      return;
    }
    if (seat_count !== undefined) {
      const n = Number(seat_count);
      if (!Number.isInteger(n) || n < 1) {
        ctx.status = 400;
        ctx.body = formatError(ErrorCode.VALIDATION_ERROR, '座位数必须为正整数');
        return;
      }
    }
    if (table_no !== undefined && (typeof table_no !== 'string' || table_no.trim() === '')) {
      ctx.status = 400;
      ctx.body = formatError(ErrorCode.VALIDATION_ERROR, '桌号不能为空字符串');
      return;
    }

    const updateParams: Record<string, unknown> = {};
    if (table_no !== undefined) updateParams.table_no = table_no.trim();
    if (seat_count !== undefined) updateParams.seat_count = Number(seat_count);
    if (area !== undefined) updateParams.area = area;
    if (is_active !== undefined) updateParams.is_active = is_active;

    const result = await ctx.service.table.updateTable(id, merchantId, updateParams);
    if (!result.success) {
      ctx.status = result.code === ErrorCode.NOT_FOUND ? 404 : 500;
      ctx.body = formatError(result.code, result.message);
      return;
    }
    ctx.status = 200;
    ctx.body = formatResponse(result.data, '桌台更新成功');
  }

  /**
   * DELETE /api/tables/:id
   * Delete a table.
   */
  async destroy() {
    const { ctx } = this;
    const merchantId = ctx.state.merchantId as string;
    const { id } = ctx.params as { id: string };
    const result = await ctx.service.table.deleteTable(id, merchantId);
    if (!result.success) {
      ctx.status = result.code === ErrorCode.NOT_FOUND ? 404 : 500;
      ctx.body = formatError(result.code, result.message);
      return;
    }
    ctx.status = 200;
    ctx.body = formatResponse(null, '桌台删除成功');
  }

  /**
   * GET /api/tables/:id/qrcode
   * Get the qr_token for a table so the frontend can render a QR code PNG.
   */
  async qrcode() {
    const { ctx } = this;
    const merchantId = ctx.state.merchantId as string;
    const { id } = ctx.params as { id: string };
    const result = await ctx.service.table.getQrCode(id, merchantId);
    if (!result.success) {
      ctx.status = result.code === ErrorCode.NOT_FOUND ? 404 : 500;
      ctx.body = formatError(result.code, result.message);
      return;
    }
    ctx.status = 200;
    ctx.body = formatResponse(result.data);
  }
}
