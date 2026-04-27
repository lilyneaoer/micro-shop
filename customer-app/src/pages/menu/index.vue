<template>
  <view :class="$style.menuPage">
    <!-- 搜索栏 -->
    <SearchBar v-model="searchKeyword" @update:modelValue="handleSearch" />

    <!-- 主内容区域：左侧分类 + 右侧菜品 -->
    <view :class="$style.mainContent">
      <!-- 左侧分类列表 -->
      <CategoryList
        v-if="!searchKeyword"
        :categories="categories"
        :current-category-id="currentCategoryId"
        @select="selectCategory"
      />

      <!-- 右侧菜品列表 -->
      <DishList
        :dishes="displayDishes"
        :categories="categories"
        :loading="loading"
        :empty-text="searchKeyword ? '未找到相关菜品' : '暂无菜品'"
        :cart-quantities="cartQuantities"
        @add="addToCart"
        @increase="increaseQuantity"
        @decrease="decreaseQuantity"
      />
    </view>

    <!-- 购物车悬浮栏 -->
    <CartBar
      :total-quantity="cartStore.totalQuantity"
      :total-amount="cartStore.totalAmount"
      @click="goToCart"
    />
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import Taro from '@tarojs/taro'
import { get } from '../../api'
import { useCartStore } from '../../stores/cart'
import { useSessionStore } from '../../stores/session'
import { normalizeImageUrl } from '../../utils/image'
import type { Category, Dish } from '../../types/menu'
import CategoryList from './components/CategoryList.vue'
import DishList from './components/DishList.vue'
import CartBar from './components/CartBar.vue'
import SearchBar from './components/SearchBar.vue'

/**
 * 菜单页面
 * 功能：展示分类和菜品，支持搜索和购物车操作
 */

// Stores
const cartStore = useCartStore()
const sessionStore = useSessionStore()

// 状态
const loading = ref(false)
const categories = ref<Category[]>([])
const dishes = ref<Dish[]>([])
const currentCategoryId = ref<string>('')
const searchKeyword = ref('')

/**
 * 显示的菜品列表（根据搜索关键词和分类过滤）
 */
const displayDishes = computed(() => {
  let result = dishes.value

  // 搜索过滤
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    result = result.filter((dish) =>
      dish.name.toLowerCase().includes(keyword)
    )
  }
  // 分类过滤
  else if (currentCategoryId.value) {
    result = result.filter((dish) => dish.categoryId === currentCategoryId.value)
  }

  return result
})

/**
 * 购物车数量映射（用于传递给子组件）
 */
const cartQuantities = computed(() => {
  const quantities: Record<string, number> = {}
  cartStore.items.forEach(item => {
    quantities[item.dishId] = item.quantity
  })
  return quantities
})

/**
 * 加载分类列表（从菜品数据中提取）
 */
function loadCategoriesFromDishes() {
  // 从已加载的菜品中提取唯一的分类
  const categoryMap = new Map<string, Category>()
  
  dishes.value.forEach((dish) => {
    if (dish.category && !categoryMap.has(dish.category.id)) {
      categoryMap.set(dish.category.id, {
        id: dish.category.id,
        name: dish.category.name,
        sortOrder: dish.category.sortOrder
      })
    }
  })
  
  // 按 sortOrder 排序
  categories.value = Array.from(categoryMap.values()).sort((a, b) => a.sortOrder - b.sortOrder)
  
  // 默认选中第一个分类
  if (categories.value.length > 0) {
    currentCategoryId.value = categories.value[0].id
  }
}

/**
 * 加载菜品列表
 */
async function loadDishes() {
  try {
    loading.value = true
    const response = await get<Dish[]>('/api/dishes')
    if (response.code === 0 && response.data) {
      // 只显示上架的菜品，并转换图片 URL
      dishes.value = response.data
        .filter((dish) => dish.isAvailable)
        .map((dish) => ({
          ...dish,
          imageUrl: normalizeImageUrl(dish.imageUrl)
        }))
      
      // 从菜品中提取分类信息
      loadCategoriesFromDishes()
    }
  } catch (error) {
    console.error('加载菜品失败:', error)
    Taro.showToast({
      title: '加载菜品失败',
      icon: 'none'
    })
  } finally {
    loading.value = false
  }
}

/**
 * 选择分类
 */
function selectCategory(categoryId: string) {
  currentCategoryId.value = categoryId
}

/**
 * 搜索处理
 */
function handleSearch() {
  // 搜索时清除分类选择
  if (searchKeyword.value) {
    currentCategoryId.value = ''
  }
}

/**
 * 添加到购物车
 */
function addToCart(dish: Dish) {
  cartStore.addItem({
    dishId: dish.id,
    dishName: dish.name,
    unitPrice: dish.price,
    imageUrl: dish.imageUrl
  })
  Taro.showToast({
    title: '已添加',
    icon: 'success',
    duration: 1000
  })
}

/**
 * 增加数量
 */
function increaseQuantity(dish: Dish) {
  const currentQuantity = cartStore.getItemQuantity(dish.id)
  cartStore.updateQuantity(dish.id, currentQuantity + 1)
}

/**
 * 减少数量
 */
function decreaseQuantity(dishId: string) {
  const currentQuantity = cartStore.getItemQuantity(dishId)
  cartStore.updateQuantity(dishId, currentQuantity - 1)
}

/**
 * 跳转到购物车页面
 */
function goToCart() {
  Taro.navigateTo({
    url: '/pages/cart/index'
  })
}

onMounted(() => {
  // 检查会话是否有效
  if (!sessionStore.hasValidSession()) {
    Taro.showModal({
      title: '提示',
      content: 'Session 已过期，请重新扫码',
      showCancel: false,
      success: () => {
        Taro.reLaunch({ url: '/pages/scan/index' })
      }
    })
    return
  }

  // 加载菜品
  loadDishes()
})
</script>

<style lang="less" module>
.menuPage {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #f5f5f5;
}

/* 主内容区域：左右布局 */
.mainContent {
  flex: 1;
  display: flex;
  overflow: hidden;
}
</style>
