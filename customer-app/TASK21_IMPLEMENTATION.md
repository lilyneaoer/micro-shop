# Task 21 实现文档：顾客小程序订单提交与支付

## 实现概述

本任务实现了顾客小程序的订单提交、支付和支付成功页面，完成了从购物车到支付成功的完整流程。

## 实现内容

### 1. 订单状态管理 Store (`src/stores/orders.ts`)

创建了订单状态管理 Store，包含：

**数据结构：**

- `OrderStatus` 枚举：定义订单状态（待支付、已支付/待接单、已接单/制作中、已完成、已取消、已退款）
- `OrderItem` 接口：订单项信息（菜品 ID、名称、SKU、单价、数量、小计）
- `Order` 接口：完整订单信息（订单号、桌台、商品列表、总金额、状态、备注、时间戳）

**功能方法：**

- `addOrder()`: 添加订单到列表（新订单添加到开头）
- `updateOrderStatus()`: 更新订单状态
- `getOrderById()`: 根据 ID 获取订单
- `setCurrentOrderId()`: 设置当前处理的订单 ID
- `clearOrders()`: 清空订单列表（Session 过期时使用）

### 2. 订单确认页面 (`src/pages/order-confirm/index.vue`)

**功能特性：**

- 展示桌台信息（桌号、区域）
- 展示订单商品列表（菜品名称、SKU、数量、价格）
- 顾客备注输入框（最多 200 字符，带字符计数）
- 实时显示订单总金额
- 提交订单按钮（带加载状态）

**业务逻辑：**

- 检查购物车是否为空
- 检查 Session 是否有效
- 调用 `POST /api/orders` 提交订单
- 处理下架菜品错误（错误码 3001）：显示错误提示并返回菜单页
- 订单创建成功后：
  - 添加订单到 Store
  - 设置当前订单 ID
  - 清空购物车
  - 跳转到支付页面

**错误处理：**

- 购物车为空：提示用户
- Session 过期：提示并跳转到扫码页
- 含下架菜品：显示具体错误信息并返回菜单
- 网络错误：提示用户重试

### 3. 支付页面 (`src/pages/payment/index.vue`)

**功能特性：**

- 展示订单详细信息（订单编号、桌号、下单时间）
- 展示商品清单（菜品名称、SKU、数量、小计）
- 显示应付金额
- 微信支付按钮（带加载状态）

**业务逻辑：**

- 从 URL 参数获取订单 ID
- 从 Store 加载订单信息
- 调用 `POST /api/payments/prepay` 获取支付参数
- 调用 `Taro.requestPayment()` 发起微信支付
- 支付成功：显示成功提示并跳转到支付成功页
- 支付取消：显示取消提示
- 支付失败：显示失败提示

**状态管理：**

- 加载状态：显示加载动画
- 支付中状态：禁用支付按钮
- 错误状态：显示错误信息和返回按钮

### 4. 支付成功页面 (`src/pages/order-success/index.vue`)

**功能特性：**

- 显示支付成功图标和提示
- 展示订单信息（订单编号、桌号、支付金额）
- 显示预计等待时间（根据菜品数量估算：每个菜品 5 分钟，最少 15 分钟，最多 45 分钟）
- 提供两个操作按钮：
  - "查看订单"：跳转到订单列表页
  - "继续点餐"：返回菜单页

**业务逻辑：**

- 从 URL 参数获取订单 ID
- 从 Store 加载订单信息
- 计算预计等待时间

### 5. 单元测试 (`src/test/stores/orders.test.ts`)

创建了订单 Store 的完整单元测试，覆盖：

- 初始化状态
- 添加订单
- 订单添加顺序（新订单在前）
- 更新订单状态
- 获取订单
- 设置当前订单 ID
- 清空订单列表

**测试结果：** ✅ 9/9 测试通过

## 技术实现细节

### 价格格式化

所有金额以"分"为单位存储和传输，前端显示时转换为"元"：

```typescript
function formatPrice(priceInCents: number): string {
  return (priceInCents / 100).toFixed(2);
}
```

### 时间格式化

ISO 8601 时间戳转换为本地时间格式：

```typescript
function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}
```

### 微信支付集成

使用 Taro 的 `requestPayment` API 发起微信支付：

```typescript
await Taro.requestPayment({
  timeStamp: paymentParams.timeStamp,
  nonceStr: paymentParams.nonceStr,
  package: paymentParams.package,
  signType: paymentParams.signType,
  paySign: paymentParams.paySign,
});
```

### 错误处理策略

- **下架菜品错误（3001）**：显示模态框，提示用户返回菜单重新选择
- **Session 过期（5002）**：显示模态框，提示用户重新扫码
- **网络错误**：显示 Toast 提示，允许用户重试
- **支付取消**：显示 Toast 提示，保持在支付页面
- **支付失败**：显示 Toast 提示，允许用户重试

## UI/UX 设计

### 视觉风格

- 主色调：橙色 (#ff6b35)
- 背景色：浅灰 (#f5f5f5)
- 卡片背景：白色 (#fff)
- 圆角：48rpx（按钮）、16rpx（卡片）

### 交互设计

- 提交/支付按钮：带禁用状态，防止重复提交
- 加载状态：显示加载动画和提示文字
- 错误提示：使用模态框或 Toast，根据严重程度选择
- 页面跳转：使用 `redirectTo` 防止返回到中间页面

### 响应式布局

- 使用 rpx 单位适配不同屏幕尺寸
- 固定底部操作栏，内容区域可滚动
- 适配小程序安全区域

## 需求覆盖

本任务实现了以下需求：

- ✅ **需求 3.5**：顾客提交订单时，将购物车内容、桌台标识符和顾客备注发送至后端
- ✅ **需求 3.6**：后端验证所有订单项中的菜品均处于上架状态
- ✅ **需求 3.7**：订单中存在已下架菜品时，拒绝创建订单并返回包含下架菜品名称的错误信息
- ✅ **需求 3.8**：订单创建成功后，跳转至支付页面并展示订单详情和应付金额
- ✅ **需求 4.1**：支持顾客通过微信支付完成支付
- ✅ **需求 4.5**：支付成功后，展示支付成功页面，并显示订单编号和预计等待时间

## 文件清单

### 新增文件

- `customer-app/src/stores/orders.ts` - 订单状态管理 Store
- `customer-app/src/test/stores/orders.test.ts` - 订单 Store 单元测试
- `customer-app/TASK21_IMPLEMENTATION.md` - 实现文档

### 修改文件

- `customer-app/src/pages/order-confirm/index.vue` - 订单确认页面（完整实现）
- `customer-app/src/pages/payment/index.vue` - 支付页面（完整实现）
- `customer-app/src/pages/order-success/index.vue` - 支付成功页面（完整实现）

## 测试验证

### 单元测试

```bash
npm run test -- orders.test.ts
```

结果：✅ 9/9 测试通过

### 手动测试场景

1. **正常流程**：

   - 购物车 → 订单确认 → 提交订单 → 支付 → 支付成功

2. **下架菜品处理**：

   - 购物车中含下架菜品 → 提交订单 → 显示错误提示 → 返回菜单

3. **支付取消**：

   - 订单确认 → 支付页面 → 取消支付 → 显示取消提示 → 保持在支付页面

4. **Session 过期**：

   - 订单确认 → Session 过期 → 显示过期提示 → 跳转到扫码页

5. **网络错误**：
   - 订单确认 → 网络错误 → 显示错误提示 → 允许重试

## 后续任务

Task 21 已完成，后续任务：

- **Task 22**：顾客小程序订单列表与实时状态（WebSocket 推送）
- **Task 23**：商家移动端项目初始化与认证
- **Task 24**：商家移动端订单接收与处理

## 注意事项

1. **微信支付测试**：需要在真实小程序环境中测试，开发工具可能无法完整模拟支付流程
2. **Session 管理**：确保 Session Token 在所有请求中正确注入（已在 `api/index.ts` 中实现）
3. **错误码处理**：严格按照设计文档中的错误码规范处理不同错误场景
4. **金额单位**：始终使用"分"作为金额单位，前端显示时转换为"元"
5. **页面跳转**：使用 `redirectTo` 而非 `navigateTo`，防止用户返回到中间页面

## 总结

Task 21 成功实现了顾客小程序的订单提交与支付流程，包括：

- 完整的订单状态管理
- 用户友好的订单确认界面
- 微信支付集成
- 支付成功页面
- 完善的错误处理
- 单元测试覆盖

所有功能均按照需求文档和设计文档实现，代码质量良好，无 TypeScript 错误，测试全部通过。
