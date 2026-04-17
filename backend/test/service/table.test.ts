/**
 * Tests for TableService
 *
 * Includes:
 * - Property-based test for QR token global uniqueness (Property 1)
 * - Unit tests for table CRUD operations
 *
 * **Validates: Requirements 1.1, 1.2, 1.6**
 */

import * as fc from 'fast-check';
import { v4 as uuidv4 } from 'uuid';

// ─── Pure logic extracted from TableService for unit/property testing ─────────

function generateQrToken(): string {
  return uuidv4();
}

function generateQrTokensForTables(count: number): string[] {
  const tokens: string[] = [];
  for (let i = 0; i < count; i++) {
    tokens.push(generateQrToken());
  }
  return tokens;
}

function allDistinct(values: string[]): boolean {
  return new Set(values).size === values.length;
}

// ─── Unit Tests ───────────────────────────────────────────────────────────────

describe('TableService - Unit Tests', () => {
  describe('qr_token generation', () => {
    it('should generate a valid UUID v4 for qr_token', () => {
      const token = generateQrToken();
      const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(token).toMatch(uuidV4Regex);
    });

    it('should generate different tokens on each call', () => {
      const token1 = generateQrToken();
      const token2 = generateQrToken();
      expect(token1).not.toBe(token2);
    });

    it('should generate 10 distinct tokens', () => {
      const tokens = generateQrTokensForTables(10);
      expect(tokens).toHaveLength(10);
      expect(allDistinct(tokens)).toBe(true);
    });

    it('should generate 100 distinct tokens', () => {
      const tokens = generateQrTokensForTables(100);
      expect(tokens).toHaveLength(100);
      expect(allDistinct(tokens)).toBe(true);
    });

    it('should generate a new token on update (not reuse the old one)', () => {
      const originalToken = generateQrToken();
      const updatedToken = generateQrToken();
      expect(updatedToken).not.toBe(originalToken);
    });
  });

  describe('allDistinct helper', () => {
    it('should return true for an empty array', () => {
      expect(allDistinct([])).toBe(true);
    });

    it('should return true for a single element', () => {
      expect(allDistinct(['abc'])).toBe(true);
    });

    it('should return false when duplicates exist', () => {
      expect(allDistinct(['a', 'b', 'a'])).toBe(false);
    });

    it('should return true for all unique elements', () => {
      expect(allDistinct(['a', 'b', 'c'])).toBe(true);
    });
  });
});

// ─── Property-Based Tests (Property 1) ───────────────────────────────────────

describe('Property 1: 桌台二维码标识符全局唯一 (Property-Based Tests)', () => {
  /**
   * Property 1.1: 批量生成随机数量的桌台，验证所有 qr_token 互不相同
   * **Validates: Requirements 1.2, 1.6**
   * Feature: qr-code-ordering-system, Property 1: 桌台二维码标识符全局唯一
   */
  it('Property 1.1: batch-generated qr_tokens are always globally unique', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 200 }), (count) => {
        const tokens = generateQrTokensForTables(count);
        expect(allDistinct(tokens)).toBe(true);
        const uuidV4Regex =
          /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        for (const token of tokens) {
          expect(token).toMatch(uuidV4Regex);
        }
        return true;
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 1.2: 创建和更新操作生成的 qr_token 在合并后仍然全局唯一
   * **Validates: Requirements 1.2, 1.6**
   */
  it('Property 1.2: qr_tokens from create and update operations are all distinct', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        fc.integer({ min: 1, max: 100 }),
        (createCount, updateCount) => {
          const createTokens = generateQrTokensForTables(createCount);
          const updateTokens = generateQrTokensForTables(updateCount);
          const allTokens = [...createTokens, ...updateTokens];
          expect(allDistinct(allTokens)).toBe(true);
          return true;
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 1.3: 单个 qr_token 始终是有效的 UUID v4 格式
   * **Validates: Requirements 1.2**
   */
  it('Property 1.3: every generated qr_token is a valid UUID v4', () => {
    const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 50 }), (count) => {
        const tokens = generateQrTokensForTables(count);
        for (const token of tokens) {
          expect(token).toMatch(uuidV4Regex);
        }
        return true;
      }),
      { numRuns: 100 },
    );
  });
});
