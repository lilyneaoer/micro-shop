/**
 * Property-based tests for formatResponse utility function
 *
 * **Validates: Requirements 11.1, 11.7**
 *
 * Property 10: API 响应格式与金额字段不变量
 * - 验证任意输入下响应结构均包含 code、message、data 三个字段
 * - 验证金额字段（price、total_amount、amount、subtotal）均为非负整数
 */

import * as fc from 'fast-check';
import { formatResponse, formatError, ErrorCode, ApiResponse } from '../../app/utils/response';

describe('formatResponse - Unit Tests', () => {
  describe('formatResponse', () => {
    it('should return object with code 0 for success', () => {
      const result = formatResponse({ id: 1 });
      expect(result.code).toBe(0);
    });

    it('should return default message "success"', () => {
      const result = formatResponse(null);
      expect(result.message).toBe('success');
    });

    it('should return custom message when provided', () => {
      const result = formatResponse(null, '操作成功');
      expect(result.message).toBe('操作成功');
    });

    it('should include data in response', () => {
      const data = { id: 1, name: 'test' };
      const result = formatResponse(data);
      expect(result.data).toEqual(data);
    });

    it('should handle null data', () => {
      const result = formatResponse(null);
      expect(result.data).toBeNull();
    });

    it('should handle array data', () => {
      const data = [1, 2, 3];
      const result = formatResponse(data);
      expect(result.data).toEqual(data);
    });
  });

  describe('formatError', () => {
    it('should return object with non-zero error code', () => {
      const result = formatError(ErrorCode.VALIDATION_ERROR, '参数错误');
      expect(result.code).toBe(1001);
    });

    it('should include error message', () => {
      const result = formatError(ErrorCode.UNAUTHORIZED, '未授权');
      expect(result.message).toBe('未授权');
    });

    it('should default data to null', () => {
      const result = formatError(ErrorCode.NOT_FOUND, '资源不存在');
      expect(result.data).toBeNull();
    });

    it('should include custom error data when provided', () => {
      const errorData = { field: 'username', message: '用户名不能为空' };
      const result = formatError(ErrorCode.VALIDATION_ERROR, '参数错误', errorData);
      expect(result.data).toEqual(errorData);
    });
  });
});

describe('formatResponse - Property-Based Tests (Property 10)', () => {
  /**
   * Property 10.1: 任意输入下响应结构均包含 code、message、data 三个字段
   * Validates: Requirement 11.1
   */
  it('Property 10.1: response always contains code, message, and data fields', () => {
    fc.assert(
      fc.property(fc.anything(), fc.string(), (data, message) => {
        const response = formatResponse(data, message);

        // All three fields must be present
        expect(response).toHaveProperty('code');
        expect(response).toHaveProperty('message');
        expect(response).toHaveProperty('data');

        // code must be a number
        expect(typeof response.code).toBe('number');

        // message must be a string
        expect(typeof response.message).toBe('string');

        // code must be 0 for success responses
        expect(response.code).toBe(0);

        return true;
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 10.2: formatError 响应结构均包含 code、message、data 三个字段
   * Validates: Requirement 11.1
   */
  it('Property 10.2: error response always contains code, message, and data fields', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 9999 }),
        fc.string(),
        fc.anything(),
        (code, message, data) => {
          const response = formatError(code, message, data);

          // All three fields must be present
          expect(response).toHaveProperty('code');
          expect(response).toHaveProperty('message');
          expect(response).toHaveProperty('data');

          // code must be a number
          expect(typeof response.code).toBe('number');

          // message must be a string
          expect(typeof response.message).toBe('string');

          // code must match input
          expect(response.code).toBe(code);

          return true;
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 10.3: 金额字段（price、total_amount、amount、subtotal）均为非负整数
   * Validates: Requirement 11.7
   */
  it('Property 10.3: amount fields in response data are non-negative integers', () => {
    // Arbitrary for amount fields (non-negative integers in fen/cents)
    const amountArb = fc.integer({ min: 0, max: 10_000_000 }); // 0 to 100,000 yuan in fen

    fc.assert(
      fc.property(
        amountArb,
        amountArb,
        amountArb,
        amountArb,
        (price, totalAmount, amount, subtotal) => {
          const data = {
            price,
            total_amount: totalAmount,
            amount,
            subtotal,
          };

          const response = formatResponse(data);

          // Verify amount fields are non-negative integers
          const amountFields = ['price', 'total_amount', 'amount', 'subtotal'] as const;
          for (const field of amountFields) {
            const value = (response.data as Record<string, number>)[field];
            expect(Number.isInteger(value)).toBe(true);
            expect(value).toBeGreaterThanOrEqual(0);
          }

          return true;
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 10.4: 响应的 data 字段与输入数据完全一致（数据完整性）
   * Validates: Requirement 11.1
   */
  it('Property 10.4: response data field exactly matches input data', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant(null),
          fc.boolean(),
          fc.integer(),
          fc.string(),
          fc.array(fc.integer()),
          fc.record({
            id: fc.uuid(),
            name: fc.string(),
          }),
        ),
        (data) => {
          const response = formatResponse(data);
          expect(response.data).toEqual(data);
          return true;
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 10.5: 成功响应的 code 始终为 0，错误响应的 code 始终为非零值
   * Validates: Requirement 11.1
   */
  it('Property 10.5: success code is always 0, error code is always non-zero', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 9999 }), fc.string(), (errorCode, message) => {
        const successResponse = formatResponse(null, message);
        const errorResponse = formatError(errorCode, message);

        expect(successResponse.code).toBe(0);
        expect(errorResponse.code).not.toBe(0);
        expect(errorResponse.code).toBe(errorCode);

        return true;
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 10.6: 验证 ApiResponse 类型结构的完整性
   * Validates: Requirement 11.1
   */
  it('Property 10.6: response structure is always a valid ApiResponse shape', () => {
    const isValidApiResponse = (obj: unknown): obj is ApiResponse => {
      if (typeof obj !== 'object' || obj === null) return false;
      const response = obj as Record<string, unknown>;
      return (
        'code' in response &&
        'message' in response &&
        'data' in response &&
        typeof response.code === 'number' &&
        typeof response.message === 'string'
      );
    };

    fc.assert(
      fc.property(fc.anything(), fc.string(), (data, message) => {
        const successResponse = formatResponse(data, message);
        expect(isValidApiResponse(successResponse)).toBe(true);
        return true;
      }),
      { numRuns: 100 },
    );
  });
});
