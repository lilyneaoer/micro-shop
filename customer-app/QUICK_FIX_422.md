# 快速修复：422 错误

## 问题

`POST http://localhost:7001/api/sessions` 返回 422 错误

## 原因

数据库中 A01 桌台的 `qr_token` 与前端配置的固定值不匹配。

可能的原因：

1. 迁移执行后，数据被重新 seed
2. 迁移没有正确执行
3. 数据库被重置

## 解决方案

### 方法 1：手动更新数据库（推荐，最快）

```bash
cd backend

# 更新 A01 桌台的 qr_token 为固定值
psql -U snow -d qr_ordering -c "UPDATE tables SET qr_token = '00000000-0000-0000-0000-000000000001' WHERE table_no = 'A01';"

# 验证更新
psql -U snow -d qr_ordering -c "SELECT table_no, qr_token, is_active FROM tables WHERE table_no = 'A01';"
```

预期输出：

```
 table_no |               qr_token               | is_active
----------+--------------------------------------+-----------
 A01      | 00000000-0000-0000-0000-000000000001 | t
```

### 方法 2：重新运行迁移

```bash
cd backend

# 回滚最后一个迁移
npx sequelize-cli db:migrate:undo

# 重新运行迁移
npx sequelize-cli db:migrate
```

### 方法 3：使用数据库中的实际 qr_token

如果不想修改数据库，可以修改前端配置使用实际的 qr_token：

1. 查询 A01 的实际 qr_token：

```bash
psql -U snow -d qr_ordering -c "SELECT qr_token FROM tables WHERE table_no = 'A01';"
```

2. 更新 `customer-app/src/pages/scan/index.vue`：

```typescript
const DEV_QR_TOKEN = "实际的-uuid-值"; // 替换为查询到的值
```

3. 重新构建：

```bash
cd customer-app
npm run build:weapp
```

## 验证修复

### 1. 测试 API

```bash
curl -X POST http://localhost:7001/api/sessions \
  -H "Content-Type: application/json" \
  -d '{"qrToken":"00000000-0000-0000-0000-000000000001","openId":"test-open-id-123"}'
```

预期响应（200 OK）：

```json
{
  "code": 0,
  "message": "会话创建成功",
  "data": {
    "sessionToken": "uuid-string",
    "sessionId": "uuid-string",
    "tableId": "uuid-string",
    "expiresAt": "2026-04-27T20:56:09.028Z"
  }
}
```

### 2. 测试小程序

1. 在微信开发者工具中打开 `customer-app/dist`
2. 直接打开小程序（不扫码）
3. 应该自动跳转到菜单页
4. 显示 "开发模式：A01 号桌"

## 常见问题

### Q: 为什么迁移执行了但数据没更新？

A: 可能是因为：

- 迁移执行后运行了 `db:seed`，重新生成了随机的 qr_token
- 数据库被重置或恢复了备份

### Q: 如何防止这个问题再次发生？

A: 有几个方案：

1. **修改 seeder**，让它在创建 A01 时使用固定的 qr_token：

```javascript
// backend/database/seeders/20240101000001-demo-merchant.js
await queryInterface.bulkInsert("tables", [
  {
    id: uuidv4(),
    merchant_id: merchantId,
    table_no: "A01",
    seat_count: 4,
    area: "A区",
    qr_token: "00000000-0000-0000-0000-000000000001", // 固定值
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
  },
  // ... 其他桌台
]);
```

2. **创建开发环境专用的 seeder**，只在开发时使用固定 token

3. **使用环境变量**，让前端从环境变量读取 qr_token

## 已执行的修复

✅ 已手动更新数据库中 A01 的 qr_token
✅ 已验证 API 正常工作（返回 200）
✅ 已重新构建前端应用

## 下次遇到 422 错误时

1. 检查数据库中的 qr_token：

```bash
psql -U snow -d qr_ordering -c "SELECT table_no, qr_token FROM tables WHERE table_no = 'A01';"
```

2. 对比前端配置的 `DEV_QR_TOKEN`

3. 如果不匹配，使用上述方法 1 快速修复

## 相关文档

- [Session API 修复说明](./SESSION_API_FIX.md)
- [开发模式说明](./DEV_MODE.md)
- [修复总结](./FIXES_SUMMARY.md)
