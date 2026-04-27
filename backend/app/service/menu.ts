import { Service } from 'egg';
import { ErrorCode } from '../utils/response';
import { Op } from 'sequelize';
import { modelToCamelCase } from '../utils/caseConverter';

export interface CreateCategoryInput {
  name: string;
  sort_order?: number;
}

export interface UpdateCategoryInput {
  name?: string;
  sort_order?: number;
}

export interface CreateDishInput {
  category_id: string;
  name: string;
  description?: string;
  price: number;
  image_url?: string;
  is_available?: boolean;
  has_sku?: boolean;
  sort_order?: number;
  skus?: Array<{
    name: string;
    price_delta: number;
    is_available?: boolean;
  }>;
}

export interface UpdateDishInput {
  category_id?: string;
  name?: string;
  description?: string;
  price?: number;
  image_url?: string;
  is_available?: boolean;
  has_sku?: boolean;
  sort_order?: number;
  skus?: Array<{
    name: string;
    price_delta: number;
    is_available?: boolean;
  }>;
}

export default class MenuService extends Service {
  /**
   * Create a new category
   * Requirement 2.1: Support category CRUD operations
   */
  async createCategory(merchantId: string, input: CreateCategoryInput) {
    const category = await this.app.model.Category.create({
      merchant_id: merchantId,
      name: input.name,
      sort_order: input.sort_order ?? 0,
    } as any);

    return modelToCamelCase(category);
  }

  /**
   * Get all categories for a merchant
   * Requirement 2.1: Support category CRUD operations
   */
  async getCategories(merchantId: string) {
    const categories = await this.app.model.Category.findAll({
      where: { merchant_id: merchantId },
      order: [
        ['sort_order', 'ASC'],
        ['created_at', 'ASC'],
      ],
    });

    return modelToCamelCase(categories);
  }

  /**
   * Get a single category by ID
   */
  async getCategoryById(merchantId: string, categoryId: string) {
    const category = await this.app.model.Category.findOne({
      where: {
        id: categoryId,
        merchant_id: merchantId,
      },
    });

    return category;
  }

  /**
   * Update a category
   * Requirement 2.1: Support category CRUD operations with sorting
   */
  async updateCategory(merchantId: string, categoryId: string, input: UpdateCategoryInput) {
    const category: any = await this.getCategoryById(merchantId, categoryId);

    if (!category) {
      return null;
    }

    if (input.name !== undefined) {
      category.name = input.name;
    }
    if (input.sort_order !== undefined) {
      category.sort_order = input.sort_order;
    }

    await category.save();
    return modelToCamelCase(category);
  }

  /**
   * Delete a category
   * Requirement 2.1: Support category CRUD operations
   */
  async deleteCategory(merchantId: string, categoryId: string) {
    const category = await this.getCategoryById(merchantId, categoryId);

    if (!category) {
      return false;
    }

    // Check if there are dishes in this category
    const dishCount = await this.app.model.Dish.count({
      where: {
        category_id: categoryId,
      },
    });

    if (dishCount > 0) {
      return false;
    }

    await category.destroy();
    return true;
  }

  /**
   * Create a new dish
   * Requirement 2.2: Support dish CRUD operations
   */
  async createDish(merchantId: string, input: CreateDishInput) {
    // Verify category belongs to merchant
    const category = await this.getCategoryById(merchantId, input.category_id);
    if (!category) {
      return null;
    }

    const dish = await this.app.model.Dish.create({
      merchant_id: merchantId,
      category_id: input.category_id,
      name: input.name,
      description: input.description ?? null,
      price: input.price,
      image_url: input.image_url ?? null,
      is_available: input.is_available ?? true,
      has_sku: input.has_sku ?? false,
      sort_order: input.sort_order ?? 0,
    } as any);

    // Create SKUs if provided
    if (input.has_sku && input.skus && input.skus.length > 0) {
      await Promise.all(
        input.skus.map(sku =>
          this.app.model.Sku.create({
            dish_id: dish.id,
            name: sku.name,
            price_delta: sku.price_delta,
            is_available: sku.is_available ?? true,
          } as any),
        ),
      );
    }

    return modelToCamelCase(dish);
  }

  /**
   * Get all dishes for a merchant (with optional category filter)
   * Requirement 2.7: Customer menu query should only return available dishes
   */
  async getDishes(merchantId: string, options?: { categoryId?: string; availableOnly?: boolean }) {
    const where: Record<string, unknown> = { merchant_id: merchantId };

    if (options?.categoryId) {
      where.category_id = options.categoryId;
    }

    if (options?.availableOnly) {
      where.is_available = true;
    }

    const dishes = await this.app.model.Dish.findAll({
      where,
      include: [
        {
          model: this.app.model.Sku,
          as: 'skus',
          required: false,
        },
      ],
      order: [
        ['sort_order', 'ASC'],
        ['created_at', 'ASC'],
      ],
    });

    return modelToCamelCase(dishes);
  }

  /**
   * Get a single dish by ID
   */
  async getDishById(merchantId: string, dishId: string) {
    const dish = await this.app.model.Dish.findOne({
      where: {
        id: dishId,
        merchant_id: merchantId,
      },
      include: [
        {
          model: this.app.model.Sku,
          as: 'skus',
          required: false,
        },
      ],
    });

    return dish;
  }

  /**
   * Update a dish
   * Requirement 2.2: Support dish CRUD operations
   */
  async updateDish(merchantId: string, dishId: string, input: UpdateDishInput) {
    const dish: any = await this.getDishById(merchantId, dishId);

    if (!dish) {
      return null;
    }

    // If category_id is being updated, verify it belongs to merchant
    if (input.category_id !== undefined && input.category_id !== dish.category_id) {
      const category = await this.getCategoryById(merchantId, input.category_id);
      if (!category) {
        return null;
      }
      dish.category_id = input.category_id;
    }

    if (input.name !== undefined) {
      dish.name = input.name;
    }
    if (input.description !== undefined) {
      dish.description = input.description;
    }
    if (input.price !== undefined) {
      dish.price = input.price;
    }
    if (input.image_url !== undefined) {
      dish.image_url = input.image_url;
    }
    if (input.is_available !== undefined) {
      dish.is_available = input.is_available;
    }
    if (input.has_sku !== undefined) {
      dish.has_sku = input.has_sku;
    }
    if (input.sort_order !== undefined) {
      dish.sort_order = input.sort_order;
    }

    await dish.save();

    // Update SKUs if provided
    if (input.skus !== undefined) {
      // Delete existing SKUs
      await this.app.model.Sku.destroy({
        where: { dish_id: dishId },
      });

      // Create new SKUs
      if (input.skus.length > 0) {
        await Promise.all(
          input.skus.map(sku =>
            this.app.model.Sku.create({
              dish_id: dishId,
              name: sku.name,
              price_delta: sku.price_delta,
              is_available: sku.is_available ?? true,
            } as any),
          ),
        );
      }
    }

    // Re-fetch dish with SKUs to get updated data
    const updatedDish = await this.getDishById(merchantId, dishId);
    return updatedDish;
  }

  /**
   * Delete a dish
   * Requirement 2.6: Reject deletion if there are associated incomplete orders
   */
  async deleteDish(
    merchantId: string,
    dishId: string,
  ): Promise<{ success: true } | { success: false; code: number; message: string }> {
    const dish = await this.getDishById(merchantId, dishId);

    if (!dish) {
      return {
        success: false,
        code: ErrorCode.NOT_FOUND,
        message: '菜品不存在',
      };
    }

    // Check if there are incomplete orders containing this dish
    // Incomplete orders: 待支付, 已支付, 已接单
    // Use a subquery to find order_items with incomplete orders
    const incompleteOrderItems: any[] = await this.app.model.OrderItem.findAll({
      where: {
        dish_id: dishId,
      },
      attributes: ['order_id'],
    });

    if (incompleteOrderItems.length > 0) {
      const orderIds = incompleteOrderItems.map((item) => item.order_id);

      const incompleteOrderCount = await this.app.model.Order.count({
        where: {
          id: {
            [Op.in]: orderIds,
          },
          status: {
            [Op.in]: ['待支付', '已支付', '已接单'],
          },
        },
      });

      if (incompleteOrderCount > 0) {
        return {
          success: false,
          code: ErrorCode.DISH_HAS_ACTIVE_ORDERS,
          message: '该菜品存在进行中的订单，无法删除',
        };
      }
    }

    await dish.destroy();
    return { success: true };
  }

  /**
   * Validate dish availability for order submission
   * Requirement 3.6, 3.7: Verify all dishes in order are available
   */
  async validateDishAvailability(
    merchantId: string,
    dishIds: string[],
  ): Promise<{ valid: true } | { valid: false; unavailableDishes: string[] }> {
    if (dishIds.length === 0) {
      return { valid: true };
    }

    const dishes: any[] = await this.app.model.Dish.findAll({
      where: {
        id: {
          [Op.in]: dishIds,
        },
        merchant_id: merchantId,
      },
    });

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
}
