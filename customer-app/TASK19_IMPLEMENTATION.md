# Task 19 实现文档：顾客小程序扫码入口与会话创建

## 概述

本任务实现了顾客小程序的扫码入口功能和会话管理，包括：

1. Session Store（Pinia）：管理会话状态
2. 扫码页面：解析二维码参数并创建会话
3. 错误处理：桌台不可用、Session 过期等场景

## 实现的文件

### 1. `src/stores/session.ts` - Session Store

**功能**：

- 存储 Session Token、桌台信息和 OpenID
- 提供会话管理方法（设置、清除、验证）

**接口**：

```typescript
interface TableInfo {
  id: string
  tableNo: string
  area?: string
  seatCount?: number
}

// Store 方法
setSession(token: string, table: TableInfo, openIdValue: string): void
clearSession(): void
hasValidSession(): boolean
```

**状态**：

- `sessionToken`: Session Token
- `tableInfo`: 桌台信息
- `openId`: 微信 OpenID

### 2. `src/pages/scan/index.vue` - 扫码入口页面

**功能**：

- 解析二维码 URL 参数（`qr_token` 或 `scene`）
- 获取微信 OpenID
- 调用 `POST /api/sessions` 创建会话
- 处理各种错误场景
- 会话创建成功后跳转至菜单页

**错误处理**：

- **错误码 5001**（桌台不可用）：显示 Modal 提示"该桌台不可用，请联系服务员"
- **错误码 5002**（Session 过期）：显示 Toast 提示"Session 已过期，请重新扫码"
- **其他错误**：显示通用错误提示

**流程**：

```
扫码 → 解析 qr_token → 获取 OpenID → 创建会话 → 保存 Token → 跳转菜单页
```

### 3. `src/stores/session.test.ts` - Session Store 单元测试

**测试覆盖**：

- ✅ 初始化状态验证
- ✅ 设置会话信息
- ✅ 清除会话信息
- ✅ 会话有效性验证

**测试结果**：

```
✓ Session Store (4)
  ✓ should initialize with null values
  ✓ should set session information correctly
  ✓ should clear session information
  ✓ should validate session correctly
```

### 4. 测试配置文件

- `vitest.config.ts`: Vitest 配置
- `src/test/setup.ts`: 测试环境设置（Mock Taro APIs）

## API 集成

### 创建会话接口

**请求**：

```typescript
POST /api/sessions
{
  qr_token: string,  // 二维码 Token
  open_id: string    // 微信 OpenID
}
```

**响应**：

```typescript
{
  code: 0,
  message: "success",
  data: {
    sessionToken: string,
    table: {
      id: string,
      tableNo: string,
      area?: string,
      seatCount?: number
    }
  }
}
```

**错误码**：

- `5001`: 桌台不可用
- `5002`: Session 过期

## 需求验证

### 需求 1.4：顾客扫码识别桌台

✅ 实现了二维码参数解析（`qr_token` 或 `scene`）

### 需求 1.5：桌台不可用提示

✅ 错误码 5001 时显示 Modal："该桌台不可用，请联系服务员"

### 需求 3.1：扫码后展示菜单

✅ 会话创建成功后跳转至菜单页（`/pages/menu/index`）

### 需求 10.1：获取 OpenID 创建 Session

✅ 通过 `Taro.login()` 获取微信登录凭证
✅ 调用 `POST /api/sessions` 创建会话

### 需求 10.2：Session 有效期管理

✅ Session Token 存储在本地和 Store 中
✅ 通过 `api/index.ts` 的拦截器自动注入 Token

### 需求 10.5：Session 过期提示

✅ 错误码 5002 时显示 Toast："Session 已过期，请重新扫码"
✅ `api/index.ts` 中已实现全局 Session 过期处理

## 技术实现细节

### 1. Session Token 管理

- Token 存储在两个地方：
  1. Taro Storage（持久化）：通过 `setSessionToken()` 保存
  2. Pinia Store（运行时）：通过 `sessionStore.setSession()` 保存

### 2. 微信 OpenID 获取

- 使用 `Taro.login()` 获取微信登录凭证（code）
- 当前实现使用 code 作为临时 OpenID（演示用）
- 生产环境需要后端接口将 code 换取真实 OpenID

### 3. 错误处理策略

- **桌台不可用**：Modal 提示，用户确认后返回上一页
- **Session 过期**：Toast 提示，2 秒后更新页面文本
- **网络错误**：Toast 提示，更新页面文本为"网络错误，请重试"
- **无效二维码**：Modal 提示，更新页面文本

### 4. 页面跳转

- 使用 `Taro.redirectTo()` 跳转到菜单页（不保留当前页面）
- 避免用户返回到扫码页

## 测试

### 单元测试

```bash
cd customer-app
npm test
```

**测试结果**：

- ✅ 4/4 测试通过
- ✅ Session Store 所有功能验证通过

### 手动测试场景

1. **正常流程**：

   - 扫描有效二维码 → 创建会话成功 → 跳转菜单页

2. **桌台不可用**：

   - 扫描已禁用桌台的二维码 → 显示 Modal 提示

3. **无效二维码**：

   - 扫描不含 `qr_token` 参数的二维码 → 显示错误提示

4. **网络错误**：
   - 断网状态下扫码 → 显示网络错误提示

## 依赖项

新增依赖：

- `vitest`: ^0.34.6（测试框架）
- `@vue/test-utils`: ^2.4.1（Vue 组件测试工具）
- `jsdom`: ^22.1.0（DOM 环境模拟）

## 后续优化建议

1. **OpenID 获取**：

   - 实现后端接口 `POST /api/auth/wechat`，将 code 换取真实 OpenID
   - 更新 `getWechatOpenId()` 方法调用后端接口

2. **Session 持久化**：

   - 考虑在 App 启动时从 Storage 恢复 Session 状态
   - 验证 Session 是否仍然有效

3. **错误重试**：

   - 网络错误时提供"重试"按钮
   - 实现指数退避重试策略

4. **加载状态优化**：
   - 添加加载动画（Loading Spinner）
   - 优化加载文本提示

## 相关文件

- `src/stores/session.ts` - Session Store
- `src/pages/scan/index.vue` - 扫码入口页面
- `src/stores/session.test.ts` - 单元测试
- `src/api/index.ts` - API 封装（Task 18 实现）
- `vitest.config.ts` - 测试配置
- `src/test/setup.ts` - 测试环境设置

## 验收标准

✅ Session Store 实现完成，包含所有必要方法  
✅ 扫码页面能够解析二维码参数  
✅ 调用 `POST /api/sessions` 创建会话  
✅ 错误码 5001 显示桌台不可用提示  
✅ 错误码 5002 显示 Session 过期提示  
✅ 会话创建成功后跳转至菜单页  
✅ 单元测试全部通过（4/4）  
✅ 符合需求 1.4、1.5、3.1、10.1、10.2、10.5
