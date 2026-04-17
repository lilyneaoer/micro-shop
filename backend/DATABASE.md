# 数据库初始化指南

## 数据库配置

项目使用 PostgreSQL 作为主数据库，配置信息在 `config/config.default.ts` 中。

### 默认配置

- **数据库名**: `qr_ordering`
- **用户名**: `snow` (根据你的系统用户)
- **密码**: 空 (本地开发)
- **主机**: `localhost`
- **端口**: `5432`

## 初始化步骤

### 1. 确保 PostgreSQL 正在运行

```bash
# 检查 PostgreSQL 是否运行
psql -h localhost -U snow -l
```

### 2. 运行数据库迁移

```bash
# 创建所有表结构
npm run db:migrate
```

这将创建以下表：

- `merchants` - 商户表
- `tables` - 桌台表
- `categories` - 菜品分类表
- `dishes` - 菜品表
- `skus` - 菜品规格表
- `sessions` - 用户会话表
- `orders` - 订单表
- `order_items` - 订单明细表
- `payments` - 支付记录表
- `daily_stats` - 每日统计表

### 3. 填充演示数据

```bash
# 插入演示数据
npm run db:seed
```

这将创建：

- 1个商户账号（用户名: `admin`, 密码: `admin123`）
- 3个菜品分类（热菜、凉菜、饮品）
- 5个菜品（宫保鸡丁、糖醋里脊、拍黄瓜、可乐、鲜榨果汁）
- 多个SKU规格（饮品的不同规格）
- 5个桌台（A01, A02, B01, B02, C01）

## 数据库管理命令

```bash
# 运行迁移
npm run db:migrate

# 回滚最后一次迁移
npm run db:migrate:undo

# 回滚所有迁移
npm run db:migrate:undo:all

# 运行所有种子数据
npm run db:seed

# 清除所有种子数据
npm run db:seed:undo
```

## 直接访问数据库

```bash
# 连接到数据库
psql -h localhost -U snow -d qr_ordering

# 查看所有表
\dt

# 查看表结构
\d merchants

# 查询数据
SELECT * FROM merchants;

# 退出
\q
```

## 数据库表关系

```
merchants (商户)
  ├── tables (桌台)
  │     └── sessions (会话)
  │           └── orders (订单)
  │                 ├── order_items (订单明细)
  │                 └── payments (支付)
  ├── categories (分类)
  │     └── dishes (菜品)
  │           └── skus (规格)
  └── daily_stats (统计)
```

## 价格说明

所有价格字段（`price`, `price_delta`, `amount` 等）都以**分**为单位存储（整数），避免浮点数精度问题。

例如：

- 38.00元 存储为 `3800`
- 5.00元 存储为 `500`

## 演示账号

### 商户后台登录

- **用户名**: `admin`
- **密码**: `admin123`

## 环境变量配置

如需修改数据库配置，可以设置以下环境变量：

```bash
export DB_HOST=localhost
export DB_PORT=5432
export DB_NAME=qr_ordering
export DB_USER=snow
export DB_PASSWORD=
```

或创建 `.env` 文件（需要安装 dotenv）。

## 故障排除

### 连接失败

如果遇到连接问题，检查：

1. PostgreSQL 是否正在运行
2. 用户名和密码是否正确
3. 数据库是否已创建

### 创建数据库

如果数据库不存在：

```bash
# 使用 psql 创建数据库
psql -h localhost -U snow -c "CREATE DATABASE qr_ordering;"
```

### 重置数据库

如需完全重置：

```bash
# 回滚所有迁移
npm run db:migrate:undo:all

# 重新运行迁移
npm run db:migrate

# 重新填充数据
npm run db:seed
```
