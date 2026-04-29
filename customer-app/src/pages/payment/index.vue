<template>
  <view :class="$style.paymentPage">
    <!-- 加载状态 -->
    <view v-if="isLoading" :class="$style.loadingContainer">
      <view :class="$style.loadingSpinner">⏳</view>
      <view :class="$style.loadingText">正在准备支付...</view>
    </view>

    <!-- 订单信息 -->
    <view v-else-if="order" :class="$style.paymentContent">
      <!-- 订单详情 -->
      <view :class="[$style.section, $style.orderInfo]">
        <view :class="$style.sectionTitle">订单信息</view>
        <view :class="$style.infoRow">
          <text :class="$style.infoLabel">订单编号</text>
          <text :class="$style.infoValue">{{ order.orderNo }}</text>
        </view>
        <view :class="$style.infoRow">
          <text :class="$style.infoLabel">桌号</text>
          <text :class="$style.infoValue">{{ order.tableNo }}</text>
        </view>
        <view :class="$style.infoRow">
          <text :class="$style.infoLabel">下单时间</text>
          <text :class="$style.infoValue">{{ formatTime(order.createdAt) }}</text>
        </view>
      </view>

      <!-- 商品列表 -->
      <view :class="[$style.section, $style.itemsSection]">
        <view :class="$style.sectionTitle">商品清单</view>
        <view
          v-for="(item, index) in order.items"
          :key="index"
          :class="$style.itemRow"
        >
          <view :class="$style.itemName">
            {{ item.dishName }}
            <text v-if="item.skuName" :class="$style.itemSku">（{{ item.skuName }}）</text>
          </view>
          <view :class="$style.itemQuantity">x{{ item.quantity }}</view>
          <view :class="$style.itemPrice">¥{{ formatPrice(item.subtotal) }}</view>
        </view>
      </view>

      <!-- 应付金额 -->
      <view :class="[$style.section, $style.amountSection]">
        <view :class="$style.amountRow">
          <text :class="$style.amountLabel">应付金额</text>
          <text :class="$style.amountValue">¥{{ formatPrice(order.totalAmount) }}</text>
        </view>
      </view>

      <!-- 支付按钮 -->
      <view :class="$style.paymentFooter">
        <view :class="[$style.btnPay, { [$style.disabled]: isPaying }]" @tap="handlePay">
          {{ isPaying ? '支付中...' : '微信支付' }}
        </view>
      </view>
    </view>

    <!-- 错误状态 -->
    <view v-else :class="$style.errorContainer">
      <view :class="$style.errorIcon">❌</view>
      <view :class="$style.errorText">订单信息加载失败</view>
      <view :class="$style.btnBack" @tap="goBack">返回</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import Taro, { useRouter } from '@tarojs/taro'
import { useOrdersStore, type Order } from '../../stores/orders'
import { post } from '../../api'

// Router
const router = useRouter()

// Store
const ordersStore = useOrdersStore()

// 订单信息
const order = ref<Order | null>(null)

// 加载状态
const isLoading = ref(true)

// 支付状态
const isPaying = ref(false)

/**
 * 格式化价格（分 -> 元）
 */
function formatPrice(priceInCents: number): string {
  return (priceInCents / 100).toFixed(2)
}

/**
 * 格式化时间
 */
function formatTime(isoString: string): string {
  const date = new Date(isoString)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}`
}

/**
 * 加载订单信息
 */
async function loadOrderInfo() {
  const orderId = router.params.orderId

  if (!orderId) {
    Taro.showToast({
      title: '订单 ID 缺失',
      icon: 'none'
    })
    isLoading.value = false
    return
  }

  // 从 Store 中获取订单
  const orderFromStore = ordersStore.getOrderById(orderId)
  
  if (orderFromStore) {
    order.value = orderFromStore
    isLoading.value = false
  } else {
    // 如果 Store 中没有，说明可能是刷新或其他情况
    Taro.showToast({
      title: '订单信息不存在',
      icon: 'none'
    })
    isLoading.value = false
  }
}

/**
 * 发起支付
 */
async function handlePay() {
  if (isPaying.value || !order.value) {
    return
  }

  isPaying.value = true

  try {
    // 调用预支付接口
    const response = await post<{
      paymentParams: {
        timeStamp: string
        nonceStr: string
        package: string
        signType: string
        paySign: string
      }
    }>('/api/payments/prepay', {
      orderId: order.value.id
    })

    if (response.code === 0) {
      // 调用微信支付
      const paymentParams = response.data.paymentParams

      try {
        await Taro.requestPayment({
          timeStamp: paymentParams.timeStamp,
          nonceStr: paymentParams.nonceStr,
          package: paymentParams.package,
          signType: paymentParams.signType as any,
          paySign: paymentParams.paySign
        })

        // 支付成功
        Taro.showToast({
          title: '支付成功',
          icon: 'success',
          duration: 1500
        })

        // 跳转到支付成功页
        setTimeout(() => {
          Taro.redirectTo({
            url: `/pages/order-success/index?orderId=${order.value!.id}`
          })
        }, 1500)
      } catch (payError: any) {
        // 支付失败或取消
        if (payError.errMsg && payError.errMsg.includes('cancel')) {
          Taro.showToast({
            title: '支付已取消',
            icon: 'none'
          })
        } else {
          Taro.showToast({
            title: '支付失败，请重试',
            icon: 'none'
          })
        }
      }
    } else {
      // 预支付创建失败
      Taro.showToast({
        title: response.message || '支付准备失败',
        icon: 'none'
      })
    }
  } catch (error: any) {
    console.error('支付失败:', error)
    Taro.showToast({
      title: '网络错误，请重试',
      icon: 'none'
    })
  } finally {
    isPaying.value = false
  }
}

/**
 * 返回
 */
function goBack() {
  Taro.navigateBack()
}

// 页面加载时获取订单信息
onMounted(() => {
  loadOrderInfo()
})
</script>

<style lang="less" module>
.paymentPage {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding-bottom: 160rpx;
}

.loadingContainer,
.errorContainer {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 80rpx 0;
}

.loadingSpinner,
.errorIcon {
  font-size: 120rpx;
  margin-bottom: 32rpx;
}

.loadingText,
.errorText {
  font-size: 32rpx;
  color: #999;
  margin-bottom: 48rpx;
}

.btnBack {
  padding: 16rpx 48rpx;
  font-size: 28rpx;
  color: #fff;
  background-color: #ff6b35;
  border-radius: 48rpx;
}

.paymentContent {
  padding-top: 16rpx;
}

.section {
  margin-bottom: 16rpx;
  padding: 24rpx 32rpx;
  background-color: #fff;
}

.sectionTitle {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 24rpx;
}

.orderInfo {
  .infoRow {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16rpx 0;
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
  }
}

.itemsSection {
  .itemRow {
    display: flex;
    align-items: center;
    padding: 16rpx 0;
    border-bottom: 1px solid #f5f5f5;

    &:last-child {
      border-bottom: none;
    }
  }

  .itemName {
    flex: 1;
    font-size: 28rpx;
    color: #333;
  }

  .itemSku {
    font-size: 24rpx;
    color: #999;
  }

  .itemQuantity {
    font-size: 28rpx;
    color: #666;
    margin: 0 24rpx;
  }

  .itemPrice {
    font-size: 28rpx;
    font-weight: bold;
    color: #333;
    min-width: 120rpx;
    text-align: right;
  }
}

.amountSection {
  .amountRow {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16rpx 0;
  }

  .amountLabel {
    font-size: 32rpx;
    color: #666;
  }

  .amountValue {
    font-size: 48rpx;
    font-weight: bold;
    color: #ff6b35;
  }
}

.paymentFooter {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 24rpx 32rpx;
  background-color: #fff;
  box-shadow: 0 -2rpx 16rpx rgba(0, 0, 0, 0.1);
}

.btnPay {
  width: 100%;
  padding: 24rpx 0;
  text-align: center;
  font-size: 32rpx;
  font-weight: bold;
  color: #fff;
  background-color: #09bb07;
  border-radius: 48rpx;

  &.disabled {
    background-color: #ccc;
  }
}
</style>
