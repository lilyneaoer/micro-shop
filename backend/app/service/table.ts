import { Service } from 'egg';
import { v4 as uuidv4 } from 'uuid';
import { ErrorCode } from '../utils/response';
import { modelToCamelCase } from '../utils/caseConverter';

export interface CreateTableParams {
  table_no: string;
  seat_count: number;
  area?: string | null;
}

export interface UpdateTableParams {
  table_no?: string;
  seat_count?: number;
  area?: string | null;
  is_active?: boolean;
}

export interface TableData {
  id: string;
  merchant_id: string;
  table_no: string;
  seat_count: number;
  area: string | null;
  qr_token: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export default class TableService extends Service {
  /**
   * Get all tables for the authenticated merchant.
   * Requirement 1.1
   */
  async listTables(merchantId: string): Promise<TableData[]> {
    const tables = await this.app.model.Table.findAll({
      where: { merchant_id: merchantId },
      order: [['created_at', 'ASC']],
    });
    return modelToCamelCase(tables.map((t) => this.toTableData(t)));
  }

  /**
   * Get a single table by ID, scoped to the merchant.
   */
  async getTable(
    id: string,
    merchantId: string,
  ): Promise<
    { success: true; data: TableData } | { success: false; code: number; message: string }
  > {
    const table = await this.app.model.Table.findOne({
      where: { id, merchant_id: merchantId },
    });
    if (!table) {
      return { success: false, code: ErrorCode.NOT_FOUND, message: '桌台不存在' };
    }
    return { success: true, data: modelToCamelCase(this.toTableData(table)) };
  }

  /**
   * Create a new table with a globally unique qr_token (UUID v4).
   * Requirements 1.1, 1.2, 1.6
   */
  async createTable(
    merchantId: string,
    params: CreateTableParams,
  ): Promise<
    { success: true; data: TableData } | { success: false; code: number; message: string }
  > {
    const { table_no, seat_count, area = null } = params;
    const qr_token = uuidv4(); // Globally unique by design (Requirement 1.2, 1.6)

    try {
      const table = await this.app.model.Table.create({
        id: uuidv4(),
        merchant_id: merchantId,
        table_no,
        seat_count,
        area: area ?? null,
        qr_token,
        is_active: true,
      });
      return { success: true, data: modelToCamelCase(this.toTableData(table)) };
    } catch (err: unknown) {
      this.logger.error('[TableService] createTable error:', err);
      const error = err as { name?: string };
      if (error.name === 'SequelizeUniqueConstraintError') {
        return {
          success: false,
          code: ErrorCode.INTERNAL_SERVER_ERROR,
          message: '二维码标识符冲突，请重试',
        };
      }
      return { success: false, code: ErrorCode.INTERNAL_SERVER_ERROR, message: '服务器内部错误' };
    }
  }

  /**
   * Update an existing table. Regenerates qr_token on update.
   * Requirements 1.1, 1.2
   */
  async updateTable(
    id: string,
    merchantId: string,
    params: UpdateTableParams,
  ): Promise<
    { success: true; data: TableData } | { success: false; code: number; message: string }
  > {
    const table = await this.app.model.Table.findOne({
      where: { id, merchant_id: merchantId },
    });
    if (!table) {
      return { success: false, code: ErrorCode.NOT_FOUND, message: '桌台不存在' };
    }

    const updateData: Record<string, unknown> = { ...params, qr_token: uuidv4() };

    try {
      await table.update(updateData);
      return { success: true, data: modelToCamelCase(this.toTableData(table)) };
    } catch (err: unknown) {
      this.logger.error('[TableService] updateTable error:', err);
      return { success: false, code: ErrorCode.INTERNAL_SERVER_ERROR, message: '服务器内部错误' };
    }
  }

  /**
   * Delete a table by ID, scoped to the merchant.
   * Requirement 1.1
   */
  async deleteTable(
    id: string,
    merchantId: string,
  ): Promise<{ success: true } | { success: false; code: number; message: string }> {
    const table = await this.app.model.Table.findOne({
      where: { id, merchant_id: merchantId },
    });
    if (!table) {
      return { success: false, code: ErrorCode.NOT_FOUND, message: '桌台不存在' };
    }
    try {
      await table.destroy();
      return { success: true };
    } catch (err) {
      this.logger.error('[TableService] deleteTable error:', err);
      return { success: false, code: ErrorCode.INTERNAL_SERVER_ERROR, message: '服务器内部错误' };
    }
  }

  /**
   * Get the qr_token for a table (frontend renders it as PNG using qrcode library).
   * Requirement 1.2
   */
  async getQrCode(
    id: string,
    merchantId: string,
  ): Promise<
    | { success: true; data: { qr_token: string; qr_url: string } }
    | { success: false; code: number; message: string }
  > {
    const table = await this.app.model.Table.findOne({
      where: { id, merchant_id: merchantId },
    });
    if (!table) {
      return { success: false, code: ErrorCode.NOT_FOUND, message: '桌台不存在' };
    }
    const qr_token = table.get('qr_token') as string;
    const qr_url = `https://example.com/scan?token=${qr_token}`;
    return { success: true, data: modelToCamelCase({ qr_token, qr_url }) };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private toTableData(table: any): TableData {
    return {
      id: table.get('id') as string,
      merchant_id: table.get('merchant_id') as string,
      table_no: table.get('table_no') as string,
      seat_count: table.get('seat_count') as number,
      area: table.get('area') as string | null,
      qr_token: table.get('qr_token') as string,
      is_active: table.get('is_active') as boolean,
      created_at: table.get('created_at') as Date,
      updated_at: table.get('updated_at') as Date,
    };
  }
}
