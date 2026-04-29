# Customer App 修复总结

本文档总结了 customer-app 开发过程中遇到的问题及其解决方案。

## 问题列表

### 1. ❌ TypeError: taro.taroExports.onLoad is not a function

**问题描述：**

- 扫码页面报错：`TypeError: taro.taroExports.onLoad is not a function`
- 应用无法正常启动

**根本原因：**

- Taro 4.x + Vue 3 Composition API 不支持 `onLoad` 导出
- 应该使用 `useLoad` hook

**解决方案：**

```typescript
// 修改前（错误）
import Taro, { onLoad } from '@tarojs/taro'
onLoad(async (options) => { ... })

// 修改后（正确）
import Taro, { useLoad, useRouter } from '@tarojs/taro'
const router = useRouter()
useLoad(async () => {
  const params = router.params
  ...
})
```

**详细文档：** [ONLOAD_FIX.md](./ONLOAD_FIX.md)

---

### 2. ❌ 400 Bad Request: /api/sessions

**问题描述：**

- 创建会话 API 返回 400 错误
- 提示参数验证失败

**根本原因：**

1. **参数格式不匹配**

   - 前端发送：`qr_token`, `open_id` (snake_case)
   - 后端期望：`qrToken`, `openId` (camelCase)

2. **响应数据结构不匹配**
   - 前端期望：包含完整 `table` 对象
   - 后端返回：只有 `tableId`

**解决方案：**

1. 修复参数格式：

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

2. 适配响应结构：

```typescript
const response = await post<{
  sessionToken: string
  sessionId: string
  tableId: string
  expiresAt: string
}>('/api/sessions', { ... })

// 构建简化的 table 对象
sessionStore.setSession(
  response.data.sessionToken,
  {
    id: response.data.tableId,
    tableNo: DEV_TABLE_NO,
    area: undefined,
    seatCount: undefined
  },
  openId
)
```

**详细文档：** [SESSION_API_FIX.md](./SESSION_API_FIX.md)

---

### 3. ✨ 开发模式需求

**需求描述：**

- 开发时不想每次都扫码
- 希望能直接使用默认桌号进行测试

**实现方案：**

1. **后端：创建固定 qr_token**

   - 为 A01 桌台设置固定的 UUID：`00000000-0000-0000-0000-000000000001`
   - 通过数据库迁移实现

2. **前端：添加开发模式配置**

```typescript
// 开发模式配置
const DEV_MODE = true; // 开发时设为 true，生产时设为 false
const DEV_TABLE_NO = "A01";
const DEV_QR_TOKEN = "00000000-0000-0000-0000-000000000001";

// 页面加载逻辑
useLoad(async () => {
  const qrToken = router.params?.qr_token || router.params?.scene;

  // 开发模式：无参数时使用默认桌号
  if (!qrToken && DEV_MODE) {
    await createDevSession(openId);
    return;
  }

  // 正常模式：需要有效的二维码
  if (!qrToken) {
    showError("无效的二维码");
    return;
  }

  await createSession(qrToken, openId);
});
```

**使用方法：**

- 开发时：`DEV_MODE = true`，直接打开小程序即可
- 生产时：`DEV_MODE = false`，必须扫码才能进入

**详细文档：** [DEV_MODE.md](./DEV_MODE.md)

---

## 修改的文件

### 后端

- ✅ `backend/database/migrations/20260428000001-add-dev-qr-token.js` (新建)
  - 为 A01 桌台设置固定的开发用 qr_token

### 前端

- ✅ `customer-app/src/pages/scan/index.vue`
  - 修复 `onLoad` → `useLoad`
  - 修复参数格式 snake_case → camelCase
  - 适配响应数据结构
  - 添加开发模式支持

### 文档

- ✅ `customer-app/ONLOAD_FIX.md` - onLoad 错误修复说明
- ✅ `customer-app/SESSION_API_FIX.md` - Session API 修复说明
- ✅ `customer-app/DEV_MODE.md` - 开发模式使用说明
- ✅ `customer-app/FIXES_SUMMARY.md` - 本文档

---

## 快速开始

### 1. 后端准备

```bash
cd backend

# 运行数据库迁移（设置开发用 qr_token）
npx sequelize-cli db:migrate

# 启动后端服务
npm run dev
```

### 2. 前端构建

```bash
cd customer-app

# 构建小程序
npm run build:weapp
```

### 3. 测试

1. 在微信开发者工具中打开 `customer-app/dist` 目录
2. 直接打开小程序（开发模式，无需扫码）
3. 应该自动跳转到菜单页并显示 "开发模式：A01 号桌"

---

## 生产环境检查清单

在发布到生产环境前，请确保：

- [ ] 关闭开发模式：`DEV_MODE = false`
- [ ] 测试扫码功能是否正常
- [ ] 验证无二维码参数时会显示错误提示
- [ ] 检查所有 API 调用是否使用正确的参数格式（camelCase）

---

## 后续优化建议

### 1. 后端返回完整 table 信息

修改 `backend/app/controller/session.ts`，在创建会话时返回完整的 table 对象：

```typescript
ctx.body = formatResponse({
  sessionToken: result.data.sessionToken,
  sessionId: result.data.sessionId,
  table: {
    id: table.id,
    tableNo: table.table_no,
    area: table.area,
    seatCount: table.seat_count,
  },
  expiresAt: result.data.expiresAt,
});
```

### 2. 使用环境变量管理配置

```typescript
// 从环境变量读取配置
const DEV_MODE = process.env.NODE_ENV === "development";
const DEV_QR_TOKEN =
  process.env.TARO_APP_DEV_QR_TOKEN || "00000000-0000-0000-0000-000000000001";
```

### 3. 添加 table 详情 API

创建 `GET /api/tables/:id` 接口，允许前端根据 `tableId` 获取完整的桌台信息。

---

## 技术栈

- **前端框架**: Taro 4.x + Vue 3 + TypeScript
- **后端框架**: Egg.js + TypeScript
- **数据库**: PostgreSQL + Sequelize ORM

---

## 相关资源

- [Taro 4.x 文档](https://taro-docs.jd.com/docs/)
- [Vue 3 Composition API](https://vuejs.org/guide/extras/composition-api-faq.html)
- [Egg.js 文档](https://www.eggjs.org/)

---

## 版本历史

- **v1.0.0** (2024-04-28)
  - 修复 onLoad 错误
  - 修复 Session API 参数格式问题
  - 添加开发模式支持
  - 创建完整文档

---

## 联系方式

如有问题，请查看相关文档或联系开发团队。
