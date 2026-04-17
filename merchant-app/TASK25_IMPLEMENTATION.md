# Task 25 Implementation: 商家移动端数据汇总页面

## 概述

实现了商家移动端的数据汇总页面，展示今日营业额、今日订单数和待处理订单数。

## 实现内容

### 1. 创建数据汇总页面 (`src/pages/stats/index.vue`)

**功能特性：**

- 展示今日营业额（分转元，保留两位小数）
- 展示今日订单数
- 展示今日客单价（作为辅助信息）
- 展示本月累计营业额（作为辅助信息）
- 展示待处理订单数（从 orders store 获取）
- 支持刷新数据功能
- 支持跳转到订单列表页查看待处理订单
- 错误处理和加载状态展示

**UI 设计：**

- 使用渐变色背景，提升视觉效果
- 三个数据卡片分别使用不同的渐变色主题
- 卡片包含图标、标题、主要数值和辅助信息
- 响应式布局，适配不同屏幕尺寸

### 2. 扩展 API 模块 (`src/api/index.ts`)

**新增接口：**

```typescript
export interface DashboardData {
  today_revenue: number;
  today_order_count: number;
  today_avg_order_value: number;
  month_revenue: number;
}

export const statsApi = {
  getDashboard(): Promise<DashboardData>;,
};
```

**API 调用：**

- `GET /api/stats/dashboard` - 获取看板数据

### 3. 更新应用配置 (`src/app.config.ts`)

- 添加 `pages/stats/index` 到页面列表
- 保持简单的导航结构（未添加 tabBar，因为缺少图标资源）

### 4. 增强订单列表页面 (`src/pages/order-list/index.vue`)

**新增功能：**

- 在顶部导航栏添加"数据"按钮
- 点击按钮跳转到数据汇总页面
- 优化头部布局，支持多个操作按钮

### 5. 单元测试 (`src/pages/stats/__tests__/index.test.ts`)

**测试覆盖：**

- 金额格式化函数测试（分转元）
- 看板数据结构验证
- 典型数据值处理测试

## 需求验收

✅ **需求 8.4：商家移动端数据汇总**

- 实现 `src/pages/stats/index.vue`：展示今日营业额、今日订单数、待处理订单数
- 调用 `GET /api/stats/dashboard` 获取数据
- 今日营业额以元为单位展示（后端返回分）
- 待处理订单数从 orders store 实时获取
- 支持数据刷新功能

## 技术实现细节

### 数据流

1. **页面加载时：**

   - 调用 `statsApi.getDashboard()` 获取看板数据
   - 调用 `ordersStore.fetchOrders()` 确保订单数据已加载
   - 从 `ordersStore.pendingCount` 获取待处理订单数

2. **页面显示时（useDidShow）：**

   - 自动刷新看板数据
   - 自动刷新订单列表

3. **手动刷新：**
   - 同时刷新看板数据和订单列表
   - 显示刷新成功提示

### 金额处理

- 后端返回金额单位为"分"（整数）
- 前端使用 `formatAmount` 函数转换为"元"（保留两位小数）
- 示例：`50000` 分 → `500.00` 元

### 错误处理

- 网络请求失败时显示错误提示
- 提供重试按钮
- 使用 Taro.showToast 显示操作反馈

## 测试结果

```bash
✓ src/pages/stats/__tests__/index.test.ts (3)
  ✓ formatAmount function tests
  ✓ Dashboard data structure validation
  ✓ Typical data values handling

All tests passed: 3/3
```

## 文件清单

### 新增文件

- `merchant-app/src/pages/stats/index.vue` - 数据汇总页面
- `merchant-app/src/pages/stats/__tests__/index.test.ts` - 单元测试

### 修改文件

- `merchant-app/src/api/index.ts` - 添加 statsApi
- `merchant-app/src/app.config.ts` - 添加 stats 页面路由
- `merchant-app/src/pages/order-list/index.vue` - 添加数据按钮

## 使用说明

### 访问数据汇总页面

1. **从订单列表页：**

   - 点击顶部导航栏的"数据"按钮

2. **页面功能：**
   - 查看今日营业额和本月累计
   - 查看今日订单数和客单价
   - 查看待处理订单数
   - 点击"查看订单"按钮返回订单列表
   - 点击"刷新数据"按钮更新数据

### 数据说明

- **今日营业额：** 当日所有已支付订单的总金额
- **今日订单数：** 当日已支付订单的数量
- **客单价：** 今日营业额 ÷ 今日订单数
- **本月累计：** 本月所有已支付订单的总金额
- **待处理订单：** 当前处于"已支付"状态的订单数量

## 后续优化建议

1. **添加 TabBar：**

   - 创建图标资源（订单、数据）
   - 配置 tabBar 实现底部导航
   - 提升用户体验

2. **增强数据展示：**

   - 添加数据趋势图表
   - 显示同比/环比增长率
   - 添加更多维度的统计数据

3. **性能优化：**

   - 实现数据缓存机制
   - 减少不必要的 API 调用
   - 优化页面加载速度

4. **用户体验：**
   - 添加下拉刷新功能
   - 添加骨架屏加载效果
   - 优化错误提示文案
