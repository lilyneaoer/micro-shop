import { describe, it } from '@jest/globals';
import { snakeToCamel, convertKeysToCamelCase, modelToCamelCase } from '../../app/utils/caseConverter';

describe('caseConverter', () => {
  describe('snakeToCamel', () => {
    it('should convert snake_case to camelCase', () => {
      expect(snakeToCamel('hello_world')).toBe('helloWorld');
      expect(snakeToCamel('user_id')).toBe('userId');
      expect(snakeToCamel('created_at')).toBe('createdAt');
      expect(snakeToCamel('total_amount')).toBe('totalAmount');
    });

    it('should handle strings without underscores', () => {
      expect(snakeToCamel('hello')).toBe('hello');
      expect(snakeToCamel('id')).toBe('id');
    });

    it('should handle multiple underscores', () => {
      expect(snakeToCamel('this_is_a_test')).toBe('thisIsATest');
    });
  });

  describe('convertKeysToCamelCase', () => {
    it('should convert object keys from snake_case to camelCase', () => {
      const input = {
        user_id: '123',
        user_name: 'John',
        created_at: '2024-01-01',
      };

      const expected = {
        userId: '123',
        userName: 'John',
        createdAt: '2024-01-01',
      };

      expect(convertKeysToCamelCase(input)).toEqual(expected);
    });

    it('should handle nested objects', () => {
      const input = {
        user_id: '123',
        user_profile: {
          first_name: 'John',
          last_name: 'Doe',
        },
      };

      const expected = {
        userId: '123',
        userProfile: {
          firstName: 'John',
          lastName: 'Doe',
        },
      };

      expect(convertKeysToCamelCase(input)).toEqual(expected);
    });

    it('should handle arrays', () => {
      const input = [
        { user_id: '1', user_name: 'John' },
        { user_id: '2', user_name: 'Jane' },
      ];

      const expected = [
        { userId: '1', userName: 'John' },
        { userId: '2', userName: 'Jane' },
      ];

      expect(convertKeysToCamelCase(input)).toEqual(expected);
    });

    it('should handle arrays of nested objects', () => {
      const input = {
        order_id: '123',
        order_items: [
          { dish_id: '1', dish_name: 'Pizza' },
          { dish_id: '2', dish_name: 'Burger' },
        ],
      };

      const expected = {
        orderId: '123',
        orderItems: [
          { dishId: '1', dishName: 'Pizza' },
          { dishId: '2', dishName: 'Burger' },
        ],
      };

      expect(convertKeysToCamelCase(input)).toEqual(expected);
    });

    it('should handle null and undefined', () => {
      expect(convertKeysToCamelCase(null)).toBe(null);
      expect(convertKeysToCamelCase(undefined)).toBe(undefined);
    });

    it('should handle primitive values', () => {
      expect(convertKeysToCamelCase('string')).toBe('string');
      expect(convertKeysToCamelCase(123)).toBe(123);
      expect(convertKeysToCamelCase(true)).toBe(true);
    });
  });

  describe('modelToCamelCase', () => {
    it('should convert Sequelize model instance to camelCase', () => {
      const mockModel = {
        toJSON: () => ({
          user_id: '123',
          user_name: 'John',
          created_at: '2024-01-01',
        }),
      };

      const expected = {
        userId: '123',
        userName: 'John',
        createdAt: '2024-01-01',
      };

      expect(modelToCamelCase(mockModel)).toEqual(expected);
    });

    it('should handle array of models', () => {
      const mockModels = [
        {
          toJSON: () => ({ user_id: '1', user_name: 'John' }),
        },
        {
          toJSON: () => ({ user_id: '2', user_name: 'Jane' }),
        },
      ];

      const expected = [
        { userId: '1', userName: 'John' },
        { userId: '2', userName: 'Jane' },
      ];

      expect(modelToCamelCase(mockModels)).toEqual(expected);
    });

    it('should handle plain objects', () => {
      const input = {
        user_id: '123',
        user_name: 'John',
      };

      const expected = {
        userId: '123',
        userName: 'John',
      };

      expect(modelToCamelCase(input)).toEqual(expected);
    });

    it('should handle null and undefined', () => {
      expect(modelToCamelCase(null)).toBe(null);
      expect(modelToCamelCase(undefined)).toBe(undefined);
    });
  });
});
