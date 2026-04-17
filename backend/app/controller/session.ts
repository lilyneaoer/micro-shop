import { Controller } from 'egg';
import { formatResponse, formatError, ErrorCode } from '../utils/response';

/**
 * Customer session controller
 * Requirements: 10.1, 10.2, 10.3, 10.5, 10.6
 */
export default class SessionController extends Controller {
  /**
   * POST /api/sessions
   * Create or renew a customer session.
   *
   * Request body:
   *   - openId: string  (WeChat OpenID obtained via wx.login)
   *   - qrToken: string (table QR token from scanned QR code)
   *
   * Requirements: 10.1, 10.2, 10.6
   */
  async create() {
    const { ctx } = this;
    const { openId, qrToken } = ctx.request.body as {
      openId?: string;
      qrToken?: string;
    };

    // Parameter validation (Requirement 11.2)
    if (!openId || typeof openId !== 'string' || openId.trim() === '') {
      ctx.status = 400;
      ctx.body = formatError(ErrorCode.VALIDATION_ERROR, 'openId 不能为空');
      return;
    }

    if (!qrToken || typeof qrToken !== 'string' || qrToken.trim() === '') {
      ctx.status = 400;
      ctx.body = formatError(ErrorCode.VALIDATION_ERROR, 'qrToken 不能为空');
      return;
    }

    const result = await ctx.service.session.createOrRenewSession(openId.trim(), qrToken.trim());

    if (!result.success) {
      if (result.code === ErrorCode.TABLE_UNAVAILABLE) {
        ctx.status = 422;
      } else {
        ctx.status = 500;
      }
      ctx.body = formatError(result.code, result.message);
      return;
    }

    ctx.status = 200;
    ctx.body = formatResponse(
      {
        sessionToken: result.data.sessionToken,
        sessionId: result.data.sessionId,
        tableId: result.data.tableId,
        expiresAt: result.data.expiresAt,
      },
      '会话创建成功',
    );
  }

  /**
   * GET /api/sessions/current
   * Get current session info. Requires a valid Session Token in Authorization header.
   *
   * Requirements: 10.3, 10.5
   */
  async current() {
    const { ctx } = this;

    // Session token is validated by sessionAuth middleware and attached to ctx.state
    const { sessionId, tableId, openId, expiresAt } = ctx.state as {
      sessionId: string;
      tableId: string;
      openId: string;
      expiresAt: Date;
    };

    ctx.status = 200;
    ctx.body = formatResponse(
      {
        sessionId,
        tableId,
        openId,
        expiresAt,
      },
      'success',
    );
  }
}
