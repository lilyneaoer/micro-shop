import { Context, Application } from 'egg';
import { formatError, ErrorCode } from '../utils/response';

interface RateLimitOptions {
  max?: number;
  windowMs?: number;
}

/**
 * Rate limiting middleware using Redis
 * Requirement 11.4: Same IP must not exceed 60 requests per minute
 */
export default (options: RateLimitOptions, app: Application) => {
  const max = options.max ?? app.config.rateLimit?.max ?? 60;
  const windowMs = options.windowMs ?? app.config.rateLimit?.windowMs ?? 60 * 1000;
  const windowSeconds = Math.ceil(windowMs / 1000);

  return async (ctx: Context, next: () => Promise<void>) => {
    // Skip rate limiting for Socket.IO requests
    if (ctx.path.startsWith('/socket.io')) {
      return await next();
    }

    // Get client IP address
    const ip =
      ctx.request.ip ||
      (ctx.request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      (ctx.socket as any).remoteAddress ||
      'unknown';

    const redisKey = `rate_limit:${ip}`;

    try {
      const redis = app.redis;

      // Increment request count for this IP
      const count = await redis.incr(redisKey);

      // Set expiry on first request in window
      if (count === 1) {
        await redis.expire(redisKey, windowSeconds);
      }

      // Set rate limit headers
      ctx.set('X-RateLimit-Limit', String(max));
      ctx.set('X-RateLimit-Remaining', String(Math.max(0, max - count)));

      if (count > max) {
        ctx.status = 429;
        ctx.body = formatError(ErrorCode.RATE_LIMIT_EXCEEDED, '请求过于频繁，请稍后再试');
        return;
      }
    } catch (err) {
      // If Redis is unavailable, log the error but allow the request through
      app.logger.error('Rate limit Redis error:', err);
    }

    await next();
  };
};
