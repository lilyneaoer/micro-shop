<template>
  <view v-if="totalQuantity > 0" :class="$style.cartBar" @tap="handleClick">
    <view :class="$style.cartInfo">
      <view :class="$style.cartIcon">
        🛒
        <view :class="$style.cartBadge">{{ totalQuantity }}</view>
      </view>
      <view :class="$style.cartTotal">
        ¥{{ formatPrice(totalAmount) }}
      </view>
    </view>
    <view :class="$style.btnCheckout">去结算</view>
  </view>
</template>

<script setup lang="ts">
/**
 * 购物车悬浮栏组件
 */

interface Props {
  totalQuantity: number
  totalAmount: number // 单位：分
}

interface Emits {
  (e: 'click'): void
}

defineProps<Props>()
const emit = defineEmits<Emits>()

/**
 * 格式化价格（分 -> 元）
 */
function formatPrice(priceInCents: number): string {
  return (priceInCents / 100).toFixed(2)
}

/**
 * 点击购物车
 */
function handleClick() {
  emit('click')
}
</script>

<style lang="less" module>
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
  z-index: 100;
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
