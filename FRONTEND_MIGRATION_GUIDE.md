# 前端迁移指南 - API 字段名变更

## 概述

后端 API 返回的所有字段名已从 snake_case 改为 camelCase。本指南帮助前端开发者快速适配这一变更。

## 变更影响

### ✅ 不受影响的部分

- API 端点路径（URL）保持不变
- HTTP 方法保持不变
- 请求参数可以继续使用 snake_case 或 camelCase（向后兼容）
- 响应状态码保持不变
- 错误码保持不变

### ⚠️ 需要修改的部分

- **所有响应数据的字段名**从 snake_case 改为 camelCase
- TypeScript 接口定义需要更新
- 访问响应数据的代码需要更新

## 快速迁移步骤

### 1. 更新 TypeScript 接口定义

**之前：**

```typescript
interface Category {
  id: string;
  merchant_id: string;
  name: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}
```

**现在：**

```typescript
interface Category {
  id: string;
  merchantId: string;
  name: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}
```

### 2. 更新数据访问代码

**之前：**

```typescript
const categories = await api.get("/api/categories");
categories.data.forEach((cat) => {
  console.log(cat.sort_order); // snake_case
  console.log(cat.created_at);
});
```

**现在：**

```typescript
const categories = await api.get("/api/categories");
categories.data.forEach((cat) => {
  console.log(cat.sortOrder); // camelCase
  console.log(cat.createdAt);
});
```

### 3. 移除字段名转换逻辑

如果你的前端代码中有类似这样的转换逻辑，可以删除了：

**可以删除：**

```typescript
// 不再需要这种转换
function snakeToCamel(obj) {
  // ...
}

const data = snakeToCamel(response.data);
```

## 常见字段对照表

### 通用字段

```typescript
// 之前 → 现在
user_id → userId
merchant_id → merchantId
created_at → createdAt
updated_at → updatedAt
```

### 分类相关

```typescript
category_id → categoryId
sort_order → sortOrder
```

### 菜品相关

```typescript
dish_id → dishId
dish_name → dishName
category_id → categoryId
image_url → imageUrl
is_available → isAvailable
has_sku → hasSku
price_delta → priceDelta
unit_price → unitPrice
```

### 订单相关

```typescript
order_id → orderId
order_no → orderNo
table_id → tableId
session_id → sessionId
total_amount → totalAmount
customer_remark → customerRemark
paid_at → paidAt
sku_id → skuId
sku_name → skuName
```

### 桌台相关

```typescript
table_id → tableId
table_no → tableNo
seat_count → seatCount
qr_token → qrToken
qr_url → qrUrl
is_active → isActive
```

### 统计相关

```typescript
today_revenue → todayRevenue
today_order_count → todayOrderCount
today_avg_order_value → todayAvgOrderValue
month_revenue → monthRevenue
order_count → orderCount
start_date → startDate
end_date → endDate
```

### 支付相关

```typescript
prepay_id → prepayId
payment_params → paymentParams
refund_id → refundId
open_id → openId
```

## 完整示例

### 示例 1: 获取菜品列表

**之前：**

```typescript
interface Dish {
  id: string;
  merchant_id: string;
  category_id: string;
  name: string;
  price: number;
  image_url: string;
  is_available: boolean;
  has_sku: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  skus?: Array<{
    id: string;
    dish_id: string;
    name: string;
    price_delta: number;
    is_available: boolean;
  }>;
}

const response = await api.get("/api/dishes");
const dishes: Dish[] = response.data;

dishes.forEach((dish) => {
  console.log(dish.image_url);
  console.log(dish.is_available);
  if (dish.skus) {
    dish.skus.forEach((sku) => {
      console.log(sku.price_delta);
    });
  }
});
```

**现在：**

```typescript
interface Dish {
  id: string;
  merchantId: string;
  categoryId: string;
  name: string;
  price: number;
  imageUrl: string;
  isAvailable: boolean;
  hasSku: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  skus?: Array<{
    id: string;
    dishId: string;
    name: string;
    priceDelta: number;
    isAvailable: boolean;
  }>;
}

const response = await api.get("/api/dishes");
const dishes: Dish[] = response.data;

dishes.forEach((dish) => {
  console.log(dish.imageUrl); // camelCase
  console.log(dish.isAvailable); // camelCase
  if (dish.skus) {
    dish.skus.forEach((sku) => {
      console.log(sku.priceDelta); // camelCase
    });
  }
});
```

### 示例 2: 获取订单详情

**之前：**

```typescript
interface Order {
  id: string;
  order_no: string;
  merchant_id: string;
  table_id: string;
  session_id: string;
  total_amount: number;
  status: string;
  customer_remark: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
  table_no: string;
  area: string | null;
  items: Array<{
    id: string;
    order_id: string;
    dish_id: string;
    sku_id: string | null;
    dish_name: string;
    sku_name: string | null;
    unit_price: number;
    quantity: number;
    subtotal: number;
  }>;
}

const response = await api.get(`/api/orders/${orderId}`);
const order: Order = response.data;

console.log(order.order_no);
console.log(order.total_amount);
console.log(order.table_no);
order.items.forEach((item) => {
  console.log(item.dish_name);
  console.log(item.unit_price);
});
```

**现在：**

```typescript
interface Order {
  id: string;
  orderNo: string;
  merchantId: string;
  tableId: string;
  sessionId: string;
  totalAmount: number;
  status: string;
  customerRemark: string | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
  tableNo: string;
  area: string | null;
  items: Array<{
    id: string;
    orderId: string;
    dishId: string;
    skuId: string | null;
    dishName: string;
    skuName: string | null;
    unitPrice: number;
    quantity: number;
    subtotal: number;
  }>;
}

const response = await api.get(`/api/orders/${orderId}`);
const order: Order = response.data;

console.log(order.orderNo); // camelCase
console.log(order.totalAmount); // camelCase
console.log(order.tableNo); // camelCase
order.items.forEach((item) => {
  console.log(item.dishName); // camelCase
  console.log(item.unitPrice); // camelCase
});
```

### 示例 3: 统计数据

**之前：**

```typescript
interface DashboardData {
  today_revenue: number;
  today_order_count: number;
  today_avg_order_value: number;
  month_revenue: number;
}

const response = await api.get("/api/stats/dashboard");
const stats: DashboardData = response.data;

console.log(`今日营收: ${stats.today_revenue / 100}元`);
console.log(`今日订单: ${stats.today_order_count}单`);
console.log(`客单价: ${stats.today_avg_order_value / 100}元`);
```

**现在：**

```typescript
interface DashboardData {
  todayRevenue: number;
  todayOrderCount: number;
  todayAvgOrderValue: number;
  monthRevenue: number;
}

const response = await api.get("/api/stats/dashboard");
const stats: DashboardData = response.data;

console.log(`今日营收: ${stats.todayRevenue / 100}元`);
console.log(`今日订单: ${stats.todayOrderCount}单`);
console.log(`客单价: ${stats.todayAvgOrderValue / 100}元`);
```

## 批量替换建议

如果使用 VS Code，可以使用正则表达式批量替换：

### 1. 查找所有 snake_case 字段访问

```regex
\.(user_id|merchant_id|table_id|order_id|dish_id|sku_id|category_id|session_id|created_at|updated_at|paid_at|expires_at|table_no|seat_count|qr_token|qr_url|is_active|is_available|has_sku|sort_order|image_url|total_amount|unit_price|dish_name|sku_name|order_no|customer_remark|price_delta|order_count|today_revenue|today_order_count|today_avg_order_value|month_revenue|prepay_id|payment_params|refund_id|open_id|start_date|end_date)
```

### 2. 手动替换或使用脚本

创建一个替换映射并批量处理。

## 测试建议

### 1. 单元测试

更新所有涉及 API 响应数据的单元测试。

### 2. 集成测试

运行完整的集成测试，确保所有 API 调用正常。

### 3. 手动测试

重点测试以下功能：

- [ ] 菜品列表显示
- [ ] 订单创建和查看
- [ ] 统计数据展示
- [ ] 桌台管理
- [ ] 支付流程

## 常见问题

### Q: 请求参数需要改成 camelCase 吗？

A: 不需要。后端同时支持 snake_case 和 camelCase 的请求参数，保持向后兼容。

### Q: 所有字段都改了吗？

A: 是的，所有响应数据的字段名都从 snake_case 改为 camelCase。

### Q: 时间格式有变化吗？

A: 没有，时间戳仍然是 ISO 8601 格式的字符串。

### Q: 错误响应的格式有变化吗？

A: 错误响应的 `code` 和 `message` 字段保持不变，但 `data` 中的字段名也改为 camelCase。

### Q: WebSocket 推送的数据格式有变化吗？

A: WebSocket 推送的数据已经是 camelCase，无需修改。

## 需要帮助？

如果在迁移过程中遇到问题，请参考：

- `backend/API_RESPONSE_EXAMPLES.md` - 详细的 API 响应示例
- `backend/CAMELCASE_CONVERSION.md` - 完整的转换文档
- `CONVERSION_CHECKLIST.md` - 转换检查清单

## 迁移检查清单

- [ ] 更新所有 TypeScript 接口定义
- [ ] 更新所有访问响应数据的代码
- [ ] 移除自定义的字段名转换逻辑
- [ ] 更新单元测试
- [ ] 运行集成测试
- [ ] 手动测试关键功能
- [ ] 更新 API 文档（如果有）
- [ ] 通知团队成员

完成以上步骤后，前端应该可以正常使用新的 API 响应格式了！
