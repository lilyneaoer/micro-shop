import { Controller } from 'egg';
import { formatResponse, formatError, ErrorCode } from '../utils/response';
import sharp from 'sharp';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

/**
 * Menu management controller
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7
 */
export default class MenuController extends Controller {
  /**
   * GET /api/categories
   * Get all categories for the merchant
   * Requirement 2.1: Support category CRUD operations
   */
  async getCategories() {
    const { ctx } = this;
    const merchantId = ctx.state.merchantId;

    const categories = await ctx.service.menu.getCategories(merchantId);

    ctx.status = 200;
    ctx.body = formatResponse(categories);
  }

  /**
   * POST /api/categories
   * Create a new category
   * Requirement 2.1: Support category CRUD operations
   */
  async createCategory() {
    const { ctx } = this;
    const merchantId = ctx.state.merchantId;

    const { name, sort_order, sortOrder } = ctx.request.body as {
      name?: string;
      sort_order?: number;
      sortOrder?: number;
    };

    // Support both snake_case and camelCase for sort_order
    const sortOrderValue = sort_order ?? sortOrder;

    // Validation
    if (!name || typeof name !== 'string' || name.trim() === '') {
      ctx.status = 400;
      ctx.body = formatError(ErrorCode.VALIDATION_ERROR, '分类名称不能为空');
      return;
    }

    if (sortOrderValue !== undefined && (typeof sortOrderValue !== 'number' || sortOrderValue < 0)) {
      ctx.status = 400;
      ctx.body = formatError(ErrorCode.VALIDATION_ERROR, '排序值必须为非负整数');
      return;
    }

    const category = await ctx.service.menu.createCategory(merchantId, {
      name: name.trim(),
      sort_order: sortOrderValue,
    });

    ctx.status = 201;
    ctx.body = formatResponse(category, '分类创建成功');
  }

  /**
   * PUT /api/categories/:id
   * Update a category
   * Requirement 2.1: Support category CRUD operations with sorting
   */
  async updateCategory() {
    const { ctx } = this;
    const merchantId = ctx.state.merchantId;
    const categoryId = ctx.params.id;

    const { name, sort_order, sortOrder } = ctx.request.body as {
      name?: string;
      sort_order?: number;
      sortOrder?: number;
    };

    // Support both snake_case and camelCase for sort_order
    const sortOrderValue = sort_order ?? sortOrder;

    // Validation
    if (name !== undefined && (typeof name !== 'string' || name.trim() === '')) {
      ctx.status = 400;
      ctx.body = formatError(ErrorCode.VALIDATION_ERROR, '分类名称不能为空');
      return;
    }

    if (sortOrderValue !== undefined && (typeof sortOrderValue !== 'number' || sortOrderValue < 0)) {
      ctx.status = 400;
      ctx.body = formatError(ErrorCode.VALIDATION_ERROR, '排序值必须为非负整数');
      return;
    }

    const category = await ctx.service.menu.updateCategory(merchantId, categoryId, {
      name: name?.trim(),
      sort_order: sortOrderValue,
    });

    if (!category) {
      ctx.status = 404;
      ctx.body = formatError(ErrorCode.NOT_FOUND, '分类不存在');
      return;
    }

    ctx.status = 200;
    ctx.body = formatResponse(category, '分类更新成功');
  }

  /**
   * DELETE /api/categories/:id
   * Delete a category
   * Requirement 2.1: Support category CRUD operations
   */
  async deleteCategory() {
    const { ctx } = this;
    const merchantId = ctx.state.merchantId;
    const categoryId = ctx.params.id;

    const success = await ctx.service.menu.deleteCategory(merchantId, categoryId);

    if (!success) {
      ctx.status = 422;
      ctx.body = formatError(ErrorCode.VALIDATION_ERROR, '分类不存在或包含菜品，无法删除');
      return;
    }

    ctx.status = 200;
    ctx.body = formatResponse(null, '分类删除成功');
  }

  /**
   * GET /api/dishes
   * Get all dishes for the merchant
   * Requirement 2.7: Customer menu query should only return available dishes
   */
  async getDishes() {
    const { ctx } = this;

    // Check authentication type
    const isCustomerRequest = !!ctx.state.sessionId;
    const isMerchantRequest = !!ctx.state.merchantId;

    // If no authentication, reject the request
    if (!isCustomerRequest && !isMerchantRequest) {
      ctx.status = 401;
      ctx.body = formatError(ErrorCode.UNAUTHORIZED, '未授权，请先登录');
      return;
    }

    const merchantId = ctx.state.merchantId;
    // 支持 camelCase 和 snake_case 两种参数格式
    const { category_id, categoryId } = ctx.query as { category_id?: string; categoryId?: string };
    const finalCategoryId = categoryId || category_id;

    const dishes = await ctx.service.menu.getDishes(merchantId, {
      categoryId: finalCategoryId,
      availableOnly: isCustomerRequest, // Only return available dishes for customers
    });

    ctx.status = 200;
    ctx.body = formatResponse(dishes);
  }

  /**
   * POST /api/dishes
   * Create a new dish
   * Requirement 2.2: Support dish CRUD operations
   */
  async createDish() {
    const { ctx } = this;
    const merchantId = ctx.state.merchantId;

    // 支持 camelCase 和 snake_case 两种参数格式
    const {
      category_id,
      categoryId,
      name,
      description,
      price,
      image_url,
      imageUrl,
      is_available,
      isAvailable,
      has_sku,
      hasSku,
      sort_order,
      sortOrder,
      skus,
    } = ctx.request.body as {
      category_id?: string;
      categoryId?: string;
      name?: string;
      description?: string;
      price?: number;
      image_url?: string;
      imageUrl?: string;
      is_available?: boolean;
      isAvailable?: boolean;
      has_sku?: boolean;
      hasSku?: boolean;
      sort_order?: number;
      sortOrder?: number;
      skus?: Array<{
        name: string;
        priceDelta?: number;
        price_delta?: number;
        isAvailable?: boolean;
        is_available?: boolean;
      }>;
    };

    // 优先使用 camelCase，fallback 到 snake_case
    const finalCategoryId = categoryId || category_id;
    const finalImageUrl = imageUrl || image_url;
    const finalIsAvailable = isAvailable !== undefined ? isAvailable : is_available;
    const finalHasSku = hasSku !== undefined ? hasSku : has_sku;
    const finalSortOrder = sortOrder !== undefined ? sortOrder : sort_order;

    // Validation
    if (!finalCategoryId || typeof finalCategoryId !== 'string') {
      ctx.status = 400;
      ctx.body = formatError(ErrorCode.VALIDATION_ERROR, '分类ID不能为空');
      return;
    }

    if (!name || typeof name !== 'string' || name.trim() === '') {
      ctx.status = 400;
      ctx.body = formatError(ErrorCode.VALIDATION_ERROR, '菜品名称不能为空');
      return;
    }

    if (price === undefined || typeof price !== 'number' || price < 0) {
      ctx.status = 400;
      ctx.body = formatError(ErrorCode.VALIDATION_ERROR, '价格必须为非负整数（单位：分）');
      return;
    }

    if (finalSortOrder !== undefined && (typeof finalSortOrder !== 'number' || finalSortOrder < 0)) {
      ctx.status = 400;
      ctx.body = formatError(ErrorCode.VALIDATION_ERROR, '排序值必须为非负整数');
      return;
    }

    // 转换 SKU 数据格式（camelCase -> snake_case）
    const finalSkus = skus?.map(sku => ({
      name: sku.name,
      price_delta: sku.priceDelta ?? sku.price_delta ?? 0,
      is_available: sku.isAvailable ?? sku.is_available ?? true,
    }));

    const dish = await ctx.service.menu.createDish(merchantId, {
      category_id: finalCategoryId,
      name: name.trim(),
      description,
      price,
      image_url: finalImageUrl,
      is_available: finalIsAvailable,
      has_sku: finalHasSku,
      sort_order: finalSortOrder,
      skus: finalSkus,
    });

    if (!dish) {
      ctx.status = 404;
      ctx.body = formatError(ErrorCode.NOT_FOUND, '分类不存在');
      return;
    }

    ctx.status = 201;
    ctx.body = formatResponse(dish, '菜品创建成功');
  }

  /**
   * PUT /api/dishes/:id
   * Update a dish
   * Requirement 2.2: Support dish CRUD operations
   */
  async updateDish() {
    const { ctx } = this;
    const merchantId = ctx.state.merchantId;
    const dishId = ctx.params.id;

    // 支持 camelCase 和 snake_case 两种参数格式
    const {
      category_id,
      categoryId,
      name,
      description,
      price,
      image_url,
      imageUrl,
      is_available,
      isAvailable,
      has_sku,
      hasSku,
      sort_order,
      sortOrder,
      skus,
    } = ctx.request.body as {
      category_id?: string;
      categoryId?: string;
      name?: string;
      description?: string;
      price?: number;
      image_url?: string;
      imageUrl?: string;
      is_available?: boolean;
      isAvailable?: boolean;
      has_sku?: boolean;
      hasSku?: boolean;
      sort_order?: number;
      sortOrder?: number;
      skus?: Array<{
        name: string;
        priceDelta?: number;
        price_delta?: number;
        isAvailable?: boolean;
        is_available?: boolean;
      }>;
    };

    // 优先使用 camelCase，fallback 到 snake_case
    const finalCategoryId = categoryId || category_id;
    const finalImageUrl = imageUrl || image_url;
    const finalIsAvailable = isAvailable !== undefined ? isAvailable : is_available;
    const finalHasSku = hasSku !== undefined ? hasSku : has_sku;
    const finalSortOrder = sortOrder !== undefined ? sortOrder : sort_order;

    // Validation
    if (name !== undefined && (typeof name !== 'string' || name.trim() === '')) {
      ctx.status = 400;
      ctx.body = formatError(ErrorCode.VALIDATION_ERROR, '菜品名称不能为空');
      return;
    }

    if (price !== undefined && (typeof price !== 'number' || price < 0)) {
      ctx.status = 400;
      ctx.body = formatError(ErrorCode.VALIDATION_ERROR, '价格必须为非负整数（单位：分）');
      return;
    }

    if (finalSortOrder !== undefined && (typeof finalSortOrder !== 'number' || finalSortOrder < 0)) {
      ctx.status = 400;
      ctx.body = formatError(ErrorCode.VALIDATION_ERROR, '排序值必须为非负整数');
      return;
    }

    // 转换 SKU 数据格式（camelCase -> snake_case）
    const finalSkus = skus?.map(sku => ({
      name: sku.name,
      price_delta: sku.priceDelta ?? sku.price_delta ?? 0,
      is_available: sku.isAvailable ?? sku.is_available ?? true,
    }));

    const dish = await ctx.service.menu.updateDish(merchantId, dishId, {
      category_id: finalCategoryId,
      name: name?.trim(),
      description,
      price,
      image_url: finalImageUrl,
      is_available: finalIsAvailable,
      has_sku: finalHasSku,
      sort_order: finalSortOrder,
      skus: finalSkus,
    });

    if (!dish) {
      ctx.status = 404;
      ctx.body = formatError(ErrorCode.NOT_FOUND, '菜品或分类不存在');
      return;
    }

    ctx.status = 200;
    ctx.body = formatResponse(dish, '菜品更新成功');
  }

  /**
   * DELETE /api/dishes/:id
   * Delete a dish
   * Requirement 2.6: Reject deletion if there are associated incomplete orders
   */
  async deleteDish() {
    const { ctx } = this;
    const merchantId = ctx.state.merchantId;
    const dishId = ctx.params.id;

    const result = await ctx.service.menu.deleteDish(merchantId, dishId);

    if (!result.success) {
      if (result.code === ErrorCode.DISH_HAS_ACTIVE_ORDERS) {
        ctx.status = 422;
      } else {
        ctx.status = 404;
      }
      ctx.body = formatError(result.code, result.message);
      return;
    }

    ctx.status = 200;
    ctx.body = formatResponse(null, '菜品删除成功');
  }

  /**
   * POST /api/dishes/:id/image
   * Upload dish image with compression
   * Requirement 2.5: Compress image to max 500KB and upload to object storage
   */
  async uploadDishImage() {
    const { ctx } = this;
    const merchantId = ctx.state.merchantId;
    const dishId = ctx.params.id;

    // Verify dish exists and belongs to merchant
    const dish = await ctx.service.menu.getDishById(merchantId, dishId);
    if (!dish) {
      ctx.status = 404;
      ctx.body = formatError(ErrorCode.NOT_FOUND, '菜品不存在');
      return;
    }

    // Get uploaded file from multipart form
    const stream = await ctx.getFileStream();

    if (!stream) {
      ctx.status = 400;
      ctx.body = formatError(ErrorCode.VALIDATION_ERROR, '未上传文件');
      return;
    }

    try {
      // Read file into buffer
      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }
      const buffer = Buffer.concat(chunks);

      // Compress image using Sharp to max 500KB
      let quality = 90;
      let compressedBuffer = buffer;
      const maxSizeBytes = 500 * 1024; // 500KB

      // Try to compress with decreasing quality until size is acceptable
      while (compressedBuffer.length > maxSizeBytes && quality > 10) {
        compressedBuffer = Buffer.from(await sharp(buffer).jpeg({ quality }).toBuffer());

        if (compressedBuffer.length > maxSizeBytes) {
          quality -= 10;
        }
      }

      // If still too large after max compression, reject
      if (compressedBuffer.length > maxSizeBytes) {
        ctx.status = 400;
        ctx.body = formatError(ErrorCode.VALIDATION_ERROR, '图片文件过大，无法压缩至 500KB 以内');
        return;
      }

      // Save to local storage (in production, this would upload to object storage like S3/OSS)
      const uploadDir = path.join(this.app.baseDir, 'app/public/uploads/dishes');

      // Ensure directory exists
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const filename = `${uuidv4()}.jpg`;
      const filepath = path.join(uploadDir, filename);

      fs.writeFileSync(filepath, compressedBuffer);

      // Generate URL (in production, this would be the object storage URL)
      const imageUrl = `/public/uploads/dishes/${filename}`;

      // Update dish with new image URL
      await ctx.service.menu.updateDish(merchantId, dishId, {
        image_url: imageUrl,
      });

      ctx.status = 200;
      ctx.body = formatResponse({ image_url: imageUrl }, '图片上传成功');
    } catch (error) {
      ctx.logger.error('Image upload failed:', error);
      ctx.status = 500;
      ctx.body = formatError(ErrorCode.INTERNAL_SERVER_ERROR, '图片上传失败');
    }
  }
}
