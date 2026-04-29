# 后端 API 字段命名转换总结

## 任务完成情况

✅ **已完成**：将后端所有接口返回的数据字段名从 snake_case 修改为 camelCase

## 实现方案

### 1. 创建转换工具

创建了 `backend/app/utils/caseConverter.ts`，包含：

- `snakeToCamel()` - 字符串转换
- `convertKeysToCamelCase()` - 对象键名递归转换
- `modelToCamelCase()` - Sequelize 模型转换

### 2. 修改服务层

在以下服务文件中添加了数据转换：

- ✅ `backend/app/service/menu.ts` - 分类和菜品相关
- ✅ `backend/app/service/order.ts` - 订单相关
- ✅ `backend/app/service/stats.ts` - 统计相关
- ✅ `backend/app/service/table.ts` - 桌台相关

### 3. 修改控制器层

在以下控制器中修改了手动构造的响应对象：

- ✅ `backend/app/controller/menu.ts` - 图片上传返回
- ✅ `backend/app/controller/order.ts` - 错误响应和退款返回
- ✅ `backend/app/controller/payment.ts` - 预支付返回

### 4. 保持向后兼容

- ✅ 输入参数同时支持 snake_case 和 camelCase
- ✅ 数据库层保持 snake_case 不变
- ✅ Sequelize 模型配置保持 `underscored: true`

## 测试结果

### 单元测试

- ✅ 转换工具测试：13/13 通过
- ✅ 服务层测试：105/105 通过

### 覆盖的 API 端点

所有主要 API 端点的返回数据已转换为 camelCase：

1. **分类管理** (`/api/categories`)

   - GET /api/categories - 获取分类列表
   - POST /api/categories - 创建分类
   - PUT /api/categories/:id - 更新分类
   - DELETE /api/categories/:id - 删除分类

2. **菜品管理** (`/api/dishes`)

   - GET /api/dishes - 获取菜品列表（包含 SKU）
   - POST /api/dishes - 创建菜品
   - PUT /api/dishes/:id - 更新菜品
   - DELETE /api/dishes/:id - 删除菜品
   - POST /api/dishes/:id/image - 上传菜品图片

3. **订单管理** (`/api/orders`)

   - GET /api/orders - 获取订单列表
   - GET /api/orders/:id - 获取订单详情
   - POST /api/orders - 创建订单
   - PUT /api/orders/:id/status - 更新订单状态
   - DELETE /api/orders/:id - 取消订单
   - POST /api/orders/:id/refund - 退款

4. **桌台管理** (`/api/tables`)

   - GET /api/tables - 获取桌台列表
   - POST /api/tables - 创建桌台
   - PUT /api/tables/:id - 更新桌台
   - DELETE /api/tables/:id - 删除桌台
   - GET /api/tables/:id/qrcode - 获取二维码

5. **统计数据** (`/api/stats`)

   - GET /api/stats/dashboard - 仪表盘数据
   - GET /api/stats/revenue - 营收趋势
   - GET /api/stats/dishes - 菜品销量排行

6. **支付** (`/api/payments`)

   - POST /api/payments/prepay - 创建预支付订单
   - POST /api/payments/notify - 支付回调

7. **会话** (`/api/sessions`)

   - POST /api/sessions - 创建会话
   - GET /api/sessions/current - 获取当前会话

8. **认证** (`/api/auth`)
   - POST /api/auth/login - 登录
   - POST /api/auth/logout - 登出
   - POST /api/auth/refresh - 刷新 Token

## 字段转换示例

常见字段转换对照表：

| snake_case         | camelCase         |
| ------------------ | ----------------- |
| user_id            | userId            |
| merchant_id        | merchantId        |
| table_id           | tableId           |
| order_id           | orderId           |
| dish_id            | dishId            |
| sku_id             | skuId             |
| category_id        | categoryId        |
| session_id         | sessionId         |
| created_at         | createdAt         |
| updated_at         | updatedAt         |
| paid_at            | paidAt            |
| expires_at         | expiresAt         |
| table_no           | tableNo           |
| seat_count         | seatCount         |
| qr_token           | qrToken           |
| qr_url             | qrUrl             |
| is_active          | isActive          |
| is_available       | isAvailable       |
| has_sku            | hasSku            |
| sort_order         | sortOrder         |
| image_url          | imageUrl          |
| total_amount       | totalAmount       |
| unit_price         | unitPrice         |
| dish_name          | dishName          |
| sku_name           | skuName           |
| order_no           | orderNo           |
| customer_remark    | customerRemark    |
| price_delta        | priceDelta        |
| order_count        | orderCount        |
| today_revenue      | todayRevenue      |
| prepay_id          | prepayId          |
| payment_params     | paymentParams     |
| refund_id          | refundId          |
| unavailable_dishes | unavailableDishes |

## 相关文档

- 📄 `backend/CAMELCASE_CONVERSION.md` - 详细实现文档
- 📄 `backend/API_RESPONSE_EXAMPLES.md` - API 响应示例对比
- 🧪 `backend/test/utils/caseConverter.test.ts` - 单元测试

## 后续工作建议

1. **前端适配**

   - 更新前端代码以使用新的 camelCase 字段名
   - 移除前端的字段名转换逻辑（如果有）

2. **文档更新**

   - 更新 API 文档（Swagger/OpenAPI）
   - 更新前端接口类型定义

3. **测试验证**

   - 运行完整的集成测试
   - 测试前后端联调

4. **WebSocket 检查**
   - WebSocket 推送已经使用 camelCase，无需修改

## 注意事项

⚠️ **重要提示**：

1. 数据库字段仍然使用 snake_case，只在 API 响应时转换
2. 输入参数同时支持两种格式，确保向后兼容
3. 所有嵌套对象和数组都会被递归转换
4. null 值和原始类型保持不变
5. 时间戳格式（ISO 8601）保持不变

## 影响评估

### 破坏性变更

- ✅ 是的，这是一个破坏性变更
- ✅ 前端需要相应更新字段名

### 兼容性

- ✅ 输入参数保持向后兼容
- ✅ 数据库层无变化
- ✅ 服务层逻辑无变化

### 性能影响

- ✅ 转换开销极小（仅对象键名转换）
- ✅ 不影响数据库查询性能
- ✅ 不影响业务逻辑性能
