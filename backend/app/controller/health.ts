import { Controller } from 'egg';
import { formatResponse, formatError, ErrorCode } from '../utils/response';

/**
 * Health check controller
 * Requirement 11.6: Provide GET /health endpoint returning service status and database connection status
 */
export default class HealthController extends Controller {
  async index() {
    const { ctx, app } = this;

    const healthStatus = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: {
        status: 'unknown',
        message: '',
      },
      redis: {
        status: 'unknown',
        message: '',
      },
    };

    // Check database connection
    try {
      await app.model.query('SELECT 1');
      healthStatus.database.status = 'ok';
      healthStatus.database.message = 'Connected';
    } catch (err) {
      healthStatus.database.status = 'error';
      healthStatus.database.message = err instanceof Error ? err.message : 'Connection failed';
      healthStatus.status = 'degraded';
    }

    // Check Redis connection
    try {
      await app.redis.ping();
      healthStatus.redis.status = 'ok';
      healthStatus.redis.message = 'Connected';
    } catch (err) {
      healthStatus.redis.status = 'error';
      healthStatus.redis.message = err instanceof Error ? err.message : 'Connection failed';
      healthStatus.status = 'degraded';
    }

    if (healthStatus.status === 'ok') {
      ctx.status = 200;
      ctx.body = formatResponse(healthStatus, 'Service is healthy');
    } else {
      ctx.status = 503;
      ctx.body = formatError(ErrorCode.INTERNAL_SERVER_ERROR, 'Service is degraded', healthStatus);
    }
  }
}
