# 图片 URL 显示问题修复

## 问题描述

customer-app 的 menu 页面（`pages/menu/index`）中，菜品图片未能正常显示。

**问题路径示例：** `/public/uploads/dishes/f424be70-8d5b-4878-bb90-abb840ecdb36.jpg`

## 根本原因

后端 API 返回的图片路径是相对路径（如 `/public/uploads/dishes/xxx.jpg`），但小程序环境无法直接访问相对路径的资源。需要将相对路径转换为完整的 URL（包含域名和端口）。

### 问题分析

1. **后端返回的数据格式：**

   ```json
   {
     "id": "xxx",
     "name": "菜品名称",
     "imageUrl": "/public/uploads/dishes/f424be70-8d5b-4878-bb90-abb840ecdb36.jpg"
   }
   ```

2. **前端需要的格式：**

   ```json
   {
     "id": "xxx",
     "name": "菜品名称",
     "imageUrl": "http://localhost:7001/public/uploads/dishes/f424be70-8d5b-4878-bb90-abb840ecdb36.jpg"
   }
   ```

3. **小程序 image 组件的要求：**
   - 必须使用完整的 URL（包含协议、域名、端口）
   - 相对路径无法正确加载

## 解决方案

### 1. 创建图片 URL 处理工具

创建了 `customer-app/src/utils/image.ts` 工具文件：

```typescript
/**
 * 转换图片 URL 为完整路径
 * 如果是相对路径，则拼接 baseURL
 * 如果已经是完整 URL，则直接返回
 */
export function normalizeImageUrl(imageUrl?: string): string | undefined {
  if (!imageUrl) return undefined;

  // 如果已经是完整 URL，直接返回
  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
    return imageUrl;
  }

  // 如果是相对路径，拼接 baseURL
  const baseURL =
    process.env.NODE_ENV === "development"
      ? "http://localhost:7001"
      : "http://localhost:7001";

  return `${baseURL}${imageUrl}`;
}
```

### 2. 更新菜单页面

在 `customer-app/src/pages/menu/index.vue` 中：

1. **导入工具函数：**

   ```typescript
   import { normalizeImageUrl } from "../../utils/image";
   ```

2. **在加载菜品时转换图片 URL：**

   ```typescript
   async function loadDishes() {
     try {
       loading.value = true;
       const response = await get<Dish[]>("/api/dishes");
       if (response.code === 0 && response.data) {
         // 只显示上架的菜品，并转换图片 URL
         dishes.value = response.data
           .filter((dish) => dish.isAvailable)
           .map((dish) => ({
             ...dish,
             imageUrl: normalizeImageUrl(dish.imageUrl),
           }));

         loadCategoriesFromDishes();
       }
     } catch (error) {
       console.error("加载菜品失败:", error);
       Taro.showToast({
         title: "加载菜品失败",
         icon: "none",
       });
     } finally {
       loading.value = false;
     }
   }
   ```

## 修改的文件

1. **新增文件：**

   - `customer-app/src/utils/image.ts` - 图片 URL 处理工具

2. **修改文件：**
   - `customer-app/src/pages/menu/index.vue` - 菜单页面，添加图片 URL 转换逻辑

## 测试验证

1. **编译验证：**

   ```bash
   cd customer-app
   npm run build:weapp
   ```

   编译成功，无错误。

2. **功能验证：**
   - 菜品图片路径从相对路径转换为完整 URL
   - 开发环境：`http://localhost:7001/public/uploads/dishes/xxx.jpg`
   - 生产环境：`http://localhost:7001/public/uploads/dishes/xxx.jpg`

## 影响范围

### 已修复的页面

- ✅ `customer-app/src/pages/menu/index.vue` - 菜单页面

### 无需修复的页面

- ✅ `customer-app/src/pages/cart/index.vue` - 购物车页面
  - 购物车的图片 URL 来自菜单页面添加时传入的数据
  - 已经在菜单页面转换过，无需额外处理

### 其他应用

- ✅ `merchant-app` - 商户端应用
  - 未使用菜品图片显示功能，无需修复

## 后续优化建议

1. **后端优化（可选）：**

   - 考虑在后端直接返回完整的图片 URL
   - 在 `backend/app/service/menu.ts` 或 `backend/app/controller/menu.ts` 中处理
   - 优点：前端无需额外处理，减少客户端逻辑

2. **图片 CDN（生产环境）：**

   - 生产环境应使用 CDN 或对象存储服务（如阿里云 OSS、AWS S3）
   - 更新 `customer-app/src/utils/image.ts` 中的生产环境 baseURL

3. **图片加载优化：**
   - 添加图片加载失败的占位图
   - 添加图片懒加载功能
   - 添加图片加载进度提示

## 相关文档

- 后端图片上传：`backend/app/controller/menu.ts` - `uploadDishImage` 方法
- 后端图片路径修复：`backend/database/migrations/20260426000001-fix-dish-image-urls.js`
- API 配置：`customer-app/src/api/index.ts`
