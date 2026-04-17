# Task 18 实现说明：顾客小程序项目初始化

## 任务概述

初始化基于 Taro + Vue3 + TypeScript 的顾客小程序项目，配置依赖和 API 层。

## 实现内容

### 1. 项目结构搭建

创建了完整的 Taro 项目结构：

```
customer-app/
├── config/              # Taro 配置
│   ├── index.ts        # 主配置文件
│   ├── dev.ts          # 开发环境配置
│   └── prod.ts         # 生产环境配置
├── src/
│   ├── api/            # API 请求封装
│   │   └── index.ts    # 统一请求方法
│   ├── pages/          # 页面目录
│   │   ├── scan/       # 扫码入口页
│   │   ├── menu/       # 菜单浏览页
│   │   ├── cart/       # 购物车页
│   │   ├── order-confirm/  # 订单确认页
│   │   ├── payment/    # 支付页
│   │   ├── order-success/  # 支付成功页
│   │   └── order-list/ # 订单列表页
│   ├── app.config.ts   # 小程序配置
│   ├── app.ts          # 入口文件
│   ├── app.less        # 全局样式
│   └── global.d.ts     # 全局类型定义
├── package.json
├── tsconfig.json
├── project.config.json # 微信小程序配置
├── babel.config.js
└── README.md
```

### 2. 依赖配置

安装并配置了以下核心依赖：

**运行时依赖**:

- `@tarojs/taro`: ^4.0.7 - Taro 核心库
- `@tarojs/components`: ^4.0.7 - Taro 组件库
- `@tarojs/runtime`: ^4.0.7 - Taro 运行时
- `vue`: ^3.3.4 - Vue 3 框架
- `pinia`: ^2.1.7 - 状态管理
- `socket.io-client`: ^4.7.5 - WebSocket 客户端
- `taro-ui-vue3`: ^1.0.0-alpha.21 - UI 组件库

**开发依赖**:

- `@tarojs/cli`: ^4.0.7 - Taro 命令行工具
- `@tarojs/vite-runner`: ^4.0.7 - Vite 构建工具
- `typescript`: ^5.1.0 - TypeScript 支持
- `vite`: ^5.0.0 - 构建工具
- `@vitejs/plugin-vue`: ^5.0.0 - Vue 插件
- `@vitejs/plugin-vue-jsx`: 最新版 - JSX 支持
- `less`: ^4.1.3 - CSS 预处理器

### 3. API 层实现 (`src/api/index.ts`)

实现了完整的 API 请求封装，包含以下功能：

#### 3.1 统一响应格式

```typescript
interface ApiResponse<T = any> {
  code: number;
  message: string;
  data: T;
}
```

#### 3.2 Session Token 管理

- **自动注入**: 使用 Taro 拦截器自动在请求头中注入 `Authorization: Bearer <token>`
- **存储管理**: 提供 `setSessionToken()` 和 `clearSessionToken()` 方法
- **自动读取**: 从本地存储读取 Token 并注入到所有请求

```typescript
// 获取 Session Token
function getSessionToken(): string | null;

// 设置 Session Token
export function setSessionToken(token: string): void;

// 清除 Session Token
export function clearSessionToken(): void;
```

#### 3.3 请求拦截器

- 自动拼接 baseURL（开发环境: `http://localhost:7001`，生产环境: `https://api.example.com`）
- 自动注入 Session Token
- 设置默认 Content-Type 为 `application/json`
- 设置请求超时时间为 10 秒

#### 3.4 统一错误处理

- **1002/5002**: Token 无效或 Session 过期

  - 清除本地 Token
  - 显示提示信息
  - 2 秒后跳转到扫码页

- **5001**: 桌台不可用

  - 显示模态框提示"该桌台不可用，请联系服务员"

- **其他错误**: 显示 Toast 提示错误信息

- **网络错误**: 捕获并显示网络请求失败提示

#### 3.5 便捷请求方法

```typescript
// GET 请求
export function get<T>(url: string, data?: any): Promise<ApiResponse<T>>;

// POST 请求
export function post<T>(url: string, data?: any): Promise<ApiResponse<T>>;

// PUT 请求
export function put<T>(url: string, data?: any): Promise<ApiResponse<T>>;

// DELETE 请求
export function del<T>(url: string, data?: any): Promise<ApiResponse<T>>;
```

### 4. 小程序配置 (`src/app.config.ts`)

配置了所有页面路由和小程序基本信息：

```typescript
pages: [
  "pages/scan/index", // 扫码入口页（首页）
  "pages/menu/index", // 菜单浏览页
  "pages/cart/index", // 购物车页
  "pages/order-confirm/index", // 订单确认页
  "pages/payment/index", // 支付页
  "pages/order-success/index", // 支付成功页
  "pages/order-list/index", // 订单列表页
];
```

### 5. 页面结构

为所有页面创建了基础结构：

- 每个页面包含 `.vue` 文件和 `.config.ts` 配置文件
- 使用 Vue 3 Composition API (`<script setup>`)
- 使用 Less 作为样式预处理器

### 6. TypeScript 配置

配置了完整的 TypeScript 支持：

- 启用严格模式
- 配置路径别名 `@/*` 指向 `src/*`
- 包含 Taro 和 Node 类型定义
- 支持 Vue 3 JSX

### 7. 构建配置

- 使用 Vite 作为构建工具
- 配置了开发和生产环境
- 支持微信小程序平台编译
- 配置了 Less 预处理器和 PostCSS

## 验证结果

✅ 项目结构创建成功  
✅ 依赖安装成功（使用 `--legacy-peer-deps` 解决版本冲突）  
✅ 构建测试通过（`npm run build:weapp`）  
✅ 生成的小程序代码可在微信开发者工具中打开

构建输出：

- 总计 162 个模块
- 主包大小约 178KB（taro.js）
- 所有页面成功编译为 `.wxml`、`.wxss`、`.js`、`.json` 文件

## 满足的需求

- ✅ **需求 3.1**: 顾客扫码点餐流程 - 创建了扫码入口页面结构
- ✅ **需求 10.1**: 顾客身份与就餐会话 - 实现了 Session Token 管理机制

## 后续任务

Task 18 已完成项目初始化，后续任务将实现具体功能：

- **Task 19**: 扫码入口与会话创建
- **Task 20**: 菜单浏览与购物车
- **Task 21**: 订单提交与支付
- **Task 22**: 订单列表与实时状态

## 使用说明

### 开发模式

```bash
cd customer-app
npm run dev:weapp
```

然后使用微信开发者工具打开 `dist` 目录。

### 构建生产版本

```bash
npm run build:weapp
```

### API 使用示例

```typescript
import { get, post, setSessionToken } from "@/api";

// 创建会话
const response = await post("/api/sessions", {
  openId: "xxx",
  tableId: "xxx",
});

if (response.code === 0) {
  // 保存 Session Token
  setSessionToken(response.data.sessionToken);

  // 后续请求会自动注入 Token
  const menuResponse = await get("/api/dishes");
}
```

## 技术亮点

1. **统一的 API 封装**: 使用 Taro 拦截器实现请求/响应统一处理
2. **自动 Token 管理**: Session Token 自动注入和过期处理
3. **完善的错误处理**: 针对不同错误码提供不同的用户提示
4. **类型安全**: 完整的 TypeScript 类型定义
5. **模块化设计**: 清晰的目录结构和职责划分

## 注意事项

1. **网络请求域名**: 生产环境需要在微信小程序后台配置合法域名
2. **Session Token**: 存储在本地，需要在扫码后通过 `/api/sessions` 接口获取
3. **金额单位**: 后端以"分"为单位，前端显示时需要转换为"元"
4. **WebSocket**: 订单状态推送功能将在 Task 22 中实现
