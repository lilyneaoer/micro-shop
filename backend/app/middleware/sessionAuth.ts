import { Context, Application } from 'egg';
import { formatError, ErrorCode } from '../utils/response';

/**
 * Session Token authentication middleware for customer-facing APIs.
 *
 * Reads the Session Token from the `Authorization: Bearer <token>` header,
 * validates it against the database, and attaches session info to ctx.state.
 *
 * Returns HTTP 401 with error code 5002 if the token is missing, invalid,
 * or expired.
 *
 * Requirements: 10.5 (expired session → prompt re-scan)
 */
export default (_options: unknown, _app: Application) => {
  return async (ctx: Context, next: () => Promise<void>) => {
    const authHeader = ctx.request.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      ctx.status = 401;
      ctx.body = formatError(ErrorCode.SESSION_EXPIRED, 'Session 已过期，请重新扫码');
      return;
    }

    const sessionToken = authHeader.slice(7); // Remove "Bearer " prefix

    const result = await ctx.service.session.validateSessionToken(sessionToken);

    if (!result.valid) {
      ctx.status = 401;
      ctx.body = formatError(result.code, result.message);
      return;
    }

    // Attach session info to context state for downstream handlers
    ctx.state.sessionId = result.sessionId;
    ctx.state.tableId = result.tableId;
    ctx.state.openId = result.openId;

    // Also fetch expiresAt for the /current endpoint
    const sessionData = await ctx.service.session.getCurrentSession(sessionToken);
    if (sessionData.success) {
      ctx.state.expiresAt = sessionData.data.expiresAt;
    }

    await next();
  };
};
