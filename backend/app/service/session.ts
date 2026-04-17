import { Service } from 'egg';
import { Op } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import { ErrorCode } from '../utils/response';

const SESSION_DURATION_HOURS = 4;

export interface CreateSessionResult {
  sessionToken: string;
  sessionId: string;
  tableId: string;
  expiresAt: Date;
}

export default class SessionService extends Service {
  /**
   * Create or renew a customer session based on OpenID + tableId.
   *
   * Requirements 10.1, 10.2, 10.6:
   * - Creates an anonymous session for the customer
   * - Session is valid for 4 hours
   * - Only one valid session per OpenID + tableId combination at any time
   *   (old valid sessions are invalidated inside a DB transaction)
   */
  async createOrRenewSession(
    openId: string,
    qrToken: string,
  ): Promise<
    { success: true; data: CreateSessionResult } | { success: false; code: number; message: string }
  > {
    // Look up the table by qr_token (parameterized query via Sequelize ORM)
    const table = await this.app.model.Table.findOne({
      where: { qr_token: qrToken },
    });

    if (!table || !table.get('is_active')) {
      return {
        success: false,
        code: ErrorCode.TABLE_UNAVAILABLE,
        message: '该桌台不可用，请联系服务员',
      };
    }

    const tableId = table.get('id') as string;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + SESSION_DURATION_HOURS * 60 * 60 * 1000);
    const sessionToken = uuidv4();

    // Use a DB transaction to:
    // 1. Invalidate all existing valid sessions for this openId + tableId
    // 2. Create the new session
    // Requirement 10.6: only one valid session per openId + tableId at any time
    const transaction = await this.app.model.transaction();

    try {
      // Invalidate old valid sessions for the same openId + tableId combination
      await this.app.model.Session.update(
        { expires_at: now },
        {
          where: {
            open_id: openId,
            table_id: tableId,
            expires_at: { [Op.gt]: now },
          },
          transaction,
        },
      );

      // Create the new session
      const session = await this.app.model.Session.create(
        {
          id: uuidv4(),
          open_id: openId,
          table_id: tableId,
          session_token: sessionToken,
          expires_at: expiresAt,
        },
        { transaction },
      );

      await transaction.commit();

      return {
        success: true,
        data: {
          sessionToken: session.get('session_token') as string,
          sessionId: session.get('id') as string,
          tableId,
          expiresAt: session.get('expires_at') as Date,
        },
      };
    } catch (err) {
      await transaction.rollback();
      this.logger.error('[SessionService] createOrRenewSession error:', err);
      return {
        success: false,
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        message: '服务器内部错误',
      };
    }
  }

  /**
   * Validate a session token and return the session if valid.
   *
   * Requirements 10.5: expired session returns error code 5002
   */
  async validateSessionToken(
    sessionToken: string,
  ): Promise<
    | { valid: true; sessionId: string; tableId: string; openId: string }
    | { valid: false; code: number; message: string }
  > {
    const session = await this.app.model.Session.findOne({
      where: { session_token: sessionToken },
    });

    if (!session) {
      return {
        valid: false,
        code: ErrorCode.SESSION_EXPIRED,
        message: 'Session 已过期，请重新扫码',
      };
    }

    const now = new Date();
    const expiresAt = session.get('expires_at') as Date;

    if (expiresAt <= now) {
      return {
        valid: false,
        code: ErrorCode.SESSION_EXPIRED,
        message: 'Session 已过期，请重新扫码',
      };
    }

    return {
      valid: true,
      sessionId: session.get('id') as string,
      tableId: session.get('table_id') as string,
      openId: session.get('open_id') as string,
    };
  }

  /**
   * Get current session info by session token.
   * Returns session details including table info.
   */
  async getCurrentSession(sessionToken: string): Promise<
    | {
        success: true;
        data: {
          sessionId: string;
          tableId: string;
          openId: string;
          expiresAt: Date;
        };
      }
    | { success: false; code: number; message: string }
  > {
    const session = await this.app.model.Session.findOne({
      where: { session_token: sessionToken },
    });

    if (!session) {
      return {
        success: false,
        code: ErrorCode.SESSION_EXPIRED,
        message: 'Session 已过期，请重新扫码',
      };
    }

    const now = new Date();
    const expiresAt = session.get('expires_at') as Date;

    if (expiresAt <= now) {
      return {
        success: false,
        code: ErrorCode.SESSION_EXPIRED,
        message: 'Session 已过期，请重新扫码',
      };
    }

    return {
      success: true,
      data: {
        sessionId: session.get('id') as string,
        tableId: session.get('table_id') as string,
        openId: session.get('open_id') as string,
        expiresAt,
      },
    };
  }
}
