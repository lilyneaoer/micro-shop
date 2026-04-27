# CamelCase 转换实现文档

## 概述

本文档记录了将后端 API 返回数据从 snake_case 转换为 camelCase 的实现。

## 背景

数据库字段使用 snake_case 命名（如 `user_id`, `created_at`），但前端 JavaScript/TypeScript 代码通常使用 camelCase 命名（如 `userId`, `createdAt`）。为了提供更好的前端开发体验，我们需要在 API 响应中将所有字段名转换为 camelCase。

## 实现方案

### 1. 创建转换工具函数

创建了 `backend/app/utils/caseConverter.ts` 文件，包含以下函数：

- `snakeToCamel(str: string)`: 将单个 snake_case 字符串转换为 camelCase
- `convertKeysToCamelCase(obj: any)`: 递归转换对象的所有键名为 camelCase
- `modelToCamelCase(model: any)`: 转换 Sequelize 模型实例为 camelCase 对象

### 2. 修改服务层

在所有服务层文件中，在返回数据前使用 `modelToCamelCase()` 进行转换：

#### 修改的服务文件：

- `backend/app/service/menu.ts`
  - `createCategory()` - 返回分类数据
  - `getCategories()` - 返回分类列表
  - `updateCategory()` - 返回更新后的分类
  - `createDish()` - 返回菜品数据
  - `getDishes()` - 返回菜品列表（包含 SKU）
  - `updateDish()` - 返回更新后的菜品

- `backend/app/service/order.ts`
  - `getOrderById()` - 返回订单详情（包含订单项和桌台信息）
  - `getOrders()` - 返回订单列表
  - `getOrdersBySession()` - 返回会话订单列表

- `backend/app/service/stats.ts`
  - `getDashboard()` - 返回仪表盘数据
  - `getRevenueTrend()` - 返回营收趋势数据

- `backend/app/service/table.ts`
  - `listTables()` - 返回桌台列表
  - `getTable()` - 返回单个桌台
  - `createTable()` - 返回创建的桌台
  - `updateTable()` - 返回更新后的桌台
  - `getQrCode()` - 返回二维码信息

### 3. 修改控制器层

在控制器层修改了直接构造的响应对象，确保使用 camelCase：

- `backend/app/controller/menu.ts`
  - `uploadDishImage()` - 返回 `imageUrl` 而不是 `image_url`

- `backend/app/controller/order.ts`
  - `create()` - 错误响应中的 `unavailableDishes` 而不是 `unavailable_dishes`
  - `refund()` - 返回 `refundId` 而不是 `refund_id`

- `backend/app/controller/payment.ts`
  - `prepay()` - 返回 `prepayId` 和 `paymentParams` 而不是 `prepay_id` 和 `payment_params`

### 4. 保持输入参数兼容性

控制器层继续支持接收 snake_case 和 camelCase 两种格式的输入参数，确保向后兼容：

```typescript
// 示例：同时支持两种格式
const { category_id, categoryId } = ctx.request.body;
const finalCategoryId = categoryId || category_id;
```

## 转换的字段示例

### 常见字段转换：

| snake_case            | camelCase          |
| --------------------- | ------------------ |
| user_id               | userId             |
| merchant_id           | merchantId         |
| table_id              | tableId            |
| order_id              | orderId            |
| dish_id               | dishId             |
| sku_id                | skuId              |
| category_id           | categoryId         |
| session_id            | sessionId          |
| created_at            | createdAt          |
| updated_at            | updatedAt          |
| paid_at               | paidAt             |
| expires_at            | expiresAt          |
| table_no              | tableNo            |
| seat_count            | seatCount          |
| qr_token              | qrToken            |
| qr_url                | qrUrl              |
| is_active             | isActive           |
| is_available          | isAvailable        |
| has_sku               | hasSku             |
| sort_order            | sortOrder          |
| image_url             | imageUrl           |
| total_amount          | totalAmount        |
| unit_price            | unitPrice          |
| dish_name             | dishName           |
| sku_name              | skuName            |
| order_no              | orderNo            |
| customer_remark       | customerRemark     |
| price_delta           | priceDelta         |
| start_date            | startDate          |
| end_date              | endDate            |
| order_count           | orderCount         |
| today_revenue         | todayRevenue       |
| today_order_count     | todayOrderCount    |
| today_avg_order_value | todayAvgOrderValue |
| month_revenue         | monthRevenue       |
| prepay_id             | prepayId           |
| payment_params        | paymentParams      |
| refund_id             | refundId           |
| unavailable_dishes    | unavailableDishes  |

## 测试

创建了完整的单元测试 `backend/test/utils/caseConverter.test.ts`，覆盖：

- 基本字符串转换
- 对象键名转换
- 嵌套对象转换
- 数组转换
- Sequelize 模型转换
- 边界情况（null, undefined, 原始类型）

所有测试均通过 ✓

## 注意事项

1. **数据库层不变**：数据库表和字段仍然使用 snake_case，只在 API 响应时转换
2. **Sequelize 配置**：模型配置保持 `underscored: true`
3. **向后兼容**：输入参数同时支持 snake_case 和 camelCase
4. **递归转换**：自动处理嵌套对象和数组
5. **类型安全**：TypeScript 类型检查通过

## 影响范围

### 已转换的 API 端点：

- ✅ 所有分类相关接口 (`/api/categories`)
- ✅ 所有菜品相关接口 (`/api/dishes`)
- ✅ 所有订单相关接口 (`/api/orders`)
- ✅ 所有桌台相关接口 (`/api/tables`)
- ✅ 所有统计相关接口 (`/api/stats`)
- ✅ 支付相关接口 (`/api/payments`)
- ✅ 会话相关接口 (`/api/sessions`)

### 未修改的部分：

- 认证接口 (`/api/auth`) - 已经使用 camelCase
- WebSocket 推送 - 需要单独检查和修改（如果需要）

## 后续工作

1. 更新前端代码以使用新的 camelCase 字段名
2. 更新 API 文档
3. 考虑是否需要转换 WebSocket 推送的数据格式
4. 运行集成测试确保所有功能正常
