# Task 23 实现文档：商家移动端项目初始化与认证

## 任务概述

使用 Taro CLI 初始化商家 App 项目（Taro + Vue3 + TypeScript，目标平台：App），实现 JWT 认证登录功能，包括 Token 持久化存储和过期自动跳转。

## 实现内容

### 1. 项目初始化

#### 1.1 项目结构

```
merchant-app/
├── config/                    # Taro 配置
│   ├── index.ts              # 主配置文件
│   ├── dev.ts                # 开发环境配置
│   └── prod.ts               # 生产环境配置
├── src/
│   ├── api/                  # API 层
│   │   └── index.ts          # API 请求封装、认证接口
│   ├── pages/                # 页面
│   │   ├── login/            # 登录页
│   │   │   ├── index.vue
│   │   │   └── index.config.ts
│   │   └── order-list/       # 订单列表页（占位）
│   │       ├── index.vue
│   │       └── index.config.ts
│   ├── stores/               # Pinia 状态管理
│   │   └── auth.ts           # 认证状态
│   ├── app.ts                # 应用入口
│   ├── app.config.ts         # 应用配置
│   ├── app.less              # 全局样式
│   └── global.d.ts           # 全局类型定义
├── .eslintrc.js              # ESLint 配置
├── .gitignore
├── babel.config.js           # Babel 配置
├── package.json
├── project.config.json       # 小程序项目配置
├── tsconfig.json             # TypeScript 配置
├── tsconfig.node.json        # Node 环境 TS 配置
└── vitest.config.ts          # Vitest 测试配置
```

#### 1.2 依赖安装

**核心依赖**:

- `@tarojs/taro`: Taro 核心库
- `@tarojs/components`: Taro 组件库
- `@tarojs/runtime`: Taro 运行时
- `vue`: Vue 3
- `pinia`: 状态管理
- `socket.io-client`: WebSocket 客户端（为后续任务准备）
- `taro-ui-vue3`: UI 组件库

**开发依赖**:

- `@tarojs/cli`: Taro 命令行工具
- `@tarojs/vite-runner`: Vite 构建工具
- `typescript`: TypeScript 支持
- `vitest`: 单元测试框架
- `fast-check`: 属性测试库
- `eslint`: 代码检查

### 2. API 层实现

#### 2.1 统一请求封装 (`src/api/index.ts`)

**核心功能**:

1. 封装 `Taro.request`，统一处理请求和响应
2. 自动从本地存储读取 Token 并注入到请求 Header
3. 统一错误处理，Token 过期时自动跳转登录页
4. 提供认证相关 API 接口

**关键实现**:

```typescript
// Token 自动注入
const token = Taro.getStorageSync("token");
if (token) {
  header["Authorization"] = `Bearer ${token}`;
}

// Token 过期处理
if (result.code === 1002) {
  Taro.removeStorageSync("token");
  Taro.reLaunch({ url: "/pages/login/index" });
}
```

**API 接口**:

- `authApi.login(params)`: 商家登录
- `authApi.logout()`: 商家登出

### 3. 认证状态管理

#### 3.1 Auth Store (`src/stores/auth.ts`)

**状态**:

- `token`: JWT Token（从 `Taro.getStorageSync` 初始化）
- `userInfo`: 用户信息（用户名）

**计算属性**:

- `isLoggedIn`: 是否已登录（基于 token 是否存在）

**Actions**:

- `login(params)`: 登录，成功后持久化 Token
- `logout()`: 登出，清除本地 Token
- `clearAuth()`: 清除认证状态（用于 Token 过期）

**Token 持久化**:

```typescript
// 登录成功后持久化
Taro.setStorageSync("token", result.token);

// 登出时清除
Taro.removeStorageSync("token");
```

### 4. 登录页面实现

#### 4.1 登录页 (`src/pages/login/index.vue`)

**功能特性**:

1. 用户名和密码输入表单
2. 表单验证（非空校验）
3. 登录中状态显示（按钮禁用、文字变化）
4. 错误提示（根据后端错误码显示不同消息）
5. 登录成功后跳转订单列表页

**错误处理**:

- 错误码 2001: "账号已被锁定，请 30 分钟后再试"
- 错误码 2002: "用户名或密码错误，请重新输入"
- 其他错误: 显示后端返回的错误消息

**用户体验**:

- 登录成功后显示 Toast 提示
- 1.5 秒后自动跳转到订单列表页

### 5. Token 过期处理机制

#### 5.1 自动跳转流程

1. **请求拦截**: 所有 API 请求自动携带 Token
2. **响应拦截**: 检测错误码 1002（Token 无效/过期）
3. **清除存储**: 调用 `Taro.removeStorageSync('token')`
4. **跳转登录**: 调用 `Taro.reLaunch({ url: '/pages/login/index' })`

#### 5.2 实现位置

在 `src/api/index.ts` 的 `request` 函数中统一处理：

```typescript
if (result.code === 1002) {
  Taro.removeStorageSync("token");
  Taro.reLaunch({ url: "/pages/login/index" });
}
```

### 6. 订单列表页（占位）

#### 6.1 基础功能

- 显示欢迎信息（用户名）
- 提供退出登录按钮
- 占位文字说明后续任务实现

**退出登录流程**:

1. 调用 `authStore.logout()`
2. 显示 Toast 提示
3. 跳转到登录页

## 需求验证

### 需求 9.6: 商家移动端登录与 Token 持久化

✅ **实现**:

- 登录页支持用户名密码登录
- 登录成功后调用 `Taro.setStorageSync('token', token)` 持久化存储
- Token 在应用重启后自动从本地存储恢复

### 需求 9.7: Token 过期自动跳转

✅ **实现**:

- API 层统一检测错误码 1002（Token 过期）
- 自动调用 `Taro.removeStorageSync('token')` 清除本地存储
- 自动调用 `Taro.reLaunch()` 跳转登录页

## 技术亮点

1. **统一 API 封装**: 所有请求通过统一的 `request` 函数，自动处理 Token 注入和过期检测
2. **Pinia 状态管理**: 使用 Composition API 风格，代码简洁易维护
3. **类型安全**: 全面使用 TypeScript，API 接口和状态都有完整类型定义
4. **错误处理**: 自定义 `ApiError` 类，统一错误处理逻辑
5. **用户体验**: 登录成功/失败都有明确的视觉反馈

## 测试建议

### 单元测试

1. **Auth Store 测试**:

   - 测试 `login` 成功后 Token 被正确存储
   - 测试 `logout` 后 Token 被清除
   - 测试 `isLoggedIn` 计算属性

2. **API 层测试**:
   - 测试 Token 自动注入
   - 测试错误码 1002 触发跳转
   - 测试网络错误处理

### 集成测试

1. 完整登录流程：输入用户名密码 → 登录成功 → Token 持久化 → 跳转订单列表
2. Token 过期流程：携带过期 Token 请求 → 检测到 1002 → 清除 Token → 跳转登录页
3. 退出登录流程：点击退出 → 调用登出接口 → 清除 Token → 跳转登录页

## 后续任务

- **Task 24**: 实现订单接收与处理功能

  - WebSocket 连接管理
  - 订单列表展示
  - 接单和完成操作
  - 新订单推送通知

- **Task 25**: 实现数据汇总页面
  - 今日营业额
  - 今日订单数
  - 待处理订单数

## 注意事项

1. **目标平台**: 本项目目标平台为 App（React Native），配置文件中使用 `rn` 相关配置
2. **API 地址**: 开发环境默认为 `http://localhost:7001/api`，生产环境需修改为实际域名
3. **Token 格式**: 使用 `Bearer ${token}` 格式在 Authorization Header 中传递
4. **错误码**: 与后端约定的错误码需保持一致（1002 为 Token 过期，2001 为账号锁定，2002 为密码错误）
