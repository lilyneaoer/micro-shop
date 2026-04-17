# 商家移动端 (Merchant App)

商家移动端应用，基于 Taro + Vue3 + TypeScript 构建，目标平台为 App（React Native）。

## 功能特性

- ✅ JWT 认证登录
- ✅ Token 持久化存储
- ✅ Token 过期自动跳转登录页
- 🚧 订单接收与处理（Task 24）
- 🚧 数据汇总页面（Task 25）

## 技术栈

- **框架**: Taro 4.x + Vue 3
- **状态管理**: Pinia
- **样式**: Less
- **类型检查**: TypeScript
- **实时通信**: Socket.IO Client
- **UI 组件**: Taro UI Vue3

## 项目结构

```
merchant-app/
├── config/              # Taro 配置文件
├── src/
│   ├── api/            # API 请求封装
│   ├── pages/          # 页面组件
│   │   ├── login/      # 登录页
│   │   └── order-list/ # 订单列表页
│   ├── stores/         # Pinia 状态管理
│   │   └── auth.ts     # 认证状态
│   ├── app.ts          # 应用入口
│   ├── app.config.ts   # 应用配置
│   └── app.less        # 全局样式
├── package.json
└── tsconfig.json
```

## 开发指南

### 安装依赖

```bash
cd merchant-app
npm install
```

### 开发模式

```bash
# React Native 开发模式
npm run dev:rn
```

### 构建

```bash
# 构建 React Native 应用
npm run build:rn
```

### 测试

```bash
# 运行单元测试
npm test

# 监听模式
npm run test:watch
```

### 代码检查

```bash
# ESLint 检查
npm run lint

# 自动修复
npm run lint:fix
```

## API 配置

API 基础地址在 `src/api/index.ts` 中配置：

- 开发环境: `http://localhost:7001/api`
- 生产环境: `https://api.example.com/api`

## 认证流程

1. 用户在登录页输入用户名和密码
2. 调用 `/api/auth/login` 接口获取 JWT Token
3. Token 通过 `Taro.setStorageSync` 持久化存储
4. 后续请求自动在 Header 中携带 Token
5. Token 过期时（错误码 1002）自动跳转登录页并清除本地存储

## 需求映射

- **需求 9.6**: 商家移动端支持用户名密码登录，登录成功后本地持久化存储 Token
- **需求 9.7**: Token 过期时自动跳转登录页并清除本地存储的 Token

## 后续任务

- [ ] Task 24: 订单接收与处理功能
- [ ] Task 25: 数据汇总页面
