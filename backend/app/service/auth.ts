import { Service } from 'egg';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { ErrorCode } from '../utils/response';

const LOGIN_FAIL_KEY_PREFIX = 'login_fail:';
const MAX_FAIL_COUNT = 5;
const LOCK_TTL_SECONDS = 30 * 60; // 30 minutes

export interface LoginResult {
  token: string;
  refreshToken: string;
  merchantId: string;
  username: string;
  shopName: string;
}

export interface JwtPayload {
  merchantId: string;
  username: string;
  iat?: number;
  exp?: number;
}

export default class AuthService extends Service {
  /**
   * Hash a plain-text password using bcrypt
   * Requirement 9.2: Passwords are stored as bcrypt hashes
   */
  async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
  }

  /**
   * Compare a plain-text password against a bcrypt hash
   */
  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Sign a JWT token with 24-hour expiry
   * Requirement 9.2: JWT Token valid for 24 hours
   */
  signToken(payload: JwtPayload): string {
    const { secret, expiresIn } = this.app.config.jwt;
    return jwt.sign(payload, secret, { expiresIn } as jwt.SignOptions);
  }

  /**
   * Sign a refresh token with 7-day expiry
   */
  signRefreshToken(payload: JwtPayload): string {
    const { secret } = this.app.config.jwt;
    return jwt.sign(payload, secret, { expiresIn: '7d' } as jwt.SignOptions);
  }

  /**
   * Verify and decode a JWT token
   * Returns null if the token is invalid or expired
   */
  verifyToken(token: string): JwtPayload | null {
    try {
      const { secret } = this.app.config.jwt;
      const decoded = jwt.verify(token, secret) as JwtPayload;
      return decoded;
    } catch {
      return null;
    }
  }

  /**
   * Get the Redis key for login failure tracking
   */
  private getFailKey(username: string): string {
    return `${LOGIN_FAIL_KEY_PREFIX}${username}`;
  }

  /**
   * Increment login failure count for a username.
   * If count reaches MAX_FAIL_COUNT, set TTL to LOCK_TTL_SECONDS.
   * Requirement 9.3: Lock account after 5 consecutive failures for 30 minutes
   */
  async recordLoginFailure(username: string): Promise<number> {
    const key = this.getFailKey(username);
    const count = await this.app.redis.incr(key);
    if (count >= MAX_FAIL_COUNT) {
      // Lock: set TTL to 30 minutes
      await this.app.redis.expire(key, LOCK_TTL_SECONDS);
    } else if (count === 1) {
      // First failure: set a reasonable TTL so the key doesn't linger forever
      // Use the lock TTL as the window; resets on each new failure sequence
      await this.app.redis.expire(key, LOCK_TTL_SECONDS);
    }
    return count;
  }

  /**
   * Get current login failure count from Redis
   */
  async getLoginFailCount(username: string): Promise<number> {
    const key = this.getFailKey(username);
    const val = await this.app.redis.get(key);
    return val ? parseInt(val, 10) : 0;
  }

  /**
   * Clear login failure count (on successful login)
   */
  async clearLoginFailCount(username: string): Promise<void> {
    const key = this.getFailKey(username);
    await this.app.redis.del(key);
  }

  /**
   * Check if an account is currently locked based on Redis failure count
   * Requirement 9.3: Account locked after 5 consecutive failures
   */
  async isAccountLockedByRedis(username: string): Promise<boolean> {
    const count = await this.getLoginFailCount(username);
    return count >= MAX_FAIL_COUNT;
  }

  /**
   * Perform merchant login:
   * 1. Check Redis-based lock
   * 2. Look up merchant by username (parameterized query via Sequelize ORM)
   * 3. Verify password
   * 4. On failure: increment Redis counter
   * 5. On success: clear Redis counter, issue JWT
   *
   * Requirements: 9.1, 9.2, 9.3, 11.3
   */
  async login(
    username: string,
    password: string,
  ): Promise<
    { success: true; data: LoginResult } | { success: false; code: number; message: string }
  > {
    // Check Redis-based lock first
    const isLocked = await this.isAccountLockedByRedis(username);
    if (isLocked) {
      return {
        success: false,
        code: ErrorCode.ACCOUNT_LOCKED,
        message: '账号已被锁定，请 30 分钟后再试',
      };
    }

    // Parameterized query via Sequelize ORM (Requirement 11.3)
    const merchant: any = await this.app.model.Merchant.findOne({
      where: { username },
    });

    if (!merchant) {
      // Record failure even for non-existent users to prevent username enumeration
      await this.recordLoginFailure(username);
      return {
        success: false,
        code: ErrorCode.INVALID_CREDENTIALS,
        message: '用户名或密码错误',
      };
    }

    // Check DB-level lock (locked_until field)
    if (merchant.is_locked && merchant.locked_until && merchant.locked_until > new Date()) {
      return {
        success: false,
        code: ErrorCode.ACCOUNT_LOCKED,
        message: '账号已被锁定，请 30 分钟后再试',
      };
    }

    // Verify password
    const passwordMatch = await this.comparePassword(password, merchant.password_hash);
    if (!passwordMatch) {
      const failCount = await this.recordLoginFailure(username);
      if (failCount >= MAX_FAIL_COUNT) {
        return {
          success: false,
          code: ErrorCode.ACCOUNT_LOCKED,
          message: '账号已被锁定，请 30 分钟后再试',
        };
      }
      return {
        success: false,
        code: ErrorCode.INVALID_CREDENTIALS,
        message: '用户名或密码错误',
      };
    }

    // Successful login: clear failure counter
    await this.clearLoginFailCount(username);

    const payload: JwtPayload = {
      merchantId: merchant.id,
      username: merchant.username,
    };

    const token = this.signToken(payload);
    const refreshToken = this.signRefreshToken(payload);

    return {
      success: true,
      data: {
        token,
        refreshToken,
        merchantId: merchant.id,
        username: merchant.username,
        shopName: merchant.shop_name,
      },
    };
  }

  /**
   * Refresh a JWT token using a valid refresh token
   * Requirement 9.2: Token refresh
   */
  async refresh(
    refreshToken: string,
  ): Promise<
    { success: true; data: { token: string } } | { success: false; code: number; message: string }
  > {
    const payload = this.verifyToken(refreshToken);
    if (!payload) {
      return {
        success: false,
        code: ErrorCode.UNAUTHORIZED,
        message: 'Token 无效或已过期',
      };
    }

    // Verify merchant still exists (parameterized query via Sequelize ORM)
    const merchant: any = await this.app.model.Merchant.findOne({
      where: { id: payload.merchantId },
    });

    if (!merchant) {
      return {
        success: false,
        code: ErrorCode.UNAUTHORIZED,
        message: 'Token 无效或已过期',
      };
    }

    const newPayload: JwtPayload = {
      merchantId: merchant.id,
      username: merchant.username,
    };

    const token = this.signToken(newPayload);

    return {
      success: true,
      data: { token },
    };
  }
}
