# 问题修复记录

## 菜品图片无法显示问题

### 问题描述

新增菜品后，图片上传成功但前端页面无法显示图片。

### 问题原因

1. 后端返回的图片路径缺少 `/public` 前缀
2. 前端 Vite 配置未代理 `/public` 路径到后端服务器

### 解决方案

#### 1. 后端修改

**文件：** `backend/app/controller/menu.ts`

修改图片 URL 生成逻辑：

```typescript
// 修改前
const imageUrl = `/uploads/dishes/${filename}`;

// 修改后
const imageUrl = `/public/uploads/dishes/${filename}`;
```

#### 2. 数据库修复

更新已有菜品的图片路径：

```sql
UPDATE dishes
SET image_url = '/public' || image_url
WHERE image_url IS NOT NULL
  AND image_url NOT LIKE '/public%'
  AND image_url LIKE '/uploads/%';
```

**迁移文件：** `backend/database/migrations/20260426000001-fix-dish-image-urls.js`

#### 3. 前端配置

**文件：** `web-admin/vite.config.ts`

添加 `/public` 路径代理：

```typescript
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:7001',
      changeOrigin: true,
    },
    '/public': {  // 新增
      target: 'http://localhost:7001',
      changeOrigin: true,
    },
    '/socket.io': {
      target: 'http://localhost:7001',
      changeOrigin: true,
      ws: true,
    },
  },
}
```

### 验证步骤

1. **重启后端服务**（如果已运行）

   ```bash
   cd backend
   npm run dev
   ```

2. **重启前端服务**（必须重启以加载新配置）

   ```bash
   cd web-admin
   npm run dev
   ```

3. **测试图片访问**

   - 后端直接访问：http://localhost:7001/public/uploads/dishes/xxx.jpg
   - 前端代理访问：http://localhost:5173/public/uploads/dishes/xxx.jpg

4. **测试菜品图片显示**
   - 登录管理后台
   - 进入菜单管理 → 菜品列表
   - 查看已有菜品的图片是否正常显示
   - 新增菜品并上传图片，验证是否正常显示

### 注意事项

- ⚠️ **必须重启前端开发服务器**，Vite 配置修改后不会热更新
- ✅ 图片存储路径：`backend/app/public/uploads/dishes/`
- ✅ 图片访问路径：`/public/uploads/dishes/xxx.jpg`
- ✅ 图片会自动压缩到 500KB 以内

### 相关文件

- `backend/app/controller/menu.ts` - 图片上传控制器
- `backend/database/migrations/20260426000001-fix-dish-image-urls.js` - 数据库迁移
- `web-admin/vite.config.ts` - 前端代理配置

---

**修复日期：** 2026-04-26  
**修复人员：** Kiro AI Assistant

## 菜品 SKU 无法保存问题

### 问题描述

在菜品管理页面创建或编辑菜品时，启用规格（SKU）并添加规格项后，保存时 SKU 数据没有存入数据库。

### 问题原因

1. 后端控制器 `createDish` 和 `updateDish` 方法没有接收和传递 SKU 数据
2. Dish 和 SKU 模型之间缺少 Sequelize 关联配置
3. `getDishes` 和 `getDishById` 方法没有包含 SKU 数据

### 解决方案

#### 1. 控制器层修改

**文件：** `backend/app/controller/menu.ts`

在 `createDish` 和 `updateDish` 方法中：

1. 接收 `skus` 参数（支持 camelCase 和 snake_case）
2. 将前端的 camelCase 转换为后端的 snake_case：
   - `priceDelta` → `price_delta`
   - `isAvailable` → `is_available`
3. 将 SKU 数据传递给服务层

```typescript
// 转换 SKU 数据格式（camelCase -> snake_case）
const finalSkus = skus?.map((sku) => ({
  name: sku.name,
  price_delta: sku.priceDelta ?? sku.price_delta ?? 0,
  is_available: sku.isAvailable ?? sku.is_available ?? true,
}));

const dish = await ctx.service.menu.createDish(merchantId, {
  // ... 其他字段
  skus: finalSkus,
});
```

#### 2. 服务层修改

**文件：** `backend/app/service/menu.ts`

**接口定义：**

```typescript
export interface CreateDishInput {
  // ... 其他字段
  skus?: Array<{
    name: string;
    price_delta: number;
    is_available?: boolean;
  }>;
}

export interface UpdateDishInput {
  // ... 其他字段
  skus?: Array<{
    name: string;
    price_delta: number;
    is_available?: boolean;
  }>;
}
```

**createDish 方法：**

```typescript
// 创建菜品后，创建 SKU
if (input.has_sku && input.skus && input.skus.length > 0) {
  await Promise.all(
    input.skus.map((sku) =>
      this.app.model.Sku.create({
        dish_id: dish.id,
        name: sku.name,
        price_delta: sku.price_delta,
        is_available: sku.is_available ?? true,
      } as any),
    ),
  );
}
```

**updateDish 方法：**

```typescript
// 更新 SKU（先删后建）
if (input.skus !== undefined) {
  // 删除旧的 SKU
  await this.app.model.Sku.destroy({
    where: { dish_id: dishId },
  });

  // 创建新的 SKU
  if (input.skus.length > 0) {
    await Promise.all(
      input.skus.map((sku) =>
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
```

**getDishes 和 getDishById 方法：**

添加 Sequelize `include` 配置：

```typescript
const dishes = await this.app.model.Dish.findAll({
  where,
  include: [
    {
      model: this.app.model.Sku,
      as: "skus",
      required: false,
    },
  ],
  order: [
    ["sort_order", "ASC"],
    ["created_at", "ASC"],
  ],
});
```

#### 3. 模型关联配置

**文件：** `backend/app.ts`

在 `willReady` 生命周期钩子中添加模型关联：

```typescript
async willReady() {
  // 定义模型关联
  const { Dish, Sku } = this.app.model;

  // Dish has many SKUs
  Dish.hasMany(Sku, {
    foreignKey: 'dish_id',
    as: 'skus',
  });

  // SKU belongs to Dish
  Sku.belongsTo(Dish, {
    foreignKey: 'dish_id',
    as: 'dish',
  });

  // ... 其他代码
}
```

### 数据流程

#### 创建菜品

1. **前端发送：**

   ```json
   {
     "name": "宫保鸡丁",
     "categoryId": "xxx",
     "price": 2800,
     "hasSku": true,
     "skus": [
       { "name": "小份", "priceDelta": -500 },
       { "name": "大份", "priceDelta": 500 }
     ]
   }
   ```

2. **控制器转换为 snake_case：**

   ```typescript
   {
     category_id: "xxx",
     name: "宫保鸡丁",
     price: 2800,
     has_sku: true,
     skus: [
       { name: "小份", price_delta: -500, is_available: true },
       { name: "大份", price_delta: 500, is_available: true }
     ]
   }
   ```

3. **服务层创建菜品和 SKU 记录**

4. **响应拦截器转换回 camelCase 返回前端**

#### 更新菜品

1. 前端发送更新请求（包含完整的 SKU 列表）
2. 控制器转换格式
3. 服务层删除旧的 SKU 记录，创建新的 SKU 记录
4. 返回更新后的菜品数据

#### 查询菜品

1. 服务层使用 Sequelize `include` 查询菜品及其关联的 SKU
2. 响应拦截器将 snake_case 转换为 camelCase
3. 前端接收到包含 SKU 数据的菜品列表

### 验证步骤

1. **重启后端服务**

   ```bash
   cd backend
   npm run dev
   ```

2. **测试创建带 SKU 的菜品**

   - 登录管理后台
   - 进入菜单管理 → 菜品管理
   - 点击"新增菜品"
   - 启用规格开关
   - 添加多个规格（如：小份、中份、大份）
   - 设置价格差（如：-5 元、0 元、+5 元）
   - 保存菜品

3. **验证数据库**

   ```sql
   -- 查看菜品
   SELECT * FROM dishes WHERE name = '测试菜品';

   -- 查看 SKU
   SELECT * FROM skus WHERE dish_id = '菜品ID';
   ```

4. **测试更新 SKU**

   - 编辑已有菜品
   - 修改 SKU 列表（增加、删除、修改）
   - 保存并验证数据库

5. **测试查询菜品**
   - 刷新菜品列表
   - 验证带 SKU 的菜品显示"有规格"标签
   - 编辑菜品，验证 SKU 数据正确回显

### 注意事项

- ✅ **命名转换**：前端使用 camelCase，后端数据库使用 snake_case，控制器负责转换
- ✅ **SKU 更新策略**：采用"先删后建"的方式，简单但会改变 SKU 的 ID
- ⚠️ **数据一致性**：当 `has_sku` 改为 false 时，现有实现不会自动删除旧的 SKU 记录
- ✅ **前端响应拦截器**：依赖 `web-admin/src/api/index.ts` 自动转换 snake_case 为 camelCase

### 相关文件

- `backend/app/controller/menu.ts` - 控制器层，处理 HTTP 请求
- `backend/app/service/menu.ts` - 服务层，业务逻辑
- `backend/app/model/dish.ts` - Dish 模型定义
- `backend/app/model/sku.ts` - SKU 模型定义
- `backend/app.ts` - 应用启动配置，模型关联定义
- `web-admin/src/views/menu/DishManagement.vue` - 前端菜品管理组件
- `backend/TASK13_SKU_IMPLEMENTATION.md` - 详细实现文档

---

**修复日期：** 2026-04-26  
**修复人员：** Kiro AI Assistant
