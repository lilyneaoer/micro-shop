# 菜单页面重构说明

## 📁 目录结构

```
src/pages/menu/
├── index.vue                    # 主页面（业务逻辑）
├── index.config.ts              # 页面配置
├── REFACTORING.md               # 本文档
└── components/                  # 页面组件
    ├── SearchBar.vue            # 搜索栏组件
    ├── CategoryList.vue         # 分类列表组件
    ├── DishList.vue             # 菜品列表组件
    ├── CartBar.vue              # 购物车悬浮栏组件
    └── README.md                # 组件使用文档
```

## 🎯 重构目标

将原本 400+ 行的单文件组件拆分为：

- 1 个主页面（业务逻辑）
- 4 个子组件（UI 展示）
- 1 个类型定义文件（类型共享）

## 📦 组件职责

### 主页面 (index.vue)

**职责**：业务逻辑和状态管理

- 数据获取（API 调用）
- 状态管理（分类选择、搜索过滤）
- 购物车操作（添加、增加、减少）
- 路由跳转

**代码量**：~150 行

### 子组件

#### 1. SearchBar.vue

**职责**：搜索输入

- 提供搜索输入框
- 双向绑定搜索关键词

**代码量**：~40 行

#### 2. CategoryList.vue

**职责**：分类导航

- 显示左侧分类列表
- 高亮当前选中分类
- 触发分类切换事件

**代码量**：~80 行

#### 3. DishList.vue

**职责**：菜品展示

- 按分类分组展示菜品
- 显示菜品详情（图片、名称、描述、价格）
- 集成购物车操作按钮
- 处理加载和空状态

**代码量**：~250 行

#### 4. CartBar.vue

**职责**：购物车摘要

- 显示购物车总数量和总金额
- 提供结算入口
- 自动隐藏（数量为 0 时）

**代码量**：~80 行

## 🔄 数据流

```
┌─────────────────────────────────────────────────────────┐
│                      index.vue                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │ 业务逻辑层                                        │  │
│  │ - API 调用                                        │  │
│  │ - 状态管理 (categories, dishes, searchKeyword)   │  │
│  │ - 购物车操作 (addToCart, increaseQuantity, etc.) │  │
│  └──────────────────────────────────────────────────┘  │
│                          ↓                              │
│  ┌──────────────────────────────────────────────────┐  │
│  │ 组件层                                            │  │
│  │                                                    │  │
│  │  SearchBar ←→ v-model                            │  │
│  │                                                    │  │
│  │  CategoryList ← categories, currentCategoryId     │  │
│  │               → @select                           │  │
│  │                                                    │  │
│  │  DishList ← dishes, categories, cartQuantities   │  │
│  │           → @add, @increase, @decrease           │  │
│  │                                                    │  │
│  │  CartBar ← totalQuantity, totalAmount            │  │
│  │          → @click                                 │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## 🎨 样式方案

所有组件使用 **CSS Modules**：

- `<style lang="less" module>`
- 通过 `$style` 对象访问类名
- 类名使用 camelCase 命名

**优势**：

- 样式作用域隔离
- 避免全局污染
- 类名自动哈希化
- TypeScript 类型支持

## 📝 类型定义

共享类型位于 `src/types/menu.ts`：

```typescript
// 分类接口
interface Category {
  id: string;
  name: string;
  sortOrder: number;
}

// 菜品接口
interface Dish {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl?: string;
  categoryId: string;
  isAvailable: boolean;
  category?: {
    id: string;
    name: string;
    sortOrder: number;
  };
}

// 分组后的菜品
interface GroupedDishes {
  categoryId: string;
  categoryName: string;
  dishes: Dish[];
}
```

## ✅ 重构优势

### 1. 可维护性 ⬆️

- 每个组件职责单一
- 代码结构清晰
- 易于理解和修改

### 2. 可复用性 ⬆️

- 组件可在其他页面复用
- 减少代码重复

### 3. 可测试性 ⬆️

- 组件独立
- 便于单元测试
- 易于 mock 数据

### 4. 团队协作 ⬆️

- 清晰的目录结构
- 组件边界明确
- 减少代码冲突

### 5. 性能优化 ⬆️

- 组件按需加载
- 更细粒度的更新控制

## 🚀 使用示例

```vue
<template>
  <view :class="$style.menuPage">
    <!-- 搜索栏 -->
    <SearchBar v-model="searchKeyword" />

    <!-- 主内容区域 -->
    <view :class="$style.mainContent">
      <!-- 左侧分类 -->
      <CategoryList
        v-if="!searchKeyword"
        :categories="categories"
        :current-category-id="currentCategoryId"
        @select="selectCategory"
      />

      <!-- 右侧菜品 -->
      <DishList
        :dishes="displayDishes"
        :categories="categories"
        :loading="loading"
        :cart-quantities="cartQuantities"
        @add="addToCart"
        @increase="increaseQuantity"
        @decrease="decreaseQuantity"
      />
    </view>

    <!-- 购物车栏 -->
    <CartBar
      :total-quantity="cartStore.totalQuantity"
      :total-amount="cartStore.totalAmount"
      @click="goToCart"
    />
  </view>
</template>
```

## 📚 相关文档

- [组件使用文档](./components/README.md)
- [类型定义](../../types/menu.ts)
- [购物车 Store](../../stores/cart.ts)
- [会话 Store](../../stores/session.ts)

## 🔧 开发建议

1. **修改组件样式**：直接编辑对应组件的 `<style>` 部分
2. **添加新功能**：优先考虑是否需要新建组件
3. **修改业务逻辑**：在 `index.vue` 中修改
4. **添加新类型**：在 `src/types/menu.ts` 中添加
5. **测试组件**：可以单独测试每个组件

## 📊 代码统计

| 文件             | 行数     | 职责     |
| ---------------- | -------- | -------- |
| index.vue        | ~150     | 业务逻辑 |
| SearchBar.vue    | ~40      | 搜索输入 |
| CategoryList.vue | ~80      | 分类导航 |
| DishList.vue     | ~250     | 菜品展示 |
| CartBar.vue      | ~80      | 购物车栏 |
| **总计**         | **~600** | -        |

**重构前**：单文件 ~400 行（功能较少）  
**重构后**：多文件 ~600 行（功能更完善，结构更清晰）

## 🎉 总结

通过组件化重构，菜单页面的代码结构更加清晰，每个组件职责单一，便于维护和扩展。同时使用 CSS Modules 确保样式隔离，使用 TypeScript 类型定义确保类型安全。
