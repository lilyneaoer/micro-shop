# 菜品占位图说明

## 📸 功能说明

为没有图片的菜品添加了占位图显示，提升用户体验。

## 🎨 设计方案

### 占位图样式

- **背景**：渐变灰色 (`#f5f5f5` → `#e8e8e8`)
- **边框**：虚线边框 (`2rpx dashed #d0d0d0`)
- **图标**：餐具 emoji 🍽️
- **尺寸**：与真实图片相同
  - 菜单页面：160rpx × 160rpx
  - 购物车页面：120rpx × 120rpx

### 视觉效果

```
┌─────────────────┐
│                 │
│                 │
│       🍽️       │  ← 餐具图标
│                 │
│                 │
└─────────────────┘
  虚线边框 + 渐变背景
```

## 📝 实现细节

### 1. 菜单页面 (DishList.vue)

**模板结构**：

```vue
<view :class="$style.dishImageWrapper">
  <image
    v-if="dish.imageUrl"
    :src="dish.imageUrl"
    :class="$style.dishImage"
    mode="aspectFill"
  />
  <view v-else :class="$style.dishPlaceholder">
    <view :class="$style.placeholderIcon">🍽️</view>
  </view>
</view>
```

**样式定义**：

```less
.dishImageWrapper {
  width: 160rpx;
  height: 160rpx;
  margin-right: 24rpx;
  flex-shrink: 0;
}

.dishImage {
  width: 100%;
  height: 100%;
  border-radius: 8rpx;
  object-fit: cover;
}

.dishPlaceholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%);
  border-radius: 8rpx;
  border: 2rpx dashed #d0d0d0;
}

.placeholderIcon {
  font-size: 64rpx;
  opacity: 0.5;
}
```

### 2. 购物车页面 (cart/index.vue)

**模板结构**：

```vue
<view :class="$style.itemImageWrapper">
  <image
    v-if="item.imageUrl"
    :src="item.imageUrl"
    :class="$style.itemImage"
    mode="aspectFill"
  />
  <view v-else :class="$style.itemPlaceholder">
    <view :class="$style.placeholderIcon">🍽️</view>
  </view>
</view>
```

**样式定义**：

```less
.itemImageWrapper {
  width: 120rpx;
  height: 120rpx;
  margin-right: 24rpx;
  flex-shrink: 0;
}

.itemImage {
  width: 100%;
  height: 100%;
  border-radius: 8rpx;
  object-fit: cover;
}

.itemPlaceholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%);
  border-radius: 8rpx;
  border: 2rpx dashed #d0d0d0;
}

.placeholderIcon {
  font-size: 48rpx;
  opacity: 0.5;
}
```

## 🎯 优势

### 1. 用户体验提升

- ✅ 避免空白区域，视觉更完整
- ✅ 清晰标识无图片状态
- ✅ 保持布局一致性

### 2. 视觉设计

- ✅ 渐变背景更有质感
- ✅ 虚线边框区分真实图片
- ✅ 餐具图标语义明确

### 3. 代码实现

- ✅ 使用 CSS 实现，无需额外资源
- ✅ 响应式设计，适配不同尺寸
- ✅ 使用 CSS Modules，样式隔离

## 🔄 替代方案

如果需要更换占位图标，可以考虑：

### Emoji 图标

- 🍽️ 餐具（当前使用）
- 🍴 刀叉
- 🥘 炖锅
- 🍜 面条
- 🍱 便当
- 📷 相机（表示缺少照片）

### 文字提示

```vue
<view :class="$style.placeholderText">暂无图片</view>
```

### SVG 图标

可以使用自定义 SVG 图标替代 emoji：

```vue
<svg viewBox="0 0 24 24" :class="$style.svgIcon">
  <path d="M..." />
</svg>
```

## 📱 兼容性

- ✅ 微信小程序
- ✅ H5
- ✅ 支付宝小程序
- ✅ 其他 Taro 支持的平台

## 🎨 自定义配置

如需修改占位图样式，可调整以下参数：

```less
// 背景渐变
background: linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%);

// 边框样式
border: 2rpx dashed #d0d0d0;

// 图标大小
font-size: 64rpx; // 菜单页面
font-size: 48rpx; // 购物车页面

// 图标透明度
opacity: 0.5;

// 圆角
border-radius: 8rpx;
```

## 📊 效果对比

### 修改前

```
┌─────────────────┐
│                 │
│                 │
│   （空白）      │
│                 │
│                 │
└─────────────────┘
```

### 修改后

```
┌─────────────────┐
│  ┌───────────┐  │
│  │           │  │
│  │    🍽️    │  │
│  │           │  │
│  └───────────┘  │
└─────────────────┘
```

## 🚀 未来优化

可以考虑的进一步优化：

1. 支持自定义占位图
2. 根据分类显示不同图标
3. 添加加载动画
4. 支持图片加载失败时显示占位图
5. 添加点击占位图上传图片功能（商家端）
