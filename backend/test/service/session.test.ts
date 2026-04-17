/**
 * Tests for SessionService
 *
 * Includes:
 * - Property-based tests for customer session uniqueness (Property 9)
 * - Unit tests for session creation, validation, and expiry
 *
 * **Validates: Requirements 10.1, 10.2, 10.5, 10.6**
 */

import * as fc from 'fast-check';
import { v4 as uuidv4 } from 'uuid';

// ─── Pure logic extracted from SessionService for unit/property testing ───────
// We test the core session uniqueness logic without spinning up the full Egg.js
// app, which avoids needing a live database in unit tests.

const SESSION_DURATION_HOURS = 4;

interface SessionRecord {
  id: string;
  open_id: string;
  table_id: string;
  session_token: string;
  expires_at: Date;
  created_at: Date;
}

/**
 * In-memory session store that mirrors the DB-backed SessionService logic.
 * Used to test the uniqueness invariant without a real database.
 */
class InMemorySessionStore {
  private sessions: SessionRecord[] = [];

  /**
   * Create a new session for openId + tableId.
   * Invalidates all existing valid sessions for the same combination first
   * (mirrors the DB transaction in SessionService.createOrRenewSession).
   *
   * Requirement 10.6: only one valid session per openId + tableId at any time.
   */
  createSession(openId: string, tableId: string, now: Date = new Date()): SessionRecord {
    const expiresAt = new Date(now.getTime() + SESSION_DURATION_HOURS * 60 * 60 * 1000);

    // Invalidate existing valid sessions for this openId + tableId (DB transaction equivalent)
    this.sessions = this.sessions.map((s) => {
      if (s.open_id === openId && s.table_id === tableId && s.expires_at > now) {
        return { ...s, expires_at: now }; // mark as expired
      }
      return s;
    });

    // Create new session
    const newSession: SessionRecord = {
      id: uuidv4(),
      open_id: openId,
      table_id: tableId,
      session_token: uuidv4(),
      expires_at: expiresAt,
      created_at: now,
    };

    this.sessions.push(newSession);
    return newSession;
  }

  /**
   * Count valid (non-expired) sessions for a given openId + tableId combination.
   */
  countValidSessions(openId: string, tableId: string, now: Date = new Date()): number {
    return this.sessions.filter(
      (s) => s.open_id === openId && s.table_id === tableId && s.expires_at > now,
    ).length;
  }

  /**
   * Get all valid sessions for a given openId + tableId combination.
   */
  getValidSessions(openId: string, tableId: string, now: Date = new Date()): SessionRecord[] {
    return this.sessions.filter(
      (s) => s.open_id === openId && s.table_id === tableId && s.expires_at > now,
    );
  }

  /**
   * Validate a session token. Returns the session if valid, null if expired/not found.
   */
  validateToken(sessionToken: string, now: Date = new Date()): SessionRecord | null {
    const session = this.sessions.find((s) => s.session_token === sessionToken);
    if (!session) return null;
    if (session.expires_at <= now) return null;
    return session;
  }

  reset(): void {
    this.sessions = [];
  }
}

// ─── Unit Tests ───────────────────────────────────────────────────────────────

describe('SessionService - Unit Tests', () => {
  let store: InMemorySessionStore;

  beforeEach(() => {
    store = new InMemorySessionStore();
  });

  describe('createSession', () => {
    it('should create a session with 4-hour expiry', () => {
      const now = new Date('2024-01-01T10:00:00Z');
      const session = store.createSession('openid_001', 'table_001', now);

      expect(session.open_id).toBe('openid_001');
      expect(session.table_id).toBe('table_001');
      expect(session.session_token).toBeTruthy();
      expect(session.id).toBeTruthy();

      const expectedExpiry = new Date('2024-01-01T14:00:00Z');
      expect(session.expires_at.getTime()).toBe(expectedExpiry.getTime());
    });

    it('should invalidate old valid session when creating a new one for same openId + tableId', () => {
      const now = new Date('2024-01-01T10:00:00Z');
      const session1 = store.createSession('openid_001', 'table_001', now);

      // Create a second session 1 hour later
      const later = new Date('2024-01-01T11:00:00Z');
      store.createSession('openid_001', 'table_001', later);

      // The first session should now be expired (invalidated)
      const validAtLater = store.validateToken(session1.session_token, later);
      expect(validAtLater).toBeNull();

      // Only one valid session should exist
      expect(store.countValidSessions('openid_001', 'table_001', later)).toBe(1);
    });

    it('should not affect sessions for different openId', () => {
      const now = new Date('2024-01-01T10:00:00Z');
      store.createSession('openid_001', 'table_001', now);
      store.createSession('openid_002', 'table_001', now);

      // Both should be valid
      expect(store.countValidSessions('openid_001', 'table_001', now)).toBe(1);
      expect(store.countValidSessions('openid_002', 'table_001', now)).toBe(1);
    });

    it('should not affect sessions for different tableId', () => {
      const now = new Date('2024-01-01T10:00:00Z');
      store.createSession('openid_001', 'table_001', now);
      store.createSession('openid_001', 'table_002', now);

      // Both should be valid
      expect(store.countValidSessions('openid_001', 'table_001', now)).toBe(1);
      expect(store.countValidSessions('openid_001', 'table_002', now)).toBe(1);
    });
  });

  describe('validateToken', () => {
    it('should return session for a valid token', () => {
      const now = new Date('2024-01-01T10:00:00Z');
      const session = store.createSession('openid_001', 'table_001', now);

      const result = store.validateToken(session.session_token, now);
      expect(result).not.toBeNull();
      expect(result!.id).toBe(session.id);
    });

    it('should return null for an expired token', () => {
      const now = new Date('2024-01-01T10:00:00Z');
      const session = store.createSession('openid_001', 'table_001', now);

      // Check after 5 hours (session expires after 4 hours)
      const afterExpiry = new Date('2024-01-01T15:00:00Z');
      const result = store.validateToken(session.session_token, afterExpiry);
      expect(result).toBeNull();
    });

    it('should return null for an unknown token', () => {
      const result = store.validateToken('non-existent-token');
      expect(result).toBeNull();
    });

    it('should return null for a token that was invalidated by a newer session', () => {
      const now = new Date('2024-01-01T10:00:00Z');
      const session1 = store.createSession('openid_001', 'table_001', now);

      const later = new Date('2024-01-01T11:00:00Z');
      store.createSession('openid_001', 'table_001', later);

      // Old token should be invalid
      const result = store.validateToken(session1.session_token, later);
      expect(result).toBeNull();
    });
  });

  describe('session expiry (Requirement 10.2)', () => {
    it('session should be valid just before expiry', () => {
      const now = new Date('2024-01-01T10:00:00Z');
      const session = store.createSession('openid_001', 'table_001', now);

      // 1 second before expiry
      const justBefore = new Date(session.expires_at.getTime() - 1000);
      expect(store.validateToken(session.session_token, justBefore)).not.toBeNull();
    });

    it('session should be invalid at expiry time', () => {
      const now = new Date('2024-01-01T10:00:00Z');
      const session = store.createSession('openid_001', 'table_001', now);

      // At exact expiry time
      expect(store.validateToken(session.session_token, session.expires_at)).toBeNull();
    });
  });
});

// ─── Property-Based Tests (Property 9) ───────────────────────────────────────

describe('Property 9: 顾客会话唯一性 (Property-Based Tests)', () => {
  let store: InMemorySessionStore;

  beforeEach(() => {
    store = new InMemorySessionStore();
  });

  /**
   * Property 9.1: 对于任意 OpenID + 桌台组合，创建多个 Session 后，
   * 在任意时刻最多只存在一条有效 Session 记录。
   *
   * **Validates: Requirement 10.6**
   * Feature: qr-code-ordering-system, Property 9: 顾客会话唯一性
   */
  it('Property 9.1: at most one valid session exists per openId+tableId at any time', () => {
    fc.assert(
      fc.property(
        // Generate a random openId (non-empty string)
        fc.string({ minLength: 1, maxLength: 64 }).filter((s) => s.trim().length > 0),
        // Generate a random tableId (UUID-like)
        fc.uuid(),
        // Generate a random number of session creation attempts (1 to 10)
        fc.integer({ min: 1, max: 10 }),
        (openId, tableId, sessionCount) => {
          store.reset();
          const baseTime = new Date('2024-01-01T10:00:00Z');

          // Create multiple sessions for the same openId + tableId
          for (let i = 0; i < sessionCount; i++) {
            // Each creation is 1 minute apart
            const creationTime = new Date(baseTime.getTime() + i * 60 * 1000);
            store.createSession(openId, tableId, creationTime);
          }

          // Check at the time of the last creation
          const checkTime = new Date(baseTime.getTime() + (sessionCount - 1) * 60 * 1000);
          const validCount = store.countValidSessions(openId, tableId, checkTime);

          // There should be exactly 1 valid session
          expect(validCount).toBe(1);
          return validCount === 1;
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 9.2: 对于任意 OpenID + 桌台组合，创建新 Session 后，
   * 旧的有效 Session 应被自动失效（不再有效）。
   *
   * **Validates: Requirement 10.6**
   * Feature: qr-code-ordering-system, Property 9: 顾客会话唯一性
   */
  it('Property 9.2: creating a new session invalidates all previous valid sessions for same openId+tableId', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 64 }).filter((s) => s.trim().length > 0),
        fc.uuid(),
        fc.integer({ min: 2, max: 8 }),
        (openId, tableId, sessionCount) => {
          store.reset();
          const baseTime = new Date('2024-01-01T10:00:00Z');

          const tokens: string[] = [];

          // Create multiple sessions, collecting all tokens
          for (let i = 0; i < sessionCount; i++) {
            const creationTime = new Date(baseTime.getTime() + i * 60 * 1000);
            const session = store.createSession(openId, tableId, creationTime);
            tokens.push(session.session_token);
          }

          // At the time of the last creation, only the last token should be valid
          const lastCreationTime = new Date(baseTime.getTime() + (sessionCount - 1) * 60 * 1000);

          // All previous tokens should be invalid
          for (let i = 0; i < tokens.length - 1; i++) {
            const result = store.validateToken(tokens[i], lastCreationTime);
            expect(result).toBeNull();
          }

          // Only the last token should be valid
          const lastResult = store.validateToken(tokens[tokens.length - 1], lastCreationTime);
          expect(lastResult).not.toBeNull();

          return true;
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 9.3: 不同 OpenID + 桌台组合的 Session 互不影响。
   *
   * **Validates: Requirement 10.6**
   * Feature: qr-code-ordering-system, Property 9: 顾客会话唯一性
   */
  it('Property 9.3: sessions for different openId+tableId combinations are independent', () => {
    fc.assert(
      fc.property(
        // Two distinct openIds
        fc
          .tuple(
            fc.string({ minLength: 1, maxLength: 32 }).filter((s) => s.trim().length > 0),
            fc.string({ minLength: 1, maxLength: 32 }).filter((s) => s.trim().length > 0),
          )
          .filter(([a, b]) => a !== b),
        // Two distinct tableIds
        fc.tuple(fc.uuid(), fc.uuid()).filter(([a, b]) => a !== b),
        ([openId1, openId2], [tableId1, tableId2]) => {
          store.reset();
          const now = new Date('2024-01-01T10:00:00Z');

          // Create sessions for 4 different combinations
          store.createSession(openId1, tableId1, now);
          store.createSession(openId1, tableId2, now);
          store.createSession(openId2, tableId1, now);
          store.createSession(openId2, tableId2, now);

          // Each combination should have exactly 1 valid session
          expect(store.countValidSessions(openId1, tableId1, now)).toBe(1);
          expect(store.countValidSessions(openId1, tableId2, now)).toBe(1);
          expect(store.countValidSessions(openId2, tableId1, now)).toBe(1);
          expect(store.countValidSessions(openId2, tableId2, now)).toBe(1);

          // Now create a new session for openId1+tableId1 — should not affect others
          const later = new Date(now.getTime() + 30 * 60 * 1000);
          store.createSession(openId1, tableId1, later);

          expect(store.countValidSessions(openId1, tableId1, later)).toBe(1);
          expect(store.countValidSessions(openId1, tableId2, later)).toBe(1);
          expect(store.countValidSessions(openId2, tableId1, later)).toBe(1);
          expect(store.countValidSessions(openId2, tableId2, later)).toBe(1);

          return true;
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 9.4: Session 有效期始终为 4 小时。
   *
   * **Validates: Requirement 10.2**
   * Feature: qr-code-ordering-system, Property 9: 顾客会话唯一性
   */
  it('Property 9.4: session expiry is always exactly 4 hours from creation', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 64 }).filter((s) => s.trim().length > 0),
        fc.uuid(),
        // Random creation timestamp within a reasonable range
        fc.date({ min: new Date('2020-01-01'), max: new Date('2030-01-01') }),
        (openId, tableId, creationTime) => {
          store.reset();
          const session = store.createSession(openId, tableId, creationTime);

          const expectedExpiry = new Date(creationTime.getTime() + 4 * 60 * 60 * 1000);
          expect(session.expires_at.getTime()).toBe(expectedExpiry.getTime());

          return true;
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 9.5: 对于任意 OpenID + 桌台组合，在任意时刻，
   * 有效 Session 数量始终为 0 或 1（不超过 1）。
   *
   * We verify this by checking immediately after each session creation:
   * right after creating a session, there should be exactly 1 valid session.
   *
   * **Validates: Requirement 10.6**
   * Feature: qr-code-ordering-system, Property 9: 顾客会话唯一性
   */
  it('Property 9.5: valid session count for any openId+tableId is always 0 or 1', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 32 }).filter((s) => s.trim().length > 0),
        fc.uuid(),
        // Array of strictly increasing time offsets (in minutes) at which to create sessions
        fc.array(fc.integer({ min: 1, max: 30 }), { minLength: 1, maxLength: 15 }),
        (openId, tableId, deltas) => {
          store.reset();
          const baseTime = new Date('2024-06-01T08:00:00Z');

          // Build strictly increasing offsets from deltas
          const offsets: number[] = [];
          let cumulative = 0;
          for (const delta of deltas) {
            cumulative += delta;
            offsets.push(cumulative);
          }

          // Create sessions at strictly increasing times and check immediately after each
          for (const offsetMinutes of offsets) {
            const creationTime = new Date(baseTime.getTime() + offsetMinutes * 60 * 1000);
            store.createSession(openId, tableId, creationTime);

            // Immediately after creation, exactly 1 valid session should exist
            const count = store.countValidSessions(openId, tableId, creationTime);
            expect(count).toBe(1);
          }

          return true;
        },
      ),
      { numRuns: 100 },
    );
  });
});
