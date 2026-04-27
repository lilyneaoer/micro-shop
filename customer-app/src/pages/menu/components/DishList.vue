<template>
  <scroll-view :class="$style.dishList" scroll-y>
    <view v-if="loading" :class="$style.loading">加载中...</view>
    <view v-else-if="dishes.length === 0" :class="$style.empty">
      {{ emptyText }}
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
            <!-- 菜品图片或占位图 -->
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
                      @tap="handleDecrease(dish.id)"
                    >
                      -
                    </view>
                    <view :class="$style.quantity">{{ getCartQuantity(dish.id) }}</view>
                    <view
                      :class="$style.btnPlus"
                      @tap="handleIncrease(dish)"
                    >
                      +
                    </view>
                  </view>
                  <view
                    v-else
                    :class="$style.btnAdd"
                    @tap="handleAdd(dish)"
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
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Category, Dish, GroupedDishes } from '../../../types/menu'

/**
 * 菜品列表组件
 * 显示右侧菜品内容
 */

interface Props {
  dishes: Dish[]
  categories: Category[]
  loading?: boolean
  emptyText?: string
  cartQuantities: Record<string, number>
}

interface Emits {
  (e: 'add', dish: Dish): void
  (e: 'increase', dish: Dish): void
  (e: 'decrease', dishId: string): void
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  emptyText: '暂无菜品'
})

const emit = defineEmits<Emits>()

/**
 * 按分类分组的菜品
 */
const groupedDishes = computed(() => {
  const groups: GroupedDishes[] = []
  const categoryMap = new Map<string, Category>()

  // 构建分类映射
  props.categories.forEach((cat) => {
    categoryMap.set(cat.id, cat)
  })

  // 按分类分组
  props.dishes.forEach((dish) => {
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
 * 格式化价格（分 -> 元）
 */
function formatPrice(priceInCents: number): string {
  return (priceInCents / 100).toFixed(2)
}

/**
 * 获取菜品在购物车中的数量
 */
function getCartQuantity(dishId: string): number {
  return props.cartQuantities[dishId] || 0
}

/**
 * 添加到购物车
 */
function handleAdd(dish: Dish) {
  emit('add', dish)
}

/**
 * 增加数量
 */
function handleIncrease(dish: Dish) {
  emit('increase', dish)
}

/**
 * 减少数量
 */
function handleDecrease(dishId: string) {
  emit('decrease', dishId)
}
</script>

<style lang="less" module>
/* 右侧菜品列表 */
.dishList {
  flex: 1;
  background-color: #fff;
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
  margin-bottom: 16rpx;
}

.categoryTitle {
  padding: 24rpx 32rpx 16rpx;
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  background-color: #fff;
  position: sticky;
  top: 0;
  z-index: 10;
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
</style>
