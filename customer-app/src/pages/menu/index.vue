<template>
  <view :class="$style.menuPage">
    <!-- 搜索栏 -->
    <view :class="$style.searchBar">
      <input
        v-model="searchKeyword"
        :class="$style.searchInput"
        type="text"
        placeholder="搜索菜品"
        @input="handleSearch"
      />
    </view>

    <!-- 分类标签 -->
    <scroll-view
      v-if="!searchKeyword"
      :class="$style.categoryTabs"
      scroll-x
      scroll-with-animation
    >
      <view
        v-for="category in categories"
        :key="category.id"
        :class="[$style.categoryTab, { [$style.active]: currentCategoryId === category.id }]"
        @tap="selectCategory(category.id)"
      >
        {{ category.name }}
      </view>
    </scroll-view>

    <!-- 菜品列表 -->
    <scroll-view :class="$style.dishList" scroll-y>
      <view v-if="loading" :class="$style.loading">加载中...</view>
      <view v-else-if="displayDishes.length === 0" :class="$style.empty">
        {{ searchKeyword ? '未找到相关菜品' : '暂无菜品' }}
      </view>
      <view v-else>
        <!-- 按分类分组展示 -->
        <view
          v-for="group in groupedDishes"
          :key="group.categoryId"
          :class="$style.categoryGroup"
        >
          <view :class="$style.categoryTitle">{{ group.categoryName }}</view>
          <view :class="$style.dishes">
            <view
              v-for="dish in group.dishes"
              :key="dish.id"
              :class="$style.dishItem"
            >
              <image
                v-if="dish.imageUrl"
                :src="dish.imageUrl"
                :class="$style.dishImage"
                mode="aspectFill"
              />
              <view :class="$style.dishInfo">
                <view :class="$style.dishName">{{ dish.name }}</view>
                <view :class="$style.dishDescription">{{ dish.description }}</view>
                <view :class="$style.dishFooter">
                  <view :class="$style.dishPrice">¥{{ formatPrice(dish.price) }}</view>
                  <view :class="$style.dishActions">
                    <view
                      v-if="getCartQuantity(dish.id) > 0"
                      :class="$style.quantityControl"
                    >
                      <view
                        :class="$style.btnMinus"
                        @tap="decreaseQuantity(dish.id)"
                      >
                        -
                      </view>
                      <view :class="$style.quantity">{{ getCartQuantity(dish.id) }}</view>
                      <view
                        :class="$style.btnPlus"
                        @tap="increaseQuantity(dish)"
                      >
                        +
                      </view>
                    </view>
                    <view
                      v-else
                      :class="$style.btnAdd"
                      @tap="addToCart(dish)"
                    >
                      加入购物车
                    </view>
                  </view>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- 购物车悬浮栏 -->
    <view v-if="cartStore.totalQuantity > 0" :class="$style.cartBar" @tap="goToCart">
      <view :class="$style.cartInfo">
        <view :class="$style.cartIcon">
          🛒
          <view :class="$style.cartBadge">{{ cartStore.totalQuantity }}</view>
        </view>
        <view :class="$style.cartTotal">
          ¥{{ formatPrice(cartStore.totalAmount) }}
        </view>
      </view>
      <view :class="$style.btnCheckout">去结算</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import Taro from '@tarojs/taro'
import { get } from '../../api'
import { useCartStore } from '../../stores/cart'
import { useSessionStore } from '../../stores/session'
import { normalizeImageUrl } from '../../utils/image'

/**
 * 分类接口
 */
interface Category {
  id: string
  name: string
  sortOrder: number
}

/**
 * 菜品接口
 */
interface Dish {
  id: string
  name: string
  description: string
  price: number // 单位：分
  imageUrl?: string
  categoryId: string
  isAvailable: boolean
}

/**
 * 分组后的菜品
 */
interface GroupedDishes {
  categoryId: string
  categoryName: string
  dishes: Dish[]
}

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
 * 按分类分组的菜品
 */
const groupedDishes = computed(() => {
  const groups: GroupedDishes[] = []
  const categoryMap = new Map<string, Category>()

  // 构建分类映射
  categories.value.forEach((cat) => {
    categoryMap.set(cat.id, cat)
  })

  // 按分类分组
  displayDishes.value.forEach((dish) => {
    let group = groups.find((g) => g.categoryId === dish.categoryId)
    if (!group) {
      const category = categoryMap.get(dish.categoryId)
      group = {
        categoryId: dish.categoryId,
        categoryName: category?.name || '其他',
        dishes: []
      }
      groups.push(group)
    }
    group.dishes.push(dish)
  })

  return groups
})

/**
 * 加载分类列表（从菜品数据中提取）
 */
async function loadCategoriesFromDishes() {
  // 从已加载的菜品中提取唯一的分类
  const categoryMap = new Map<string, Category>()
  
  dishes.value.forEach((dish) => {
    if (!categoryMap.has(dish.categoryId)) {
      categoryMap.set(dish.categoryId, {
        id: dish.categoryId,
        name: `分类 ${categoryMap.size + 1}`, // 临时名称
        sortOrder: categoryMap.size
      })
    }
  })
  
  categories.value = Array.from(categoryMap.values())
  
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
 * 格式化价格（分 -> 元）
 */
function formatPrice(priceInCents: number): string {
  return (priceInCents / 100).toFixed(2)
}

/**
 * 获取菜品在购物车中的数量
 */
function getCartQuantity(dishId: string): number {
  return cartStore.getItemQuantity(dishId)
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
  const currentQuantity = getCartQuantity(dish.id)
  cartStore.updateQuantity(dish.id, currentQuantity + 1)
}

/**
 * 减少数量
 */
function decreaseQuantity(dishId: string) {
  const currentQuantity = getCartQuantity(dishId)
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

  // 只需要加载菜品，分类会从菜品中提取
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

.searchBar {
  padding: 20rpx 32rpx;
  background-color: #fff;
  border-bottom: 1px solid #eee;
}

.searchInput {
  width: 100%;
  height: 64rpx;
  padding: 0 24rpx;
  background-color: #f5f5f5;
  border-radius: 32rpx;
  font-size: 28rpx;
}

.categoryTabs {
  display: flex;
  white-space: nowrap;
  padding: 20rpx 32rpx;
  background-color: #fff;
  border-bottom: 1px solid #eee;
}

.categoryTab {
  display: inline-block;
  padding: 12rpx 32rpx;
  margin-right: 24rpx;
  font-size: 28rpx;
  color: #666;
  border-radius: 32rpx;
  background-color: #f5f5f5;

  &.active {
    color: #fff;
    background-color: #ff6b35;
  }
}

.dishList {
  flex: 1;
  padding: 0 0 120rpx 0;
}

.loading,
.empty {
  padding: 80rpx 0;
  text-align: center;
  font-size: 28rpx;
  color: #999;
}

.categoryGroup {
  margin-bottom: 32rpx;
}

.categoryTitle {
  padding: 24rpx 32rpx 16rpx;
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
}

.dishes {
  background-color: #fff;
}

.dishItem {
  display: flex;
  padding: 24rpx 32rpx;
  border-bottom: 1px solid #f5f5f5;

  &:last-child {
    border-bottom: none;
  }
}

.dishImage {
  width: 160rpx;
  height: 160rpx;
  margin-right: 24rpx;
  border-radius: 8rpx;
  flex-shrink: 0;
}

.dishInfo {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.dishName {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 8rpx;
}

.dishDescription {
  font-size: 24rpx;
  color: #999;
  margin-bottom: 16rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.dishFooter {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.dishPrice {
  font-size: 32rpx;
  font-weight: bold;
  color: #ff6b35;
}

.dishActions {
  display: flex;
  align-items: center;
}

.btnAdd {
  padding: 8rpx 24rpx;
  font-size: 24rpx;
  color: #fff;
  background-color: #ff6b35;
  border-radius: 32rpx;
}

.quantityControl {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.btnMinus,
.btnPlus {
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32rpx;
  color: #fff;
  background-color: #ff6b35;
  border-radius: 50%;
}

.quantity {
  min-width: 48rpx;
  text-align: center;
  font-size: 28rpx;
  font-weight: bold;
}

.cartBar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx 32rpx;
  background-color: #333;
  box-shadow: 0 -2rpx 16rpx rgba(0, 0, 0, 0.1);
}

.cartInfo {
  display: flex;
  align-items: center;
  gap: 24rpx;
}

.cartIcon {
  position: relative;
  font-size: 48rpx;
}

.cartBadge {
  position: absolute;
  top: -8rpx;
  right: -8rpx;
  min-width: 32rpx;
  height: 32rpx;
  padding: 0 8rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20rpx;
  color: #fff;
  background-color: #ff6b35;
  border-radius: 16rpx;
}

.cartTotal {
  font-size: 36rpx;
  font-weight: bold;
  color: #fff;
}

.btnCheckout {
  padding: 16rpx 48rpx;
  font-size: 28rpx;
  color: #333;
  background-color: #ffd700;
  border-radius: 48rpx;
  font-weight: bold;
}
</style>
