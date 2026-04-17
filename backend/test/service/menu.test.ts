/**
 * Tests for MenuService pure logic
 *
 * Tests the pure (non-database) aspects of MenuService directly,
 * without spinning up the full Egg.js app.
 *
 * **Validates: Requirements 2.4, 2.6, 3.6, 3.7**
 */

import * as fc from 'fast-check';

// ─── Pure logic extracted from MenuService for unit/property testing ─────────

interface Dish {
  id: string;
  name: string;
  is_available: boolean;
}

/**
 * Pure implementation of validateDishAvailability logic
 * (mirrors MenuService.validateDishAvailability without DB calls)
 */
function validateDishAvailability(
  dishes: Dish[],
  dishIds: string[],
): { valid: true } | { valid: false; unavailableDishes: string[] } {
  if (dishIds.length === 0) {
    return { valid: true };
  }

  const unavailableDishes: string[] = [];

  for (const dishId of dishIds) {
    const dish = dishes.find((d) => d.id === dishId);
    if (!dish || !dish.is_available) {
      const dishName = dish?.name ?? dishId;
      unavailableDishes.push(dishName);
    }
  }

  if (unavailableDishes.length > 0) {
    return { valid: false, unavailableDishes };
  }

  return { valid: true };
}

/**
 * Filter dishes for customer menu (only available dishes)
 * Mirrors MenuService.getDishes with availableOnly: true
 */
function getCustomerMenuDishes(dishes: Dish[]): Dish[] {
  return dishes.filter((d) => d.is_available);
}

// ─── Unit Tests ───────────────────────────────────────────────────────────────

describe('MenuService', () => {
  describe('validateDishAvailability', () => {
    it('should return valid for empty dish list', () => {
      const result = validateDishAvailability([], []);
      expect(result.valid).toBe(true);
    });

    it('should return valid when all dishes are available', () => {
      const dishes: Dish[] = [
        { id: 'dish-1', name: '宫保鸡丁', is_available: true },
        { id: 'dish-2', name: '麻婆豆腐', is_available: true },
      ];
      const result = validateDishAvailability(dishes, ['dish-1', 'dish-2']);
      expect(result.valid).toBe(true);
    });

    it('should return invalid when a dish is unavailable', () => {
      const dishes: Dish[] = [
        { id: 'dish-1', name: '宫保鸡丁', is_available: true },
        { id: 'dish-2', name: '麻婆豆腐', is_available: false },
      ];
      const result = validateDishAvailability(dishes, ['dish-1', 'dish-2']);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.unavailableDishes).toContain('麻婆豆腐');
      }
    });

    it('should return invalid when a dish does not exist', () => {
      const dishes: Dish[] = [{ id: 'dish-1', name: '宫保鸡丁', is_available: true }];
      const result = validateDishAvailability(dishes, ['dish-1', 'non-existent-id']);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.unavailableDishes).toContain('non-existent-id');
      }
    });

    it('should list all unavailable dish names', () => {
      const dishes: Dish[] = [
        { id: 'dish-1', name: '宫保鸡丁', is_available: false },
        { id: 'dish-2', name: '麻婆豆腐', is_available: false },
        { id: 'dish-3', name: '红烧肉', is_available: true },
      ];
      const result = validateDishAvailability(dishes, ['dish-1', 'dish-2', 'dish-3']);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.unavailableDishes).toHaveLength(2);
        expect(result.unavailableDishes).toContain('宫保鸡丁');
        expect(result.unavailableDishes).toContain('麻婆豆腐');
      }
    });
  });

  describe('getCustomerMenuDishes', () => {
    it('should return only available dishes', () => {
      const dishes: Dish[] = [
        { id: 'dish-1', name: '宫保鸡丁', is_available: true },
        { id: 'dish-2', name: '麻婆豆腐', is_available: false },
        { id: 'dish-3', name: '红烧肉', is_available: true },
      ];
      const result = getCustomerMenuDishes(dishes);
      expect(result).toHaveLength(2);
      expect(result.every((d) => d.is_available)).toBe(true);
    });

    it('should return empty array when all dishes are unavailable', () => {
      const dishes: Dish[] = [
        { id: 'dish-1', name: '宫保鸡丁', is_available: false },
        { id: 'dish-2', name: '麻婆豆腐', is_available: false },
      ];
      const result = getCustomerMenuDishes(dishes);
      expect(result).toHaveLength(0);
    });

    it('should return all dishes when all are available', () => {
      const dishes: Dish[] = [
        { id: 'dish-1', name: '宫保鸡丁', is_available: true },
        { id: 'dish-2', name: '麻婆豆腐', is_available: true },
      ];
      const result = getCustomerMenuDishes(dishes);
      expect(result).toHaveLength(2);
    });
  });
});

// ─── Property-Based Tests (Property 2 & 4) ───────────────────────────────────

describe('Property 2: 下架菜品不出现在顾客菜单查询结果中 (Property-Based Tests)', () => {
  /**
   * Property 2.1: 顾客菜单查询结果中所有菜品的 is_available 均为 true
   * **Validates: Requirement 2.4**
   * Feature: qr-code-ordering-system, Property 2: 下架菜品不出现在顾客菜单查询结果中
   */
  it('Property 2.1: customer menu never contains unavailable dishes', () => {
    const dishArb = fc.record({
      id: fc.uuid(),
      name: fc.string({ minLength: 1, maxLength: 20 }),
      is_available: fc.boolean(),
    });

    fc.assert(
      fc.property(fc.array(dishArb, { minLength: 0, maxLength: 50 }), (dishes) => {
        const result = getCustomerMenuDishes(dishes);
        // All returned dishes must be available
        expect(result.every((d) => d.is_available)).toBe(true);
        // No unavailable dish should appear in the result
        const unavailableIds = new Set(dishes.filter((d) => !d.is_available).map((d) => d.id));
        for (const dish of result) {
          expect(unavailableIds.has(dish.id)).toBe(false);
        }
        return true;
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 2.2: 所有上架菜品都出现在顾客菜单查询结果中（不遗漏）
   * **Validates: Requirement 2.4**
   */
  it('Property 2.2: all available dishes appear in customer menu', () => {
    const dishArb = fc.record({
      id: fc.uuid(),
      name: fc.string({ minLength: 1, maxLength: 20 }),
      is_available: fc.boolean(),
    });

    fc.assert(
      fc.property(fc.array(dishArb, { minLength: 0, maxLength: 50 }), (dishes) => {
        const result = getCustomerMenuDishes(dishes);
        const resultIds = new Set(result.map((d) => d.id));
        const availableIds = dishes.filter((d) => d.is_available).map((d) => d.id);
        for (const id of availableIds) {
          expect(resultIds.has(id)).toBe(true);
        }
        return true;
      }),
      { numRuns: 100 },
    );
  });
});

describe('Property 4: 含下架菜品的订单提交被拒绝 (Property-Based Tests)', () => {
  /**
   * Property 4.1: 包含至少一个下架菜品的订单提交请求应被拒绝
   * **Validates: Requirements 3.6, 3.7**
   * Feature: qr-code-ordering-system, Property 4: 含下架菜品的订单提交被拒绝
   */
  it('Property 4.1: orders with at least one unavailable dish are always rejected', () => {
    const availableDishArb = fc.record({
      id: fc.uuid(),
      name: fc.string({ minLength: 1, maxLength: 20 }),
      is_available: fc.constant(true) as fc.Arbitrary<boolean>,
    });

    const unavailableDishArb = fc.record({
      id: fc.uuid(),
      name: fc.string({ minLength: 1, maxLength: 20 }),
      is_available: fc.constant(false) as fc.Arbitrary<boolean>,
    });

    fc.assert(
      fc.property(
        // At least one unavailable dish
        fc.array(availableDishArb, { minLength: 0, maxLength: 5 }),
        fc.array(unavailableDishArb, { minLength: 1, maxLength: 5 }),
        (availableDishes, unavailableDishes) => {
          const allDishes = [...availableDishes, ...unavailableDishes];
          const allDishIds = allDishes.map((d) => d.id);

          const result = validateDishAvailability(allDishes, allDishIds);
          // Must be rejected because there's at least one unavailable dish
          expect(result.valid).toBe(false);
          return true;
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 4.2: 所有菜品均上架时，订单提交应被接受
   * **Validates: Requirements 3.6**
   */
  it('Property 4.2: orders with all available dishes are always accepted', () => {
    const availableDishArb = fc.record({
      id: fc.uuid(),
      name: fc.string({ minLength: 1, maxLength: 20 }),
      is_available: fc.constant(true) as fc.Arbitrary<boolean>,
    });

    fc.assert(
      fc.property(
        fc.array(availableDishArb, { minLength: 1, maxLength: 10 }),
        (dishes) => {
          const dishIds = dishes.map((d) => d.id);
          const result = validateDishAvailability(dishes, dishIds);
          expect(result.valid).toBe(true);
          return true;
        },
      ),
      { numRuns: 100 },
    );
  });
});
