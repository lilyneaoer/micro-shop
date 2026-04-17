# 实现计划：扫码点餐系统

## 概述

本实现计划将扫码点餐系统拆分为以下几个阶段：

1. **后端基础设施**：项目初始化、数据库模型、中间件
2. **认证与会话**：商家 JWT 认证、顾客 Session 管理
3. **桌台与菜单管理**：桌台 CRUD、二维码生成、菜品分类管理
4. **点餐核心流程**：购物车（前端）、订单提交与验证
5. **支付流程**：微信支付集成、回调幂等处理
6. **订单状态管理**：状态机、WebSocket 实时推送
7. **Web 管理端**：Vue3 后台管理界面
8. **顾客小程序**：Taro 顾客端点餐流程
9. **商家移动端**：Taro 商家接单 App
10. **数据统计**：看板与报表
11. **测试与收尾**：集成测试、E2E 测试

每个任务均引用具体需求条款，属性测试任务标注对应属性编号。

---

## 任务

- [x] 1. 后端项目初始化与基础设施搭建

  - 使用 `egg-init` 初始化 Egg.js + TypeScript 项目，配置 `tsconfig.json`、`eslint`、`prettier`
  - 安装并配置 `egg-sequelize`（PostgreSQL ORM）、`egg-redis`、`socket.io`、`fast-check`（属性测试）、`jest`
  - 创建 `docker-compose.yml`，包含 PostgreSQL 和 Redis 测试实例
  - 实现统一响应格式工具函数 `formatResponse`（`app/utils/response.ts`），返回 `{ code, message, data }` 结构
  - 配置请求日志中间件 `app/middleware/logger.ts`，记录方法、路径、状态码、响应时间
  - 配置频率限制中间件 `app/middleware/rateLimit.ts`，同一 IP 每分钟不超过 60 次
  - 实现健康检查接口 `GET /health`，返回服务状态和数据库连接状态
  - _需求：11.1、11.4、11.5、11.6_

  - [ ]\* 1.1 为 `formatResponse` 工具函数编写属性测试
    - **属性 10：API 响应格式与金额字段不变量**
    - 验证任意输入下响应结构均包含 `code`、`message`、`data` 三个字段
    - 验证金额字段（`price`、`total_amount`、`amount`、`subtotal`）均为非负整数
    - **验证需求：11.1、11.7**

- [x] 2. 数据库模型定义

  - 在 `app/model/` 下创建所有 Sequelize 模型：`merchant.ts`、`table.ts`、`category.ts`、`dish.ts`、`sku.ts`、`session.ts`、`order.ts`、`order_item.ts`、`payment.ts`、`daily_stats.ts`
  - 所有金额字段（`price`、`price_delta`、`unit_price`、`subtotal`、`total_amount`、`amount`）使用整数类型（单位：分）
  - `order_item` 模型中 `dish_name`、`sku_name`、`unit_price` 为快照字段，创建订单时从 Dish/SKU 复制
  - 编写数据库迁移脚本，创建所有表结构及索引
  - _需求：1.1、2.2、3.5、4.1、10.2、11.7_

- [x] 3. 商家认证模块（后端）

  - 实现 `app/service/auth.ts`：密码哈希（bcrypt）、JWT 签发（24 小时有效期）、Token 刷新
  - 实现登录失败计数逻辑：使用 Redis 记录失败次数，连续 5 次失败后锁定账号 30 分钟
  - 实现 `app/middleware/auth.ts`：JWT 验证中间件，Token 无效或过期返回 HTTP 401
  - 实现 `app/controller/auth.ts`：`POST /api/auth/login`、`POST /api/auth/logout`、`POST /api/auth/refresh`
  - 使用参数化查询防止 SQL 注入
  - _需求：9.1、9.2、9.3、9.4、9.5、11.3_

  - [ ]\* 3.1 为 JWT Token 有效性验证编写属性测试

    - **属性 8：JWT Token 有效性验证**
    - 生成随机有效/过期/签名无效的 Token，验证中间件正确接受或拒绝（401）
    - **验证需求：9.2、9.4、9.5**

  - [ ]\* 3.2 为认证模块编写单元测试
    - 测试登录成功、密码错误、账号锁定、Token 过期等场景
    - _需求：9.2、9.3_

- [x] 4. 顾客会话模块（后端）

  - 实现 `app/service/session.ts`：基于 OpenID + 桌台 ID 创建或续期 Session，Session 有效期 4 小时
  - 创建新 Session 时，使用数据库事务将同一 OpenID + 桌台组合的旧有效 Session 标记为失效
  - 实现 `app/controller/session.ts`：`POST /api/sessions`（创建/恢复会话）、`GET /api/sessions/current`
  - 实现 Session Token 验证逻辑，过期返回 HTTP 401（错误码 5002）
  - _需求：10.1、10.2、10.3、10.5、10.6_

  - [ ]\* 4.1 为顾客会话唯一性编写属性测试
    - **属性 9：顾客会话唯一性**
    - 生成随机 OpenID + 桌台组合，多次创建 Session，验证同一时刻只有一条有效记录
    - **验证需求：10.6**

- [x] 5. 桌台管理模块（后端）

  - 实现 `app/service/table.ts`：桌台 CRUD，创建/更新时使用 UUID v4 生成全局唯一 `qr_token`
  - 实现 `app/controller/table.ts`：`GET/POST /api/tables`、`PUT/DELETE /api/tables/:id`、`GET /api/tables/:id/qrcode`
  - 二维码接口返回 `qr_token`，供前端使用 `qrcode` 库渲染为 PNG 图片
  - 所有桌台接口需 JWT 鉴权
  - _需求：1.1、1.2、1.6_

  - [ ]\* 5.1 为桌台二维码标识符全局唯一性编写属性测试
    - **属性 1：桌台二维码标识符全局唯一**
    - 批量生成随机数量的桌台，验证所有 `qr_token` 互不相同
    - **验证需求：1.2、1.6**

- [x] 6. 菜单管理模块（后端）

  - 实现 `app/service/menu.ts`：分类 CRUD（含排序）、菜品 CRUD、菜品可用性校验 `validateDishAvailability`
  - 实现图片上传接口 `POST /api/dishes/:id/image`：使用 Sharp 压缩至 500KB 以内，上传至对象存储
  - 实现删除菜品前置校验：若存在关联未完成订单则拒绝删除（错误码 3002）
  - 实现 `app/controller/menu.ts`：分类和菜品的完整 CRUD 接口
  - 顾客端菜单查询接口（`GET /api/dishes`）仅返回 `is_available = true` 的菜品
  - _需求：2.1、2.2、2.3、2.4、2.5、2.6、2.7_

  - [ ]\* 6.1 为下架菜品过滤编写属性测试

    - **属性 2：下架菜品不出现在顾客菜单查询结果中**
    - 生成随机菜品列表（含上架/下架任意组合），验证顾客菜单查询结果中所有菜品 `is_available` 均为 `true`
    - **验证需求：2.4**

  - [ ]\* 6.2 为菜单模块编写单元测试
    - 测试菜品创建、下架、删除（含关联订单校验）等场景
    - _需求：2.4、2.6_

- [x] 7. 订单提交与验证模块（后端）

  - 实现 `app/service/order.ts`：订单创建逻辑，包含菜品可用性校验、金额计算 `calculateOrderTotal`、订单状态机 `validateStatusTransition`
  - 创建订单时在数据库事务中同时写入 `order` 和 `order_item`（快照 `dish_name`、`sku_name`、`unit_price`）
  - 若订单中存在下架菜品，拒绝创建并返回错误码 3001 及下架菜品名称
  - 实现 `app/controller/order.ts`：`POST /api/orders`、`GET /api/orders/:id`、`GET /api/orders`、`PUT /api/orders/:id/status`、`DELETE /api/orders/:id`
  - _需求：3.5、3.6、3.7、5.1、5.4、5.5、5.6、5.7_

  - [ ]\* 7.1 为含下架菜品的订单提交拒绝编写属性测试

    - **属性 4：含下架菜品的订单提交被拒绝**
    - 生成包含至少一个下架菜品的随机订单，验证后端拒绝创建且数据库无新订单记录
    - **验证需求：3.6、3.7**

  - [ ]\* 7.2 为订单状态流转合法性编写属性测试

    - **属性 6：订单状态流转合法性**
    - 生成随机状态转换序列，验证合法转换被接受、非法转换（含状态回退）被拒绝
    - **验证需求：5.1、5.6**

  - [ ]\* 7.3 为订单金额计算编写单元测试
    - 测试 `calculateOrderTotal` 函数，覆盖含 SKU 价格差异、多商品、边界值等场景
    - _需求：3.3_

- [x] 8. 支付模块（后端）

  - 实现 `app/service/payment.ts`：调用微信支付 v3 API 创建预支付订单、RSA 签名验证、退款接口调用
  - 实现支付回调幂等处理 `handlePaymentNotify`：使用数据库事务，先查询订单状态，若已非"待支付"则直接返回成功
  - 实现 `app/controller/payment.ts`：`POST /api/payments/prepay`、`POST /api/payments/notify`
  - 实现退款接口 `POST /api/orders/:id/refund`：校验退款金额不超过实付金额（错误码 4003）
  - 实现定时任务 `app/schedule/cancelExpiredOrders.ts`：每分钟扫描超过 15 分钟未支付的订单，批量更新为"已取消"
  - _需求：4.1、4.2、4.3、4.4、4.6、4.7、7.4、7.5、7.6_

  - [ ]\* 8.1 为支付回调幂等性编写属性测试

    - **属性 5：支付回调幂等性**
    - 生成随机订单，模拟 N 次（N 为随机正整数）相同支付回调，验证订单状态只更新一次，Payment 记录只有一条
    - **验证需求：4.7**

  - [ ]\* 8.2 为退款金额约束编写属性测试

    - **属性 7：退款金额约束**
    - 生成随机退款金额，验证超出实付金额时被拒绝（错误码 4003）、不超出时被接受
    - **验证需求：7.4**

  - [ ]\* 8.3 为支付模块编写单元测试
    - 测试签名验证失败、预支付创建失败、退款失败等异常场景
    - _需求：4.4、7.6_

- [x] 9. WebSocket 实时推送模块（后端）

  - 实现 `app/service/websocket.ts`：基于 socket.io 管理商家 Room 和桌台 Room
  - 连接鉴权：商家端携带 JWT Token，顾客端携带 Session Token，服务端验证后加入对应 Room
  - 实现订单状态变更时推送 `order:status_changed` 事件至相关 Room
  - 实现新订单到达时推送 `order:new` 事件至商家 Room
  - _需求：5.2、5.3、6.1_

- [x] 10. 数据统计模块（后端）

  - 实现 `app/service/stats.ts`：看板数据查询（今日营业额、订单数、客单价、本月营业额）
  - 实现营业额趋势查询（最长 90 天），超过 7 天从 `daily_stats` 预计算缓存读取
  - 实现菜品销量排行查询（前 10 名）
  - 实现定时任务 `app/schedule/aggregateDailyStats.ts`：每日凌晨聚合前一天统计数据写入 `daily_stats`
  - 实现 `app/controller/stats.ts`：`GET /api/stats/dashboard`、`GET /api/stats/revenue`、`GET /api/stats/dishes`
  - _需求：8.1、8.2、8.3、8.5、8.6_

- [x] 11. 后端检查点 - 确保所有后端测试通过

  - 运行 `jest` 确保所有单元测试和属性测试通过
  - 使用 Docker Compose 启动测试数据库，运行集成测试（supertest）
  - 验证所有 API 端点响应格式符合 `{ code, message, data }` 规范
  - 如有问题，请向用户反馈。

- [x] 12. Web 管理端项目初始化

  - 使用 `create-vue` 初始化 Vue3 + TypeScript + Pinia + Vue Router 项目
  - 安装并配置 Element Plus（按需引入）、axios、socket.io-client、qrcode
  - 配置 `vite.config.ts`：API 代理、路径别名
  - 实现 `src/api/index.ts`：axios 实例封装，统一处理响应格式、401 自动跳转登录
  - 实现 `src/composables/useWebSocket.ts`：WebSocket 连接管理，支持指数退避重连
  - _需求：9.1、11.1_

- [x] 13. Web 管理端认证与路由

  - 实现 `src/stores/auth.ts`（Pinia）：存储 Token、用户信息，提供登录/登出 Action
  - 实现登录页 `src/views/login/index.vue`：用户名密码表单，调用登录接口，成功后跳转看板
  - 配置 Vue Router 路由守卫：未登录时重定向至登录页
  - _需求：9.1、9.2_

- [x] 14. Web 管理端桌台管理页面

  - 实现 `src/stores/tables.ts`（Pinia）：桌台列表状态管理
  - 实现 `src/views/tables/index.vue`：桌台列表（Element Plus Table）、新增/编辑/删除操作
  - 实现二维码下载功能：调用 `GET /api/tables/:id/qrcode` 获取 `qr_token`，使用 `qrcode` 库渲染为 PNG（≥300×300 像素）并触发下载
  - _需求：1.1、1.2、1.3_

- [x] 15. Web 管理端菜单管理页面

  - 实现 `src/stores/menu.ts`（Pinia）：分类和菜品状态管理
  - 实现 `src/views/menu/index.vue`：分类管理（含排序拖拽）、菜品列表（含上下架切换）
  - 实现菜品表单：名称、描述、价格（元，前端转换为分提交）、图片上传、SKU 配置
  - 图片上传组件：调用 `POST /api/dishes/:id/image`，展示上传进度和预览
  - _需求：2.1、2.2、2.3、2.5_

- [x] 16. Web 管理端订单管理页面

  - 实现 `src/stores/orders.ts`（Pinia）：订单列表状态管理，监听 WebSocket `order:new` 和 `order:status_changed` 事件
  - 实现 `src/views/orders/index.vue`：订单列表，支持按日期范围、状态、桌号筛选
  - 实现订单详情弹窗：展示菜品列表、顾客备注、支付信息、状态变更操作按钮
  - 实现退款功能：输入退款金额（不超过实付金额），调用退款接口
  - _需求：7.1、7.2、7.3、7.4、7.5、7.6_

- [x] 17. Web 管理端数据看板与报表页面

  - 实现 `src/composables/useStats.ts`：封装统计数据查询逻辑
  - 实现 `src/views/dashboard/index.vue`：今日营业额、订单数、客单价、本月营业额卡片
  - 实现 `src/views/stats/index.vue`：使用 AntV G2 渲染营业额折线图（最长 90 天）和菜品销量柱状图（前 10）
  - _需求：8.1、8.2、8.3_

- [x] 18. 顾客小程序项目初始化

  - 使用 Taro CLI 初始化 Taro + Vue3 + TypeScript 项目，目标平台：微信小程序
  - 安装并配置 Taro UI、Pinia、socket.io-client（小程序兼容版）
  - 实现 `src/api/index.ts`：封装 `Taro.request`，统一处理响应格式和 Session Token 注入
  - 配置小程序 `app.config.ts`：页面路由、网络请求域名白名单
  - _需求：3.1、10.1_

- [x] 19. 顾客小程序扫码入口与会话创建

  - 实现 `src/stores/session.ts`（Pinia）：存储 Session Token 和桌台信息
  - 实现 `src/pages/scan/index.vue`：解析二维码 URL 参数（`qr_token`），调用 `POST /api/sessions` 创建会话
  - 若桌台不可用（错误码 5001），展示"该桌台不可用，请联系服务员"提示
  - 若 Session 过期（错误码 5002），提示顾客重新扫码
  - 会话创建成功后跳转至菜单页
  - _需求：1.4、1.5、3.1、10.1、10.2、10.5_

- [x] 20. 顾客小程序菜单浏览与购物车

  - 实现 `src/stores/cart.ts`（Pinia）：购物车状态管理，包含添加/修改/移除商品、计算总金额
  - 购物车总金额计算：`totalAmount = sum(item.unit_price × item.quantity)`，数量为 0 时自动移除该项
  - 实现 `src/pages/menu/index.vue`：按分类展示上架菜品，支持按名称搜索，底部购物车悬浮栏
  - 实现 `src/pages/cart/index.vue`：购物车详情，展示菜品名称、数量、单价、总金额，支持修改数量
  - _需求：2.7、3.2、3.3、3.4_

  - [ ]\* 20.1 为购物车状态不变量编写属性测试

    - **属性 3：购物车状态不变量**
    - 生成随机购物车操作序列（添加、修改数量、设为 0），验证总金额始终等于 `sum(unit_price × quantity)`，数量为 0 的项不出现在购物车中
    - **验证需求：3.3、3.4**

  - [ ]\* 20.2 为购物车 Store 编写单元测试（Vitest）
    - 测试添加商品、累加数量、数量归零自动移除、总金额计算等场景
    - _需求：3.2、3.3、3.4_

- [x] 21. 顾客小程序订单提交与支付

  - 实现 `src/pages/order-confirm/index.vue`：展示订单详情（菜品列表、总金额）、顾客备注输入框，提交订单
  - 实现 `src/pages/payment/index.vue`：调用 `POST /api/payments/prepay` 获取支付参数，调用 `Taro.requestPayment` 发起微信支付
  - 实现 `src/pages/order-success/index.vue`：展示支付成功、订单编号、预计等待时间
  - 若订单中含下架菜品，展示错误提示（含下架菜品名称）
  - _需求：3.5、3.6、3.7、3.8、4.1、4.5_

- [x] 22. 顾客小程序订单列表与实时状态

  - 实现 `src/stores/orders.ts`（Pinia）：当前 Session 内的订单列表，监听 WebSocket `order:status_changed` 事件
  - 实现 `src/pages/order-list/index.vue`：展示当前 Session 内所有订单及状态，支持取消"待支付"状态的订单
  - 订单状态更新延迟不超过 5 秒（WebSocket 推送）
  - 实现 WebSocket 断线指数退避重连（1s → 2s → 4s → 8s，最大 30s）
  - _需求：5.2、5.3、5.7、10.3、10.4_

- [x] 23. 商家移动端项目初始化与认证

  - 使用 Taro CLI 初始化商家 App 项目（Taro + Vue3 + TypeScript，目标平台：App）
  - 安装并配置 Taro UI、Pinia、socket.io-client
  - 实现 `src/stores/auth.ts`（Pinia）：Token 持久化存储（`Taro.setStorageSync`）
  - 实现 `src/pages/login/index.vue`：用户名密码登录，成功后持久化 Token 并跳转订单列表
  - Token 过期时自动跳转登录页并清除本地存储
  - _需求：9.6、9.7_

- [x] 24. 商家移动端订单接收与处理

  - 实现 `src/stores/orders.ts`（Pinia）：订单列表状态管理，监听 WebSocket `order:new` 和 `order:status_changed` 事件
  - 实现 `src/pages/order-list/index.vue`：待处理订单列表（桌号、下单时间、菜品列表、总金额），支持按状态筛选
  - 实现 `src/pages/order-detail/index.vue`：订单详情，提供接单和完成操作按钮
  - 新订单到达时播放提示音（`Taro.vibrateShort` + 音频 API），10 秒内收到推送
  - App 后台运行时持续监听 WebSocket 推送
  - _需求：6.1、6.2、6.3、6.4、6.5、6.6_

- [x] 25. 商家移动端数据汇总页面

  - 实现 `src/pages/stats/index.vue`：展示今日营业额、今日订单数、待处理订单数
  - 调用 `GET /api/stats/dashboard` 获取数据
  - _需求：8.4_

- [x] 26. 集成测试

  <!-- - 使用 supertest + Docker Compose 测试数据库编写集成测试 -->

  - 覆盖完整点餐流程：创建会话 → 查询菜单 → 提交订单 → 支付回调 → 状态变更
  - 覆盖商家登录及 Token 验证流程
  - 覆盖 WebSocket 订单状态推送
  - _需求：3.1 ~ 5.7、9.1 ~ 9.5_

- [x] 27. Web 管理端 E2E 测试（Playwright）

  - 编写 E2E 测试：商家登录 → 创建桌台 → 下载二维码
  - 编写 E2E 测试：商家创建菜品 → 上传图片 → 上架
  - 编写 E2E 测试：商家查看订单列表 → 接单 → 完成
  - _需求：1.1 ~ 1.3、2.1 ~ 2.5、7.1 ~ 7.3_

- [x] 28. 最终检查点 - 确保所有测试通过
  - 运行后端全量测试（`jest --runInBand`），确保单元测试、属性测试、集成测试全部通过
  - 运行前端单元测试（`vitest --run`），确保购物车等核心逻辑测试通过
  - 运行 Playwright E2E 测试，确保关键用户流程正常
  - 如有问题，请向用户反馈。

---

## 备注

- 标注 `*` 的子任务为可选任务，可在 MVP 阶段跳过以加快交付速度
- 每个任务均引用具体需求条款，确保可追溯性
- 属性测试使用 `fast-check` 库，每个属性至少运行 100 次迭代
- 单元测试使用 Jest（后端）和 Vitest（前端）
- 集成测试使用 supertest + Docker Compose 测试数据库
- E2E 测试使用 Playwright
- 所有金额字段在前端以"元"展示，提交时转换为"分"，后端始终以"分"存储和传输
