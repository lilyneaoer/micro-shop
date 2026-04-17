import { Context, Application } from 'egg';

/**
 * Request logging middleware
 * Requirement 11.5: Log all API request method, path, response status code, and response time
 */
export default (_options: unknown, app: Application) => {
  return async (ctx: Context, next: () => Promise<void>) => {
    // Skip logging for Socket.IO requests
    if (ctx.path.startsWith('/socket.io')) {
      return await next();
    }

    const startTime = Date.now();
    const { method, path } = ctx.request;

    try {
      await next();
    } finally {
      const duration = Date.now() - startTime;
      const status = ctx.status;

      // Log format: [METHOD] /path - STATUS (Xms)
      const logMessage = `[${method}] ${path} - ${status} (${duration}ms)`;

      if (status >= 500) {
        app.logger.error(logMessage);
      } else if (status >= 400) {
        app.logger.warn(logMessage);
      } else {
        app.logger.info(logMessage);
      }
    }
  };
};
