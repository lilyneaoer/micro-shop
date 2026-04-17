import { Controller } from 'egg';
import { formatResponse, formatError, ErrorCode } from '../utils/response';

/**
 * Authentication controller
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */
export default class AuthController extends Controller {
  /**
   * POST /api/auth/login
   * Merchant login with username and password
   * Requirements: 9.1, 9.2, 9.3, 11.3
   */
  async login() {
    const { ctx } = this;

    const { username, password } = ctx.request.body as { username?: string; password?: string };

    // Parameter validation (Requirement 11.2)
    if (!username || typeof username !== 'string' || username.trim() === '') {
      ctx.status = 400;
      ctx.body = formatError(ErrorCode.VALIDATION_ERROR, '用户名不能为空');
      return;
    }

    if (!password || typeof password !== 'string' || password.trim() === '') {
      ctx.status = 400;
      ctx.body = formatError(ErrorCode.VALIDATION_ERROR, '密码不能为空');
      return;
    }

    const result = await ctx.service.auth.login(username.trim(), password);

    if (!result.success) {
      if (result.code === ErrorCode.ACCOUNT_LOCKED) {
        ctx.status = 403;
      } else {
        ctx.status = 401;
      }
      ctx.body = formatError(result.code, result.message);
      return;
    }

    ctx.status = 200;
    ctx.body = formatResponse(result.data, '登录成功');
  }

  /**
   * POST /api/auth/logout
   * Merchant logout (JWT is stateless; client should discard the token)
   * Requirement 9.4: Accept requests with valid JWT Token
   */
  async logout() {
    const { ctx } = this;
    // JWT is stateless — the client is responsible for discarding the token.
    // In a production system you could maintain a token blacklist in Redis here.
    ctx.status = 200;
    ctx.body = formatResponse(null, '登出成功');
  }

  /**
   * POST /api/auth/refresh
   * Refresh JWT token using a valid refresh token
   * Requirement 9.2: Token refresh
   */
  async refresh() {
    const { ctx } = this;

    const { refreshToken } = ctx.request.body as { refreshToken?: string };

    if (!refreshToken || typeof refreshToken !== 'string') {
      ctx.status = 400;
      ctx.body = formatError(ErrorCode.VALIDATION_ERROR, 'refreshToken 不能为空');
      return;
    }

    const result = await ctx.service.auth.refresh(refreshToken);

    if (!result.success) {
      ctx.status = 401;
      ctx.body = formatError(result.code, result.message);
      return;
    }

    ctx.status = 200;
    ctx.body = formatResponse(result.data, 'Token 刷新成功');
  }
}
