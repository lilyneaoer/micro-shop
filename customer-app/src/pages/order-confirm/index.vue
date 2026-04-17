<template>
  <view class="order-confirm-page">
    <!-- 桌台信息 -->
    <view class="section table-info">
      <view class="section-title">桌台信息</view>
      <view class="table-detail">
        <text class="table-no">{{ sessionStore.tableInfo?.tableNo || '-' }}</text>
        <text v-if="sessionStore.tableInfo?.area" class="table-area">
          {{ sessionStore.tableInfo.area }}
        </text>
      </view>
    </view>

    <!-- 订单商品列表 -->
    <view class="section order-items">
      <view class="section-title">订单详情</view>
      <view
        v-for="item in cartStore.items"
        :key="`${item.dishId}-${item.skuId || ''}`"
        class="order-item"
      >
        <view class="item-info">
          <view class="item-name">{{ item.dishName }}</view>
          <view v-if="item.skuName" class="item-sku">{{ item.skuName }}</view>
        </view>
        <view class="item-quantity">x{{ item.quantity }}</view>
        <view class="item-price">¥{{ formatPrice(item.unitPrice * item.quantity) }}</view>
      </view>
    </view>

    <!-- 顾客备注 -->
    <view class="section remark-section">
      <view class="section-title">备注</view>
      <textarea
        v-model="customerRemark"
        class="remark-input"
        placeholder="请输入备注信息（选填）"
        maxlength="200"
        :show-confirm-bar="false"
      />
      <view class="remark-count">{{ customerRemark.length }}/200</view>
    </view>

    <!-- 总金额 -->
    <view class="section total-section">
      <view class="total-label">总计</view>
      <view class="total-amount">¥{{ formatPrice(cartStore.totalAmount) }}</view>
    </view>

    <!-- 提交按钮 -->
    <view class="submit-footer">
      <view class="btn-submit" :class="{ disabled: isSubmitting }" @tap="handleSubmitOrder">
        {{ isSubmitting ? '提交中...' : '提交订单' }}
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import Taro from '@tarojs/taro'
import { useCartStore } from '../../stores/cart'
import { useSessionStore } from '../../stores/session'
import { useOrdersStore } from '../../stores/orders'
import { post } from '../../api'

// Stores
const cartStore = useCartStore()
const sessionStore = useSessionStore()
const ordersStore = useOrdersStore()

// 顾客备注
const customerRemark = ref('')

// 提交状态
const isSubmitting = ref(false)

/**
 * 格式化价格（分 -> 元）
 */
function formatPrice(priceInCents: number): string {
  return (priceInCents / 100).toFixed(2)
}

/**
 * 提交订单
 */
async function handleSubmitOrder() {
  if (isSubmitting.value) {
    return
  }

  // 检查购物车是否为空
  if (cartStore.items.length === 0) {
    Taro.showToast({
      title: '购物车是空的',
      icon: 'none'
    })
    return
  }

  // 检查 Session 是否有效
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

  isSubmitting.value = true

  try {
    // 构建订单数据
    const orderData = {
      tableId: sessionStore.tableInfo!.id,
      items: cartStore.items.map(item => ({
        dishId: item.dishId,
        skuId: item.skuId,
        quantity: item.quantity
      })),
      customerRemark: customerRemark.value.trim() || undefined
    }

    // 调用订单提交接口
    const response = await post<{
      order: {
        id: string
        orderNo: string
        tableId: string
        tableNo: string
        items: Array<{
          dishId: string
          dishName: string
          skuId?: string
          skuName?: string
          unitPrice: number
          quantity: number
          subtotal: number
        }>
        totalAmount: number
        status: string
        customerRemark?: string
        createdAt: string
        updatedAt: string
      }
    }>('/api/orders', orderData)

    if (response.code === 0) {
      // 订单创建成功
      const order = response.data.order

      // 添加到订单列表
      ordersStore.addOrder(order)

      // 设置当前订单 ID
      ordersStore.setCurrentOrderId(order.id)

      // 清空购物车
      cartStore.clearCart()

      // 跳转到支付页面
      Taro.redirectTo({
        url: `/pages/payment/index?orderId=${order.id}`
      })
    } else if (response.code === 3001) {
      // 订单中含下架菜品
      Taro.showModal({
        title: '订单提交失败',
        content: response.message || '订单中包含已下架的菜品，请返回重新选择',
        showCancel: false,
        success: () => {
          // 返回菜单页
          Taro.navigateBack()
        }
      })
    } else {
      // 其他错误
      Taro.showToast({
        title: response.message || '订单提交失败',
        icon: 'none',
        duration: 2000
      })
    }
  } catch (error: any) {
    console.error('订单提交失败:', error)
    Taro.showToast({
      title: '网络错误，请重试',
      icon: 'none',
      duration: 2000
    })
  } finally {
    isSubmitting.value = false
  }
}
</script>

<style lang="less" scoped>
.order-confirm-page {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding-bottom: 160rpx;
}

.section {
  margin-bottom: 16rpx;
  padding: 24rpx 32rpx;
  background-color: #fff;
}

.section-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 24rpx;
}

.table-info {
  .table-detail {
    display: flex;
    align-items: center;
    gap: 16rpx;
  }

  .table-no {
    font-size: 40rpx;
    font-weight: bold;
    color: #ff6b35;
  }

  .table-area {
    font-size: 28rpx;
    color: #666;
  }
}

.order-items {
  .order-item {
    display: flex;
    align-items: center;
    padding: 16rpx 0;
    border-bottom: 1px solid #f5f5f5;

    &:last-child {
      border-bottom: none;
    }
  }

  .item-info {
    flex: 1;
  }

  .item-name {
    font-size: 28rpx;
    color: #333;
    margin-bottom: 8rpx;
  }

  .item-sku {
    font-size: 24rpx;
    color: #999;
  }

  .item-quantity {
    font-size: 28rpx;
    color: #666;
    margin: 0 24rpx;
  }

  .item-price {
    font-size: 28rpx;
    font-weight: bold;
    color: #333;
    min-width: 120rpx;
    text-align: right;
  }
}

.remark-section {
  .remark-input {
    width: 100%;
    min-height: 160rpx;
    padding: 16rpx;
    font-size: 28rpx;
    line-height: 1.6;
    background-color: #f5f5f5;
    border-radius: 8rpx;
    box-sizing: border-box;
  }

  .remark-count {
    margin-top: 8rpx;
    font-size: 24rpx;
    color: #999;
    text-align: right;
  }
}

.total-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 32rpx;

  .total-label {
    font-size: 32rpx;
    color: #666;
  }

  .total-amount {
    font-size: 48rpx;
    font-weight: bold;
    color: #ff6b35;
  }
}

.submit-footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 24rpx 32rpx;
  background-color: #fff;
  box-shadow: 0 -2rpx 16rpx rgba(0, 0, 0, 0.1);
}

.btn-submit {
  width: 100%;
  padding: 24rpx 0;
  text-align: center;
  font-size: 32rpx;
  font-weight: bold;
  color: #fff;
  background-color: #ff6b35;
  border-radius: 48rpx;

  &.disabled {
    background-color: #ccc;
  }
}
</style>
