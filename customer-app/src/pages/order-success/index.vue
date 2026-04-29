<template>
  <view :class="$style.orderSuccessPage">
    <!-- 成功图标 -->
    <view :class="$style.successIcon">✅</view>
    
    <!-- 成功提示 -->
    <view :class="$style.successTitle">支付成功</view>
    <view :class="$style.successSubtitle">您的订单已提交，请耐心等待</view>

    <!-- 订单信息 -->
    <view v-if="order" :class="$style.orderInfo">
      <view :class="$style.infoRow">
        <text :class="$style.infoLabel">订单编号</text>
        <text :class="$style.infoValue">{{ order.orderNo }}</text>
      </view>
      <view :class="$style.infoRow">
        <text :class="$style.infoLabel">桌号</text>
        <text :class="$style.infoValue">{{ order.tableNo }}</text>
      </view>
      <view :class="$style.infoRow">
        <text :class="$style.infoLabel">支付金额</text>
        <text :class="[$style.infoValue, $style.amount]">¥{{ formatPrice(order.totalAmount) }}</text>
      </view>
      <view :class="$style.infoRow">
        <text :class="$style.infoLabel">预计等待时间</text>
        <text :class="$style.infoValue">{{ estimatedWaitTime }}</text>
      </view>
    </view>

    <!-- 操作按钮 -->
    <view :class="$style.actionButtons">
      <view :class="$style.btnSecondary" @tap="goToOrderList">查看订单</view>
      <view :class="$style.btnPrimary" @tap="goToMenu">继续点餐</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import Taro, { useRouter } from '@tarojs/taro'
import { useOrdersStore, type Order } from '../../stores/orders'

// Router
const router = useRouter()

// Store
const ordersStore = useOrdersStore()

// 订单信息
const order = ref<Order | null>(null)

/**
 * 格式化价格（分 -> 元）
 */
function formatPrice(priceInCents: number): string {
  return (priceInCents / 100).toFixed(2)
}

/**
 * 预计等待时间（简单估算：每个菜品 5 分钟）
 */
const estimatedWaitTime = computed(() => {
  if (!order.value) {
    return '15-20 分钟'
  }

  const totalItems = order.value.items.reduce((sum, item) => sum + item.quantity, 0)
  const minutes = Math.max(15, Math.min(totalItems * 5, 45))
  
  return `${minutes}-${minutes + 5} 分钟`
})

/**
 * 加载订单信息
 */
function loadOrderInfo() {
  const orderId = router.params.orderId

  if (!orderId) {
    Taro.showToast({
      title: '订单 ID 缺失',
      icon: 'none'
    })
    return
  }

  // 从 Store 中获取订单
  const orderFromStore = ordersStore.getOrderById(orderId)
  
  if (orderFromStore) {
    order.value = orderFromStore
  } else {
    Taro.showToast({
      title: '订单信息不存在',
      icon: 'none'
    })
  }
}

/**
 * 跳转到订单列表
 */
function goToOrderList() {
  Taro.redirectTo({
    url: '/pages/order-list/index'
  })
}

/**
 * 继续点餐
 */
function goToMenu() {
  Taro.redirectTo({
    url: '/pages/menu/index'
  })
}

// 页面加载时获取订单信息
onMounted(() => {
  loadOrderInfo()
})
</script>

<style lang="less" module>
.orderSuccessPage {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 100vh;
  padding: 80rpx 32rpx 32rpx;
  background-color: #f5f5f5;
}

.successIcon {
  font-size: 160rpx;
  margin-bottom: 32rpx;
}

.successTitle {
  font-size: 48rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 16rpx;
}

.successSubtitle {
  font-size: 28rpx;
  color: #999;
  margin-bottom: 64rpx;
}

.orderInfo {
  width: 100%;
  padding: 32rpx;
  background-color: #fff;
  border-radius: 16rpx;
  margin-bottom: 48rpx;
}

.infoRow {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx 0;
  border-bottom: 1px solid #f5f5f5;

  &:last-child {
    border-bottom: none;
  }
}

.infoLabel {
  font-size: 28rpx;
  color: #666;
}

.infoValue {
  font-size: 28rpx;
  color: #333;
  font-weight: 500;

  &.amount {
    font-size: 32rpx;
    font-weight: bold;
    color: #ff6b35;
  }
}

.actionButtons {
  width: 100%;
  display: flex;
  gap: 24rpx;
}

.btnSecondary,
.btnPrimary {
  flex: 1;
  padding: 24rpx 0;
  text-align: center;
  font-size: 28rpx;
  font-weight: bold;
  border-radius: 48rpx;
}

.btnSecondary {
  color: #ff6b35;
  background-color: #fff;
  border: 2px solid #ff6b35;
}

.btnPrimary {
  color: #fff;
  background-color: #ff6b35;
}
</style>
