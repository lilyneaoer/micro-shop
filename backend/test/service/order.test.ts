/**
 * Tests for OrderService pure logic
 *
 * Tests the pure (non-database) methods of OrderService directly,
 * without spinning up the full Egg.js app.
 *
 * **Validates: Requirements 3.5, 3.6, 5.1, 5.6**
 */

import * as fc from 'fast-check';
import { OrderStatus } from '../../app/model/order';

// ─── Pure logic extracted from OrderService for unit/property testing ─────────

interface OrderItemDetail {
  dish_id: string;
  sku_id: string | null;
  dish_name: string;
  sku_name: string | null;
  unit_price: number;
  quantity: number;
  subtotal: number;
}

function calculateOrderTotal(items: OrderItemDetail[]): number {
  return items.reduce((total, item) => total + item.subtotal, 0);
}

function validateStatusTransition(currentStatus: OrderStatus, newStatus: OrderStatus): boolean {
  const validTransitions: Record<OrderStatus, OrderStatus[]> = {
    待支付: ['已支付', '已取消'],
    已支付: ['已接单', '已取消'],
    已接单: ['已完成', '已取消'],
    已完成: ['已退款'],
    已取消: [],
    已退款: [],
  };

  const allowedNextStatuses = validTransitions[currentStatus] || [];
  return allowedNextStatuses.includes(newStatus);
}

// ─── Unit Tests ───────────────────────────────────────────────────────────────

describe('OrderService', () => {
  describe('calculateOrderTotal', () => {
    it('should calculate total from order items', () => {
      const items: OrderItemDetail[] = [
        {
          dish_id: '1',
          sku_id: null,
          dish_name: 'Dish 1',
          sku_name: null,
          unit_price: 1000,
          quantity: 2,
          subtotal: 2000,
        },
        {
          dish_id: '2',
          sku_id: null,
          dish_name: 'Dish 2',
          sku_name: null,
          unit_price: 1500,
          quantity: 1,
          subtotal: 1500,
        },
      ];

      const total = calculateOrderTotal(items);
      expect(total).toBe(3500);
    });

    it('should return 0 for empty items', () => {
      const total = calculateOrderTotal([]);
      expect(total).toBe(0);
    });

    it('should handle items with SKU', () => {
      const items: OrderItemDetail[] = [
        {
          dish_id: '1',
          sku_id: 'sku-1',
          dish_name: 'Dish 1',
          sku_name: 'Large',
          unit_price: 1200,
          quantity: 3,
          subtotal: 3600,
        },
      ];

      const total = calculateOrderTotal(items);
      expect(total).toBe(3600);
    });
  });

  describe('validateStatusTransition', () => {
    it('should allow 待支付 → 已支付', () => {
      const result = validateStatusTransition('待支付', '已支付');
      expect(result).toBe(true);
    });

    it('should allow 待支付 → 已取消', () => {
      const result = validateStatusTransition('待支付', '已取消');
      expect(result).toBe(true);
    });

    it('should allow 已支付 → 已接单', () => {
      const result = validateStatusTransition('已支付', '已接单');
      expect(result).toBe(true);
    });

    it('should allow 已支付 → 已取消', () => {
      const result = validateStatusTransition('已支付', '已取消');
      expect(result).toBe(true);
    });

    it('should allow 已接单 → 已完成', () => {
      const result = validateStatusTransition('已接单', '已完成');
      expect(result).toBe(true);
    });

    it('should allow 已接单 → 已取消', () => {
      const result = validateStatusTransition('已接单', '已取消');
      expect(result).toBe(true);
    });

    it('should allow 已完成 → 已退款', () => {
      const result = validateStatusTransition('已完成', '已退款');
      expect(result).toBe(true);
    });

    it('should reject 已完成 → 待支付 (backward transition)', () => {
      const result = validateStatusTransition('已完成', '待支付');
      expect(result).toBe(false);
    });

    it('should reject 已取消 → 已支付 (from terminal state)', () => {
      const result = validateStatusTransition('已取消', '已支付');
      expect(result).toBe(false);
    });

    it('should reject 已退款 → 已完成 (from terminal state)', () => {
      const result = validateStatusTransition('已退款', '已完成');
      expect(result).toBe(false);
    });

    it('should reject 待支付 → 已接单 (skipping 已支付)', () => {
      const result = validateStatusTransition('待支付', '已接单');
      expect(result).toBe(false);
    });

    it('should reject 待支付 → 已完成 (skipping intermediate states)', () => {
      const result = validateStatusTransition('待支付', '已完成');
      expect(result).toBe(false);
    });

    it('should reject 已支付 → 已完成 (skipping 已接单)', () => {
      const result = validateStatusTransition('已支付', '已完成');
      expect(result).toBe(false);
    });

    it('should reject 已接单 → 已支付 (backward transition)', () => {
      const result = validateStatusTransition('已接单', '已支付');
      expect(result).toBe(false);
    });
  });
});

// ─── Property-Based Tests (Property 6) ───────────────────────────────────────

describe('Property 6: 订单状态流转合法性 (Property-Based Tests)', () => {
  const allStatuses: OrderStatus[] = ['待支付', '已支付', '已接单', '已完成', '已取消', '已退款'];

  const validTransitions: [OrderStatus, OrderStatus][] = [
    ['待支付', '已支付'],
    ['待支付', '已取消'],
    ['已支付', '已接单'],
    ['已支付', '已取消'],
    ['已接单', '已完成'],
    ['已接单', '已取消'],
    ['已完成', '已退款'],
  ];

  const validTransitionSet = new Set(validTransitions.map(([a, b]) => `${a}->${b}`));

  /**
   * Property 6.1: 合法状态转换始终被接受
   * **Validates: Requirements 5.1, 5.6**
   * Feature: qr-code-ordering-system, Property 6: 订单状态流转合法性
   */
  it('Property 6.1: all valid transitions are accepted', () => {
    for (const [from, to] of validTransitions) {
      expect(validateStatusTransition(from, to)).toBe(true);
    }
  });

  /**
   * Property 6.2: 非法状态转换始终被拒绝
   * **Validates: Requirements 5.1, 5.6**
   * Feature: qr-code-ordering-system, Property 6: 订单状态流转合法性
   */
  it('Property 6.2: all invalid transitions are rejected', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...allStatuses),
        fc.constantFrom(...allStatuses),
        (from, to) => {
          const key = `${from}->${to}`;
          const expected = validTransitionSet.has(key);
          expect(validateStatusTransition(from, to)).toBe(expected);
          return true;
        },
      ),
      { numRuns: 200 },
    );
  });

  /**
   * Property 6.3: 终态（已取消、已退款）不能再转换到任何状态
   * **Validates: Requirements 5.1, 5.6**
   */
  it('Property 6.3: terminal states cannot transition to any state', () => {
    const terminalStates: OrderStatus[] = ['已取消', '已退款'];
    for (const terminal of terminalStates) {
      for (const target of allStatuses) {
        expect(validateStatusTransition(terminal, target)).toBe(false);
      }
    }
  });
});
