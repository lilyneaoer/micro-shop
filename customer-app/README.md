# 顾客小程序 (Customer Mini-Program)

基于 Taro + Vue3 + TypeScript 开发的微信小程序，用于扫码点餐系统的顾客端。

## 技术栈

- **框架**: Taro 4.x
- **UI 框架**: Vue 3 + Taro UI Vue3
- **状态管理**: Pinia
- **语言**: TypeScript
- **样式**: Less
- **实时通信**: Socket.IO Client
- **构建工具**: Vite

## 项目结构

```
customer-app/
├── config/              # Taro 配置文件
│   ├── index.ts        # 主配置
│   ├── dev.ts          # 开发环境配置
│   └── prod.ts         # 生产环境配置
├── src/
│   ├── api/            # API 请求封装
│   │   └── index.ts    # 统一请求方法，Session Token 管理
│   ├── pages/          # 页面
│   │   ├── scan/       # 扫码入口页
│   │   ├── menu/       # 菜单浏览页
│   │   ├── cart/       # 购物车页
│   │   ├── order-confirm/  # 订单确认页
│   │   ├── payment/    # 支付页
│   │   ├── order-success/  # 支付成功页
│   │   └── order-list/ # 订单列表页
│   ├── stores/         # Pinia 状态管理（待实现）
│   ├── app.config.ts   # 小程序配置
│   ├── app.ts          # 入口文件
│   ├── app.less        # 全局样式
│   └── global.d.ts     # 全局类型定义
├── package.json
├── tsconfig.json
├── project.config.json # 微信小程序配置
└── babel.config.js
```

## 功能特性

### 已实现

- ✅ 项目基础架构搭建
- ✅ API 请求封装（统一响应格式处理）
- ✅ Session Token 自动注入和管理
- ✅ 错误处理（401/5002 自动跳转扫码页）
- ✅ 页面路由配置
- ✅ 基础页面结构

### 待实现

- ⏳ 扫码入口与会话创建（Task 19）
- ⏳ 菜单浏览与购物车（Task 20）
- ⏳ 订单提交与支付（Task 21）
- ⏳ 订单列表与实时状态（Task 22）

## API 封装说明

### 统一请求方法

`src/api/index.ts` 提供了统一的请求封装：

```typescript
import { get, post, put, del } from '@/api'

// GET 请求
const response = await get('/api/dishes')

// POST 请求
const response = await post('/api/orders', { items: [...] })
```

### Session Token 管理

- **自动注入**: 所有请求自动在 Header 中注入 `Authorization: Bearer <token>`
- **自动存储**: 使用 `setSessionToken(token)` 存储到本地
- **自动清除**: Token 过期时自动清除并跳转扫码页

### 错误处理

- **1002/5002**: Token 无效或 Session 过期 → 清除 Token + 跳转扫码页
- **5001**: 桌台不可用 → 显示提示弹窗
- **其他错误**: 显示 Toast 提示

## 开发指南

### 安装依赖

```bash
cd customer-app
npm install
# 或
pnpm install
```

### 开发模式

```bash
# 微信小程序
npm run dev:weapp
```

然后使用微信开发者工具打开 `dist` 目录。

### 构建生产版本

```bash
npm run build:weapp
```

### 代码检查

```bash
npm run lint
npm run lint:fix
```

## 配置说明

### 网络请求域名白名单

在 `src/app.config.ts` 中配置（生产环境需要在微信小程序后台配置）：

```typescript
// 开发环境: http://localhost:7001
// 生产环境: http://localhost:7001
```

### 页面路由

所有页面路由在 `src/app.config.ts` 的 `pages` 数组中配置。

## 注意事项

1. **Session Token**: 顾客扫码后通过 `/api/sessions` 接口获取 Session Token，存储在本地并自动注入到所有请求中
2. **金额单位**: 后端以"分"为单位，前端显示时需要转换为"元"（除以 100）
3. **WebSocket**: 用于订单状态实时推送，需要在后续任务中实现
4. **微信支付**: 使用 `Taro.requestPayment` 调用微信支付 API

## 相关文档

- [Taro 文档](https://taro-docs.jd.com/)
- [Vue 3 文档](https://cn.vuejs.org/)
- [Pinia 文档](https://pinia.vuejs.org/zh/)
- [Taro UI Vue3 文档](https://taro-ui-vue3.vercel.app/)
- [微信小程序文档](https://developers.weixin.qq.com/miniprogram/dev/framework/)
