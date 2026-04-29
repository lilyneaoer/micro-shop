# Task 13: 修复菜品 SKU 保存功能

## 问题描述

菜品的 SKU（规格）数据没有正常保存到数据库。前端已经正确发送 SKU 数据，但后端没有处理。

## 根本原因

1. 后端控制器 `menu.ts` 的 `createDish` 和 `updateDish` 方法没有接收和传递 SKU 数据
2. Dish 和 SKU 模型之间缺少 Sequelize 关联配置
3. `getDishes` 和 `getDishById` 方法没有包含 SKU 数据

## 修复内容

### 1. 更新控制器 (`backend/app/controller/menu.ts`)

#### `createDish` 方法

- 添加了 `skus` 参数的接收（支持 camelCase 和 snake_case）
- 将前端的 camelCase 格式转换为后端的 snake_case 格式：
  - `priceDelta` → `price_delta`
  - `isAvailable` → `is_available`
- 将 SKU 数据传递给服务层

#### `updateDish` 方法

- 添加了 `skus` 参数的接收（支持 camelCase 和 snake_case）
- 将前端的 camelCase 格式转换为后端的 snake_case 格式
- 将 SKU 数据传递给服务层

### 2. 更新服务层 (`backend/app/service/menu.ts`)

#### 接口定义

- `CreateDishInput` 接口添加了 `skus` 字段
- `UpdateDishInput` 接口添加了 `skus` 字段
- 修复了重复的接口定义

#### `createDish` 方法

- 创建菜品后，如果 `has_sku` 为 true 且提供了 SKU 数据，则创建对应的 SKU 记录

#### `updateDish` 方法

- 如果提供了 SKU 数据，先删除旧的 SKU 记录，再创建新的 SKU 记录
- 这种方式简单且能保证数据一致性

#### `getDishes` 方法

- 添加了 Sequelize `include` 配置，查询时包含关联的 SKU 数据
- 使用 `required: false` 确保没有 SKU 的菜品也能正常返回

#### `getDishById` 方法

- 添加了 Sequelize `include` 配置，查询时包含关联的 SKU 数据

### 3. 配置模型关联 (`backend/app.ts`)

在 `willReady` 生命周期钩子中添加了 Dish 和 SKU 的关联配置：

```typescript
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
```

## 数据流程

### 创建菜品

1. 前端发送请求：

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

2. 控制器转换为 snake_case：

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

3. 服务层创建菜品和 SKU 记录

4. 响应拦截器将 snake_case 转换回 camelCase 返回给前端

### 更新菜品

1. 前端发送更新请求（包含完整的 SKU 列表）
2. 控制器转换格式
3. 服务层删除旧的 SKU 记录，创建新的 SKU 记录
4. 返回更新后的菜品数据

### 查询菜品

1. 服务层使用 Sequelize `include` 查询菜品及其关联的 SKU
2. 响应拦截器将 snake_case 转换为 camelCase
3. 前端接收到包含 SKU 数据的菜品列表

## 测试建议

1. **创建带 SKU 的菜品**
   - 创建一个新菜品，启用规格，添加多个 SKU
   - 验证数据库中 `dishes` 和 `skus` 表都有对应记录

2. **更新 SKU**
   - 编辑已有菜品，修改 SKU 列表（增加、删除、修改）
   - 验证数据库中 SKU 记录正确更新

3. **查询菜品**
   - 获取菜品列表，验证返回的数据包含 SKU 信息
   - 验证前端页面正确显示 SKU 标签

4. **禁用 SKU**
   - 将菜品的 `hasSku` 改为 false
   - 验证旧的 SKU 记录是否需要清理（当前实现不会自动删除）

## 注意事项

1. **命名转换**：前端使用 camelCase，后端数据库使用 snake_case，控制器负责转换

2. **SKU 更新策略**：采用"先删后建"的方式，简单但会改变 SKU 的 ID。如果订单中引用了 SKU ID，需要考虑级联更新

3. **数据一致性**：当 `has_sku` 为 false 时，现有实现不会自动删除旧的 SKU 记录。如果需要，可以在 `updateDish` 中添加清理逻辑

4. **前端响应拦截器**：依赖 `web-admin/src/api/index.ts` 中的响应拦截器自动转换 snake_case 为 camelCase

## 相关文件

- `backend/app/controller/menu.ts` - 控制器层，处理 HTTP 请求
- `backend/app/service/menu.ts` - 服务层，业务逻辑
- `backend/app/model/dish.ts` - Dish 模型定义
- `backend/app/model/sku.ts` - SKU 模型定义
- `backend/app.ts` - 应用启动配置，模型关联定义
- `web-admin/src/views/menu/DishManagement.vue` - 前端菜品管理组件
