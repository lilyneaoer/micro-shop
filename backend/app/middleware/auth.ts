import { Context, Application } from 'egg';
import * as jwt from 'jsonwebtoken';
import { formatError, ErrorCode } from '../utils/response';

/**
 * JWT authentication middleware
 * Requirements 9.4, 9.5: Accept requests with valid JWT Token; return HTTP 401 for invalid/expired tokens
 */
export default (_options: unknown, app: Application) => {
  return async (ctx: Context, next: () => Promise<void>) => {
    const authHeader = ctx.request.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      ctx.status = 401;
      ctx.body = formatError(ErrorCode.UNAUTHORIZED, 'Token 无效或已过期');
      return;
    }

    const token = authHeader.slice(7); // Remove "Bearer " prefix

    try {
      const { secret } = app.config.jwt;
      const decoded = jwt.verify(token, secret) as { merchantId: string; username: string };
      // Attach merchant info to context state for downstream handlers
      ctx.state.merchantId = decoded.merchantId;
      ctx.state.username = decoded.username;
    } catch {
      ctx.status = 401;
      ctx.body = formatError(ErrorCode.UNAUTHORIZED, 'Token 无效或已过期');
      return;
    }

    await next();
  };
};
