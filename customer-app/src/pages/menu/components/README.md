# 菜单页面组件说明

本目录包含菜单页面的子组件。

## 组件列表

### 1. SearchBar.vue

**搜索栏组件**

- **功能**：提供菜品搜索输入框
- **Props**：
  - `modelValue: string` - 搜索关键词（支持 v-model）
- **Events**：
  - `update:modelValue` - 搜索关键词变化时触发
- **使用示例**：
  ```vue
  <SearchBar v-model="searchKeyword" />
  ```

### 2. CategoryList.vue

**分类列表组件**

- **功能**：显示左侧垂直分类导航
- **Props**：
  - `categories: Category[]` - 分类列表
  - `currentCategoryId: string` - 当前选中的分类 ID
- **Events**：
  - `select(categoryId: string)` - 选择分类时触发
- **特性**：
  - 垂直滚动
  - 激活状态高亮（白色背景 + 橙色文字 + 左侧指示条）
  - 固定宽度 180rpx
- **使用示例**：
  ```vue
  <CategoryList
    :categories="categories"
    :current-category-id="currentCategoryId"
    @select="selectCategory"
  />
  ```

### 3. DishList.vue

**菜品列表组件**

- **功能**：显示右侧菜品内容，支持购物车操作
- **Props**：
  - `dishes: Dish[]` - 菜品列表
  - `categories: Category[]` - 分类列表（用于分组显示）
  - `loading?: boolean` - 加载状态
  - `emptyText?: string` - 空状态提示文字
  - `cartQuantities: Record<string, number>` - 购物车数量映射
- **Events**：
  - `add(dish: Dish)` - 添加到购物车时触发
  - `increase(dish: Dish)` - 增加数量时触发
  - `decrease(dishId: string)` - 减少数量时触发
- **特性**：
  - 按分类分组展示
  - 分类标题吸顶（sticky）
  - 支持加载和空状态
  - 集成购物车操作按钮
- **使用示例**：
  ```vue
  <DishList
    :dishes="displayDishes"
    :categories="categories"
    :loading="loading"
    :empty-text="'未找到相关菜品'"
    :cart-quantities="cartQuantities"
    @add="addToCart"
    @increase="increaseQuantity"
    @decrease="decreaseQuantity"
  />
  ```

### 4. CartBar.vue

**购物车悬浮栏组件**

- **功能**：显示购物车摘要和结算按钮
- **Props**：
  - `totalQuantity: number` - 购物车总数量
  - `totalAmount: number` - 购物车总金额（单位：分）
- **Events**：
  - `click` - 点击购物车时触发
- **特性**：
  - 固定在底部
  - 显示购物车图标 + 数量徽章
  - 显示总金额
  - 结算按钮
  - 当数量为 0 时自动隐藏
- **使用示例**：
  ```vue
  <CartBar
    :total-quantity="cartStore.totalQuantity"
    :total-amount="cartStore.totalAmount"
    @click="goToCart"
  />
  ```

## 类型定义

所有组件共享的类型定义位于 `src/types/menu.ts`：

- `Category` - 分类接口
- `Dish` - 菜品接口
- `GroupedDishes` - 分组后的菜品接口

## 样式规范

所有组件使用 CSS Modules：

- 使用 `<style lang="less" module>` 定义样式
- 通过 `$style` 对象访问类名
- 类名使用 camelCase 命名（如 `categoryList`、`dishItem`）

## 组件组合

完整的菜单页面组合见 `../index.vue`：

```vue
<template>
  <view :class="$style.menuPage">
    <SearchBar v-model="searchKeyword" />

    <view :class="$style.mainContent">
      <CategoryList
        v-if="!searchKeyword"
        :categories="categories"
        :current-category-id="currentCategoryId"
        @select="selectCategory"
      />

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

    <CartBar
      :total-quantity="cartStore.totalQuantity"
      :total-amount="cartStore.totalAmount"
      @click="goToCart"
    />
  </view>
</template>
```

## 目录结构

```
src/pages/menu/
├── index.vue              # 菜单主页面
├── index.config.ts        # 页面配置
└── components/            # 页面组件
    ├── SearchBar.vue      # 搜索栏
    ├── CategoryList.vue   # 分类列表
    ├── DishList.vue       # 菜品列表
    ├── CartBar.vue        # 购物车栏
    └── README.md          # 本文档
```
