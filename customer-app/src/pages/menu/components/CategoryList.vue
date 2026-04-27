<template>
  <scroll-view
    :class="$style.categoryList"
    scroll-y
    scroll-with-animation
  >
    <view
      v-for="category in categories"
      :key="category.id"
      :class="[$style.categoryItem, { [$style.active]: currentCategoryId === category.id }]"
      @tap="handleSelectCategory(category.id)"
    >
      <view :class="$style.categoryName">{{ category.name }}</view>
      <view v-if="currentCategoryId === category.id" :class="$style.categoryIndicator"></view>
    </view>
  </scroll-view>
</template>

<script setup lang="ts">
import type { Category } from '../../../types/menu'

/**
 * 分类列表组件
 * 显示左侧垂直分类导航
 */

interface Props {
  categories: Category[]
  currentCategoryId: string
}

interface Emits {
  (e: 'select', categoryId: string): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

/**
 * 选择分类
 */
function handleSelectCategory(categoryId: string) {
  emit('select', categoryId)
}
</script>

<style lang="less" module>
/* 左侧分类列表 */
.categoryList {
  width: 180rpx;
  background-color: #f8f8f8;
  flex-shrink: 0;
}

.categoryItem {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32rpx 16rpx;
  background-color: #f8f8f8;
  transition: all 0.3s;

  &.active {
    background-color: #fff;
    
    .categoryName {
      color: #ff6b35;
      font-weight: bold;
    }
  }
}

.categoryName {
  font-size: 28rpx;
  color: #333;
  text-align: center;
  word-break: break-all;
}

.categoryIndicator {
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 6rpx;
  height: 40rpx;
  background-color: #ff6b35;
  border-radius: 0 4rpx 4rpx 0;
}
</style>
