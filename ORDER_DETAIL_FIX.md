# 订单详情接口 401 错误修复

## 问题描述

访问 `/api/orders/:id` 接口时返回 401 未授权错误。

## 问题原因

在 `backend/app/router.ts` 中，订单详情接口没有使用任何认证中间件：

```typescript
router.get("/api/orders/:id", controller.order.show);
```

但是在控制器 `backend/app/controller/order.ts` 中，`show` 方法需要从 `ctx.state` 中读取 `merchantId` 或 `sessionId`：

```typescript
const isMerchantRequest = !!ctx.state.merchantId && !ctx.state.sessionId;
const isCustomerRequest = !!ctx.state.sessionId;

if (!isMerchantRequest && !isCustomerRequest) {
  ctx.status = 401;
  ctx.body = formatError(ErrorCode.UNAUTHORIZED, "未授权");
  return;
}
```

由于没有认证中间件，`ctx.state.merchantId` 和 `ctx.state.sessionId` 都是 `undefined`，导致接口返回 401。

## 解决方案

在路由配置中为订单详情接口添加 `optionalAuthMiddleware`：

```typescript
router.get("/api/orders/:id", optionalAuthMiddleware, controller.order.show);
```

`optionalAuth` 中间件会：

1. 尝试解析 JWT token（商户认证）
2. 如果 JWT 失败，尝试解析 Session Token（顾客认证）
3. 如果都失败，继续执行但不设置 `ctx.state`（由控制器返回 401）

## 修改文件

- `backend/app/router.ts` - 添加 `optionalAuthMiddleware` 到订单详情路由

## 测试验证

1. 确保已登录管理后台（localStorage 中有 token）
2. 访问订单管理页面
3. 点击任意订单的"查看详情"按钮
4. 应该能成功加载订单详情，包括菜品明细

## 相关修复

同时修复了以下问题：

1. **订单列表缺少 items 字段** - 在打开详情时重新调用 `orderApi.detail(id)` 获取完整数据
2. **后端数据格式不一致** - 统一 `getOrderById` 和 `getOrders` 的返回格式，将 `table_no` 和 `area` 提升到顶层
3. **前端 Order 接口缺少 area 字段** - 添加 `area: string` 字段定义
