/**
 * Utility functions for converting between snake_case and camelCase
 */

/**
 * Convert a snake_case string to camelCase
 */
export function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Convert an object's keys from snake_case to camelCase recursively
 */
export function convertKeysToCamelCase(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => convertKeysToCamelCase(item));
  }

  if (typeof obj === 'object' && obj.constructor === Object) {
    const converted: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const camelKey = snakeToCamel(key);
        converted[camelKey] = convertKeysToCamelCase(obj[key]);
      }
    }
    return converted;
  }

  return obj;
}

/**
 * Convert Sequelize model instance to camelCase object
 */
export function modelToCamelCase(model: any): any {
  if (!model) {
    return model;
  }

  if (Array.isArray(model)) {
    return model.map(item => modelToCamelCase(item));
  }

  // Check if it's a Sequelize model instance
  if (model.toJSON && typeof model.toJSON === 'function') {
    const json = model.toJSON();
    return convertKeysToCamelCase(json);
  }

  // If it's already a plain object
  if (typeof model === 'object' && model.constructor === Object) {
    return convertKeysToCamelCase(model);
  }

  return model;
}
