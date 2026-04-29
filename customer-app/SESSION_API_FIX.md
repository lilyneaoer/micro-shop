# Session API 修复说明

## 问题描述

在开发 customer-app 时遇到了以下问题：

1. **400 Bad Request 错误**: `http://localhost:7001/api/sessions` 返回 400 错误
2. **参数格式不匹配**: 前端发送 snake_case 格式，后端期望 camelCase 格式
3. **响应数据结构不匹配**: 前端期望完整的 table 对象，后端只返回 tableId

## 根本原因

### 1. 参数格式问题

**前端发送（错误）：**

```typescript
{
  qr_token: "xxx",  // snake_case
  open_id: "yyy"    // snake_case
}
```

**后端期望（正确）：**

```typescript
{
  qrToken: "xxx",   // camelCase
  openId: "yyy"     // camelCase
}
```

### 2. 响应数据结构问题

**后端返回：**

```typescript
{
  code: 0,
  data: {
    sessionToken: string,
    sessionId: string,
    tableId: string,
    expiresAt: string
  }
}
```

**前端期望：**

```typescript
{
  code: 0,
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

## 解决方案

### 1. 修复参数格式

修改 `customer-app/src/pages/scan/index.vue`，将所有 API 请求参数改为 camelCase：

```typescript
// 修改前
await post("/api/sessions", {
  qr_token: qrToken,
  open_id: openId,
});

// 修改后
await post("/api/sessions", {
  qrToken: qrToken,
  openId: openId,
});
```

### 2. 适配响应数据结构

由于后端只返回 `tableId`，前端需要适配：

```typescript
// 更新响应类型定义
const response = await post<{
  sessionToken: string;
  sessionId: string;
  tableId: string;
  expiresAt: string;
}>("/api/sessions", {
  qrToken: qrToken,
  openId: openId,
});

// 构建简化的 table 对象
if (response.code === 0 && response.data) {
  sessionStore.setSession(
    response.data.sessionToken,
    {
      id: response.data.tableId,
      tableNo: DEV_TABLE_NO, // 或从 qrToken 中提取
      area: undefined,
      seatCount: undefined,
    },
    openId,
  );
}
```

### 3. 开发模式支持

为了方便开发测试，添加了固定的 qr_token：

#### 后端修改

创建数据库迁移 `backend/database/migrations/20260428000001-add-dev-qr-token.js`：

```javascript
// 为 A01 桌台设置固定的 qr_token
const DEV_QR_TOKEN = "00000000-0000-0000-0000-000000000001";

await queryInterface.sequelize.query(
  `
  UPDATE tables 
  SET qr_token = :qrToken 
  WHERE table_no = 'A01'
`,
  {
    replacements: { qrToken: DEV_QR_TOKEN },
  },
);
```

运行迁移：

```bash
cd backend
npx sequelize-cli db:migrate
```

#### 前端配置

在 `customer-app/src/pages/scan/index.vue` 中配置：

```typescript
// 开发模式配置
const DEV_MODE = true;
const DEV_TABLE_NO = "A01";
const DEV_QR_TOKEN = "00000000-0000-0000-0000-000000000001";
```

## 修改的文件

### 后端

- ✅ `backend/database/migrations/20260428000001-add-dev-qr-token.js` (新建)

### 前端

- ✅ `customer-app/src/pages/scan/index.vue`
  - 修复参数格式（snake_case → camelCase）
  - 适配响应数据结构
  - 添加开发模式支持

## 测试步骤

### 1. 准备后端

```bash
cd backend
# 运行迁移（如果还没运行）
npx sequelize-cli db:migrate

# 启动后端服务
npm run dev
```

### 2. 构建前端

```bash
cd customer-app
npm run build:weapp
```

### 3. 测试开发模式

1. 在微信开发者工具中打开 `customer-app/dist` 目录
2. 直接打开小程序（不需要扫码）
3. 应该自动跳转到菜单页
4. 会显示 "开发模式：A01 号桌" 的提示

### 4. 验证 API 调用

在浏览器开发者工具或小程序调试器中查看网络请求：

**请求：**

```
POST http://localhost:7001/api/sessions
Content-Type: application/json

{
  "qrToken": "00000000-0000-0000-0000-000000000001",
  "openId": "xxx"
}
```

**响应：**

```json
{
  "code": 0,
  "data": {
    "sessionToken": "uuid-string",
    "sessionId": "uuid-string",
    "tableId": "uuid-string",
    "expiresAt": "2024-04-28T12:00:00.000Z"
  },
  "message": "会话创建成功"
}
```

## 注意事项

### 生产环境配置

⚠️ **发布到生产环境前，务必关闭开发模式：**

```typescript
const DEV_MODE = false; // 关闭开发模式
```

### 后续优化建议

1. **后端返回完整 table 信息**

   - 修改 `backend/app/controller/session.ts`
   - 在创建会话时查询并返回完整的 table 对象
   - 包含 `tableNo`, `area`, `seatCount` 等信息

2. **使用环境变量**

   ```typescript
   const DEV_MODE = process.env.NODE_ENV === "development";
   const DEV_QR_TOKEN =
     process.env.TARO_APP_DEV_QR_TOKEN ||
     "00000000-0000-0000-0000-000000000001";
   ```

3. **添加 table 详情 API**
   - 创建 `GET /api/tables/:id` 接口
   - 前端可以根据 `tableId` 获取完整的桌台信息

## 相关文档

- [开发模式说明](./DEV_MODE.md)
- [onLoad 修复说明](./ONLOAD_FIX.md)

## 版本历史

- **v1.0.0** (2024-04-28)
  - 修复参数格式问题
  - 适配响应数据结构
  - 添加开发模式支持
  - 创建固定 qr_token 迁移
