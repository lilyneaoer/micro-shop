# 需求文档

## 简介

本系统是一套完整的餐饮店扫码点餐解决方案，涵盖四个端：

1. **Web 管理端**（商家后台）：基于 Vue3 + Element Plus + Pinia + TypeScript，供商家管理菜品、订单及查看数据报表。
2. **顾客移动端**：基于 Taro + Vue + Taro UI + TypeScript，供顾客扫描桌码后点餐、付款、查看订单状态。
3. **商家移动端**：基于 Taro + Vue + Taro UI + TypeScript，供商家在移动设备上接单、处理订单、查看数据汇总。
4. **后端服务**：基于 Egg.js + PostgreSQL + TypeScript，为三个前端提供统一的 RESTful API 支持。

系统核心流程：顾客扫描餐桌二维码 → 浏览菜单 → 加入购物车 → 提交订单并付款 → 厨房/商家接单处理 → 顾客查看订单状态。

---

## 词汇表

- **System**：整个扫码点餐系统的统称
- **Web_Admin**：Web 管理端（商家后台）
- **Customer_App**：顾客移动端小程序
- **Merchant_App**：商家移动端小程序
- **Backend**：后端服务（Egg.js）
- **Merchant**：餐厅商家/管理员
- **Customer**：到店顾客
- **Table**：餐桌
- **QR_Code**：餐桌二维码
- **Menu**：菜单（包含分类和菜品）
- **Category**：菜品分类
- **Dish**：菜品
- **Cart**：购物车
- **Order**：订单
- **Order_Item**：订单中的单个菜品条目
- **Payment**：支付记录
- **Session**：顾客就餐会话（从扫码到结账的完整过程）
- **SKU**：菜品规格（如大份/小份、辣度等）
- **Token**：身份认证令牌

---

## 需求

### 需求 1：二维码生成与桌台管理

**用户故事：** 作为商家，我希望为每张餐桌生成唯一的二维码，以便顾客扫码后能自动识别桌台并开始点餐。

#### 验收标准

1. THE Web_Admin SHALL 支持商家创建、编辑和删除餐桌信息，每张餐桌包含桌号、座位数和所属区域。
2. WHEN 商家创建或更新餐桌信息时，THE Backend SHALL 为该餐桌生成包含唯一桌台标识符的 QR_Code 数据。
3. THE Web_Admin SHALL 将 QR_Code 渲染为可下载的图片（PNG 格式，分辨率不低于 300×300 像素）。
4. WHEN 顾客使用 Customer_App 扫描 QR_Code 时，THE Customer_App SHALL 解析桌台标识符并自动跳转至该桌台的点餐页面。
5. IF QR_Code 中的桌台标识符不存在或已被禁用，THEN THE Customer_App SHALL 显示"该桌台不可用，请联系服务员"的提示信息。
6. THE Backend SHALL 保证每张餐桌的 QR_Code 标识符全局唯一。

---

### 需求 2：菜单与菜品管理

**用户故事：** 作为商家，我希望在后台管理菜品分类和菜品信息，以便顾客能看到最新的菜单。

#### 验收标准

1. THE Web_Admin SHALL 支持商家对 Category 进行增加、编辑、删除和排序操作。
2. THE Web_Admin SHALL 支持商家对 Dish 进行增加、编辑、删除操作，每个 Dish 包含名称、描述、价格、图片、所属 Category 和上架状态。
3. WHERE 商家启用 SKU 功能，THE Web_Admin SHALL 支持为单个 Dish 配置多个规格选项（如大份/小份），每个规格可独立设置价格差异。
4. WHEN 商家将 Dish 设置为下架状态时，THE Backend SHALL 在顾客端菜单查询接口中不返回该 Dish。
5. WHEN 商家上传 Dish 图片时，THE Backend SHALL 将图片压缩至不超过 500KB 后存储，并返回可访问的图片 URL。
6. IF 商家尝试删除仍存在关联未完成 Order 的 Dish，THEN THE Backend SHALL 拒绝删除并返回错误提示"该菜品存在进行中的订单，无法删除"。
7. THE Customer_App SHALL 按 Category 分组展示所有上架的 Dish，并支持按名称搜索 Dish。

---

### 需求 3：顾客扫码点餐流程

**用户故事：** 作为顾客，我希望扫描餐桌二维码后能浏览菜单、选择菜品并提交订单，以便快速完成点餐。

#### 验收标准

1. WHEN 顾客扫描 QR_Code 后，THE Customer_App SHALL 在 3 秒内完成桌台识别并展示该餐厅的 Menu。
2. THE Customer_App SHALL 支持顾客将 Dish 加入 Cart，Cart 中同一 Dish 可累加数量。
3. THE Customer_App SHALL 在 Cart 中实时显示已选 Dish 的名称、数量、单价及 Cart 总金额。
4. WHEN 顾客修改 Cart 中某 Dish 的数量为 0 时，THE Customer_App SHALL 自动从 Cart 中移除该 Dish。
5. WHEN 顾客提交 Order 时，THE Customer_App SHALL 将 Cart 内容、桌台标识符和顾客备注一并发送至 Backend。
6. THE Backend SHALL 在接收到 Order 提交请求后，验证所有 Order_Item 中的 Dish 均处于上架状态，验证通过后创建 Order 并返回 Order 编号。
7. IF Order 中存在已下架的 Dish，THEN THE Backend SHALL 拒绝创建 Order 并返回包含下架 Dish 名称的错误信息。
8. WHEN Order 创建成功后，THE Customer_App SHALL 跳转至支付页面并展示 Order 详情和应付金额。

---

### 需求 4：支付流程

**用户故事：** 作为顾客，我希望在点餐后能完成在线支付，以便无需等待服务员结账。

#### 验收标准

1. THE Customer_App SHALL 支持顾客通过微信支付完成 Payment。
2. WHEN 顾客发起支付时，THE Backend SHALL 调用微信支付接口生成预支付订单，并将支付参数返回给 Customer_App。
3. WHEN 微信支付回调通知到达时，THE Backend SHALL 验证回调签名，验证通过后将 Order 状态更新为"已支付"。
4. IF 微信支付回调签名验证失败，THEN THE Backend SHALL 拒绝处理该回调并记录异常日志。
5. WHEN Payment 成功后，THE Customer_App SHALL 展示支付成功页面，并显示 Order 编号和预计等待时间。
6. WHEN Payment 超过 15 分钟未完成时，THE Backend SHALL 自动将 Order 状态更新为"已取消"并释放相关资源。
7. THE Backend SHALL 保证同一 Order 的支付回调幂等处理，重复回调不重复更新 Order 状态。

---

### 需求 5：订单状态管理

**用户故事：** 作为商家和顾客，我希望能实时查看订单状态，以便了解订单处理进度。

#### 验收标准

1. THE Backend SHALL 维护 Order 的以下状态流转：待支付 → 已支付/待接单 → 已接单/制作中 → 已完成，以及任意状态可流转至已取消。
2. WHEN Order 状态发生变更时，THE Backend SHALL 通过 WebSocket 或服务端推送将状态变更事件推送至相关的 Customer_App 和 Merchant_App。
3. THE Customer_App SHALL 在订单详情页实时展示当前 Order 状态，状态更新延迟不超过 5 秒。
4. WHEN 商家在 Merchant_App 或 Web_Admin 中接单时，THE Backend SHALL 将 Order 状态从"已支付/待接单"更新为"已接单/制作中"。
5. WHEN 商家在 Merchant_App 或 Web_Admin 中标记订单完成时，THE Backend SHALL 将 Order 状态更新为"已完成"。
6. IF 商家尝试将 Order 状态回退至已完成之前的状态，THEN THE Backend SHALL 拒绝该操作并返回错误提示。
7. THE Customer_App SHALL 支持顾客在 Order 处于"待支付"状态时取消 Order。

---

### 需求 6：商家订单接收与处理（移动端）

**用户故事：** 作为商家，我希望在移动端实时收到新订单提醒并能快速处理订单，以便提高出餐效率。

#### 验收标准

1. WHEN 新 Order 进入"已支付/待接单"状态时，THE Merchant_App SHALL 在 10 秒内收到推送通知并播放提示音。
2. THE Merchant_App SHALL 展示待处理 Order 列表，每条 Order 显示桌号、下单时间、Order_Item 列表和总金额。
3. WHEN 商家在 Merchant_App 中点击接单时，THE Merchant_App SHALL 调用 Backend 接口将 Order 状态更新为"已接单/制作中"。
4. WHEN 商家在 Merchant_App 中点击完成时，THE Merchant_App SHALL 调用 Backend 接口将 Order 状态更新为"已完成"。
5. THE Merchant_App SHALL 支持商家查看当日所有 Order 的列表，并支持按状态筛选。
6. WHILE Merchant_App 处于后台运行状态，THE Merchant_App SHALL 持续监听新 Order 推送通知。

---

### 需求 7：Web 管理端订单管理

**用户故事：** 作为商家，我希望在 Web 管理端查看和管理所有订单，以便进行全面的订单管控。

#### 验收标准

1. THE Web_Admin SHALL 展示所有 Order 的列表，支持按日期范围、Order 状态和桌号进行筛选。
2. THE Web_Admin SHALL 支持商家查看单个 Order 的详情，包含 Order_Item 列表、顾客备注、支付信息和状态变更历史。
3. WHEN 商家在 Web_Admin 中更新 Order 状态时，THE Backend SHALL 验证状态流转合法性后执行更新。
4. THE Web_Admin SHALL 支持商家对 Order 进行退款操作，退款金额不超过 Order 实付金额。
5. WHEN 商家发起退款时，THE Backend SHALL 调用微信支付退款接口，并在退款成功后将 Order 标记为"已退款"。
6. IF 退款接口调用失败，THEN THE Backend SHALL 记录失败原因并返回错误提示，Order 状态保持不变。

---

### 需求 8：数据统计与报表

**用户故事：** 作为商家，我希望查看营业数据统计，以便了解经营状况并做出决策。

#### 验收标准

1. THE Web_Admin SHALL 在数据看板中展示今日营业额、今日订单数、今日客单价和本月营业额。
2. THE Web_Admin SHALL 以折线图形式展示指定日期范围内（最长 90 天）的每日营业额趋势。
3. THE Web_Admin SHALL 以柱状图形式展示指定日期范围内销量前 10 的 Dish 排行。
4. THE Merchant_App SHALL 展示今日营业额、今日订单数和待处理订单数的汇总数据。
5. THE Backend SHALL 提供数据统计查询接口，查询响应时间不超过 2 秒。
6. WHEN 商家查询超过 7 天的统计数据时，THE Backend SHALL 从预计算的统计缓存中返回数据，而非实时聚合计算。

---

### 需求 9：商家认证与权限管理

**用户故事：** 作为商家，我希望通过账号密码登录后台，以便安全地管理餐厅数据。

#### 验收标准

1. THE Web_Admin SHALL 提供商家登录页面，支持通过用户名和密码进行身份验证。
2. WHEN 商家提交登录表单时，THE Backend SHALL 验证用户名和密码，验证通过后返回有效期为 24 小时的 JWT Token。
3. IF 商家连续 5 次登录失败，THEN THE Backend SHALL 锁定该账号 30 分钟并返回锁定提示。
4. WHILE Token 有效，THE Backend SHALL 接受携带该 Token 的 API 请求。
5. IF 请求未携带有效 Token 或 Token 已过期，THEN THE Backend SHALL 返回 HTTP 401 状态码。
6. THE Merchant_App SHALL 支持商家通过用户名和密码登录，登录成功后本地持久化存储 Token。
7. WHEN Token 过期时，THE Merchant_App SHALL 自动跳转至登录页面并清除本地存储的 Token。

---

### 需求 10：顾客身份与就餐会话

**用户故事：** 作为顾客，我希望扫码后无需注册即可点餐，以便降低使用门槛。

#### 验收标准

1. WHEN 顾客首次扫描 QR_Code 时，THE Customer_App SHALL 通过微信授权获取顾客的 OpenID，并创建匿名 Session。
2. THE Backend SHALL 基于 OpenID 和桌台标识符创建 Session，Session 有效期为 4 小时。
3. WHILE Session 有效，THE Customer_App SHALL 允许顾客在同一桌台提交多个 Order。
4. THE Customer_App SHALL 展示顾客在当前 Session 内提交的所有 Order 及其状态。
5. IF Session 已过期，THEN THE Customer_App SHALL 提示顾客重新扫码以开始新的 Session。
6. THE Backend SHALL 保证同一 OpenID 在同一桌台同一时间只存在一个有效 Session。

---

### 需求 11：后端 API 设计规范

**用户故事：** 作为开发者，我希望后端提供规范统一的 API，以便前端能可靠地集成。

#### 验收标准

1. THE Backend SHALL 为所有 API 响应使用统一的 JSON 结构：`{ "code": number, "message": string, "data": any }`。
2. THE Backend SHALL 对所有接收 JSON 请求体的接口进行参数校验，IF 参数不合法，THEN THE Backend SHALL 返回 HTTP 400 状态码及字段级错误描述。
3. THE Backend SHALL 为所有数据库查询使用参数化查询，防止 SQL 注入攻击。
4. THE Backend SHALL 对顾客端接口实施频率限制，同一 IP 每分钟请求次数不超过 60 次。
5. THE Backend SHALL 记录所有 API 请求的方法、路径、响应状态码和响应时间至日志系统。
6. THE Backend SHALL 提供健康检查接口 `GET /health`，返回服务状态和数据库连接状态。
7. FOR ALL 涉及金额的字段，THE Backend SHALL 以整数分（分）为单位存储和传输，避免浮点数精度问题。
