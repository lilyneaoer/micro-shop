# 开发模式说明

## 功能概述

为了方便开发和测试，扫码页面（`src/pages/scan/index.vue`）添加了开发模式功能。启用开发模式后，无需扫描二维码即可直接使用默认桌号进行测试。

## 配置说明

在 `src/pages/scan/index.vue` 文件中，有以下配置项：

```typescript
// 开发模式配置
const DEV_MODE = true; // 设置为 false 关闭开发模式
const DEV_TABLE_NO = "01"; // 开发模式默认桌号
```

### 配置项说明

- **`DEV_MODE`**: 开发模式开关

  - `true`: 启用开发模式
  - `false`: 关闭开发模式（生产环境请设置为 false）

- **`DEV_TABLE_NO`**: 开发模式使用的默认桌号
  - 默认值: `'01'`
  - 可以修改为任何有效的桌号，如 `'02'`, `'A01'` 等

## 工作原理

### 正常模式（DEV_MODE = false）

1. 用户扫描二维码进入小程序
2. 从二维码参数中获取 `qr_token` 或 `scene`
3. 如果没有有效的二维码参数，显示错误提示
4. 使用二维码参数创建会话

### 开发模式（DEV_MODE = true）

1. 用户直接打开小程序（无需扫码）
2. 检测到没有二维码参数时，自动启用开发模式
3. 使用配置的默认桌号（如 `01`）生成模拟的 `qr_token`
4. 自动创建会话并跳转到菜单页
5. 显示提示信息：`开发模式：01号桌`

### 模拟 Token 格式

开发模式生成的 token 格式为：

```
dev_table_{桌号}_{时间戳}
```

例如：`dev_table_01_1714234567890`

## 使用场景

### 开发调试

```typescript
const DEV_MODE = true;
const DEV_TABLE_NO = "01";
```

- 快速测试点餐流程
- 无需每次都扫描二维码
- 可以快速切换不同桌号进行测试

### 生产环境

```typescript
const DEV_MODE = false;
const DEV_TABLE_NO = "01"; // 此配置在生产环境不会被使用
```

- 必须通过扫描二维码才能进入
- 确保用户只能访问有效的桌台

## 测试步骤

1. **启用开发模式**

   ```typescript
   const DEV_MODE = true;
   const DEV_TABLE_NO = "01";
   ```

2. **重新构建**

   ```bash
   npm run build:weapp
   ```

3. **在微信开发者工具中测试**

   - 直接打开小程序（不需要扫码）
   - 应该自动跳转到菜单页
   - 会显示 "开发模式：01 号桌" 的提示

4. **测试不同桌号**
   - 修改 `DEV_TABLE_NO` 为其他桌号
   - 重新构建并测试

## 注意事项

⚠️ **重要提示**

1. **生产环境必须关闭开发模式**

   - 发布到生产环境前，务必设置 `DEV_MODE = false`
   - 否则任何人都可以不扫码直接进入系统

2. **后端验证**

   - 开发模式生成的 token 格式为 `dev_table_*`
   - 后端应该能够识别并处理这种格式的 token
   - 或者在后端也添加相应的开发模式支持

3. **数据库要求**
   - 确保数据库中存在配置的桌号（如 `01`）
   - 桌台状态应该是可用的（`status = 'available'`）

## 代码示例

### 完整的开发模式逻辑

```typescript
// 页面加载
useLoad(async () => {
  console.log("Scan page loaded with options:", router.params);

  try {
    // 解析二维码参数
    const qrToken = router.params?.qr_token || router.params?.scene;

    // 开发模式：如果没有二维码参数，使用默认桌号
    if (!qrToken && DEV_MODE) {
      console.log(`开发模式启用：使用默认 ${DEV_TABLE_NO} 号桌`);
      loadingText.value = `开发模式：${DEV_TABLE_NO}号桌`;

      // 获取 OpenID
      loadingText.value = "正在获取用户信息...";
      const openId = await getWechatOpenId();

      // 创建开发会话
      await createDevSession(openId);
      return;
    }

    // 正常流程：需要有效的二维码
    if (!qrToken) {
      Taro.showModal({
        title: "错误",
        content: "无效的二维码，请重新扫码",
        showCancel: false,
      });
      loadingText.value = "无效的二维码";
      return;
    }

    // 正常创建会话
    const openId = await getWechatOpenId();
    await createSession(qrToken, openId);
  } catch (error) {
    console.error("扫码入口处理失败:", error);
    Taro.showToast({
      title: "初始化失败，请重试",
      icon: "none",
      duration: 2000,
    });
    loadingText.value = "初始化失败，请重试";
  }
});
```

## 环境变量方案（推荐）

为了更好地管理开发/生产环境，建议使用环境变量：

```typescript
// 从环境变量读取配置
const DEV_MODE = process.env.NODE_ENV === "development";
const DEV_TABLE_NO = process.env.TARO_APP_DEV_TABLE_NO || "01";
```

这样可以通过构建命令自动切换模式，无需手动修改代码。

## 故障排查

### 问题：开发模式不生效

**可能原因：**

1. `DEV_MODE` 设置为 `false`
2. 路由参数中存在 `qr_token` 或 `scene`
3. 没有重新构建应用

**解决方案：**

1. 检查 `DEV_MODE` 配置
2. 清除路由参数，直接打开页面
3. 运行 `npm run build:weapp` 重新构建

### 问题：创建会话失败

**可能原因：**

1. 数据库中不存在指定的桌号
2. 桌台状态不可用
3. 后端不支持开发模式的 token 格式

**解决方案：**

1. 检查数据库中是否有对应桌号的记录
2. 确保桌台状态为 `available`
3. 修改后端代码以支持 `dev_table_*` 格式的 token

## 版本历史

- **v1.0.0** (2024-04-28)
  - 初始版本
  - 添加开发模式功能
  - 支持自定义默认桌号
