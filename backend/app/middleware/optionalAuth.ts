import { Context, Application } from 'egg';
import * as jwt from 'jsonwebtoken';

/**
 * Optional authentication middleware
 * Tries to authenticate with JWT or Session Token, but doesn't reject if neither is present
 * Sets ctx.state.merchantId and/or ctx.state.sessionId if authentication succeeds
 */
export default (_options: unknown, app: Application) => {
  return async (ctx: Context, next: () => Promise<void>) => {
    // Try JWT authentication first
    const authHeader = ctx.request.headers.authorization as string | undefined;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const { secret } = app.config.jwt;
        const decoded = jwt.verify(token, secret) as { merchantId: string; username: string };
        ctx.state.merchantId = decoded.merchantId;
        ctx.state.username = decoded.username;
        await next();
        return;
      } catch (error) {
        // JWT verification failed, continue to try session auth
      }
    }

    // Try Session Token authentication
    const sessionToken =
      (ctx.request.headers['x-session-token'] as string) ||
      (ctx.query.session_token as string);

    if (sessionToken) {
      try {
        const result = await ctx.service.session.validateSessionToken(sessionToken);
        if (result.valid) {
          ctx.state.sessionId = result.sessionId;
          ctx.state.tableId = result.tableId;
          
          // Get merchantId from table
          const table = await app.model.Table.findOne({
            where: { id: result.tableId },
            attributes: ['merchant_id'],
          });
          
          if (table) {
            ctx.state.merchantId = table.get('merchant_id') as string;
          }
          
          await next();
          return;
        }
      } catch (error) {
        // Session validation failed, continue without auth
      }
    }

    // No valid authentication found, continue without setting state
    await next();
  };
};
