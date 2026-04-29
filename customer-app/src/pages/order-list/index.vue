<template>
  <view :class="$style.orderListPage">
    <!-- 空状态 -->
    <view v-if="orders.length === 0" :class="$style.emptyState">
      <view :class="$style.emptyIcon">📋</view>
      <text :class="$style.emptyText">暂无订单</text>
      <text :class="$style.emptyHint">扫码点餐后，订单将显示在这里</text>
    </view>

    <!-- 订单列表 -->
    <view v-else :class="$style.orderList">
      <view
        v-for="order in orders"
        :key="order.id"
        :class="$style.orderCard"
        @tap="handleOrderTap(order)"
      >
        <!-- 订单头部 -->
        <view :class="$style.orderHeader">
          <view :class="$style.orderInfo">
            <text :class="$style.orderNo">订单号：{{ order.orderNo }}</text>
            <text :class="$style.tableNo">{{ order.tableNo }}</text>
          </view>
          <view :class="[$style.orderStatus, $style[`status${order.status}`]]">
            {{ ordersStore.getStatusText(order.status) }}
          </view>
        </view>

        <!-- 订单项列表 -->
        <view :class="$style.orderItems">
          <view
            v-for="(item, index) in order.items"
            :key="index"
            :class="$style.orderItem"
          >
            <view :class="$style.itemInfo">
              <text :class="$style.itemName">{{ item.dishName }}</text>
              <text v-if="item.skuName" :class="$style.itemSku">{{ item.skuName }}</text>
            </view>
            <view :class="$style.itemQuantity">x{{ item.quantity }}</view>
            <view :class="$style.itemPrice">¥{{ (item.subtotal / 100).toFixed(2) }}</view>
          </view>
        </view>

        <!-- 订单底部 -->
        <view :class="$style.orderFooter">
          <view :class="$style.orderTotal">
            <text :class="$style.totalLabel">合计：</text>
            <text :class="$style.totalAmount">¥{{ (order.totalAmount / 100).toFixed(2) }}</text>
          </view>
          <view :class="$style.orderActions">
            <!-- 待支付状态可以取消订单 -->
            <button
              v-if="order.status === OrderStatus.PENDING_PAYMENT"
              :class="$style.btnCancel"
              size="mini"
              @tap.stop="handleCancelOrder(order)"
            >
              取消订单
            </button>
          </view>
        </view>

        <!-- 订单时间 -->
        <view :class="$style.orderTime">
          <text>下单时间：{{ formatTime(order.createdAt) }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import Taro from '@tarojs/taro'
import { useOrdersStore, OrderStatus } from '@/stores/orders'
import { useSessionStore } from '@/stores/session'
import { del, get } from '@/api'

/**
 * 顾客小程序订单列表页面
 * 需求：5.2、5.3、5.7、10.3、10.4
 * 
 * 功能：
 * 1. 展示当前 Session 内所有订单及状态
 * 2. 支持取消"待支付"状态的订单
 * 3. 订单状态更新延迟不超过 5 秒（WebSocket 推送）
 * 4. WebSocket 断线指数退避重连（1s → 2s → 4s → 8s，最大 30s）
 */

const ordersStore = useOrdersStore()
const sessionStore = useSessionStore()

// 订单列表
const orders = computed(() => ordersStore.orders)

/**
 * 页面加载时初始化
 */
onMounted(async () => {
  // 检查 Session 是否有效
  if (!sessionStore.hasValidSession()) {
    Taro.showToast({
      title: 'Session 已过期，请重新扫码',
      icon: 'none',
      duration: 2000
    })
    setTimeout(() => {
      Taro.reLaunch({ url: '/pages/scan/index' })
    }, 2000)
    return
  }

  // 加载订单列表
  await loadOrders()

  // 初始化 WebSocket 连接
  // 需求：5.2、5.3 - 监听 order:status_changed 事件
  if (sessionStore.sessionToken) {
    ordersStore.initWebSocket(sessionStore.sessionToken)
  }
})

/**
 * 页面卸载时断开 WebSocket
 */
onUnmounted(() => {
  ordersStore.disconnectWebSocket()
})

/**
 * 加载订单列表
 * 需求：10.3、10.4 - 展示当前 Session 内所有订单
 */
async function loadOrders() {
  try {
    Taro.showLoading({ title: '加载中...' })

    const response = await get('/api/orders', {
      sessionId: sessionStore.tableInfo?.id
    })

    if (response.code === 0 && response.data) {
      // 清空现有订单列表
      ordersStore.clearOrders()
      
      // 添加订单到 Store
      response.data.forEach((order: any) => {
        ordersStore.addOrder(order)
      })
    }
  } catch (error) {
    console.error('加载订单列表失败:', error)
    Taro.showToast({
      title: '加载失败，请重试',
      icon: 'none',
      duration: 2000
    })
  } finally {
    Taro.hideLoading()
  }
}

/**
 * 点击订单卡片
 */
function handleOrderTap(order: any) {
  // 可以跳转到订单详情页（如果需要）
  console.log('Order tapped:', order)
}

/**
 * 取消订单
 * 需求：5.7 - 支持顾客在"待支付"状态时取消订单
 */
async function handleCancelOrder(order: any) {
  try {
    const result = await Taro.showModal({
      title: '确认取消',
      content: '确定要取消这个订单吗？',
      confirmText: '确定',
      cancelText: '取消'
    })

    if (!result.confirm) {
      return
    }

    Taro.showLoading({ title: '取消中...' })

    const response = await del(`/api/orders/${order.id}`)

    if (response.code === 0) {
      Taro.showToast({
        title: '订单已取消',
        icon: 'success',
        duration: 2000
      })

      // 更新订单状态
      ordersStore.updateOrderStatus(order.id, OrderStatus.CANCELLED)
    } else {
      throw new Error(response.message || '取消失败')
    }
  } catch (error: any) {
    console.error('取消订单失败:', error)
    Taro.showToast({
      title: error.message || '取消失败，请重试',
      icon: 'none',
      duration: 2000
    })
  } finally {
    Taro.hideLoading()
  }
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
</script>

<style lang="less" module>
.orderListPage {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding: 32rpx;
}

/* 空状态 */
.emptyState {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 200rpx 0;

  .emptyIcon {
    font-size: 120rpx;
    margin-bottom: 32rpx;
  }

  .emptyText {
    font-size: 32rpx;
    color: #333;
    margin-bottom: 16rpx;
  }

  .emptyHint {
    font-size: 28rpx;
    color: #999;
  }
}

/* 订单列表 */
.orderList {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

/* 订单卡片 */
.orderCard {
  background-color: #fff;
  border-radius: 16rpx;
  padding: 32rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);
}

/* 订单头部 */
.orderHeader {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
  padding-bottom: 24rpx;
  border-bottom: 1rpx solid #f0f0f0;

  .orderInfo {
    display: flex;
    flex-direction: column;
    gap: 8rpx;

    .orderNo {
      font-size: 28rpx;
      color: #666;
    }

    .tableNo {
      font-size: 32rpx;
      color: #333;
      font-weight: 500;
    }
  }

  .orderStatus {
    padding: 8rpx 24rpx;
    border-radius: 8rpx;
    font-size: 28rpx;
    font-weight: 500;

    &.statuspending_payment {
      background-color: #fff7e6;
      color: #fa8c16;
    }

    &.statuspaid_pending_accept {
      background-color: #e6f7ff;
      color: #1890ff;
    }

    &.statusaccepted_in_progress {
      background-color: #f6ffed;
      color: #52c41a;
    }

    &.statuscompleted {
      background-color: #f0f0f0;
      color: #8c8c8c;
    }

    &.statuscancelled {
      background-color: #fff1f0;
      color: #f5222d;
    }

    &.statusrefunded {
      background-color: #f9f0ff;
      color: #722ed1;
    }
  }
}

/* 订单项列表 */
.orderItems {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  margin-bottom: 24rpx;
}

.orderItem {
  display: flex;
  align-items: center;
  gap: 16rpx;

  .itemInfo {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4rpx;

    .itemName {
      font-size: 30rpx;
      color: #333;
    }

    .itemSku {
      font-size: 26rpx;
      color: #999;
    }
  }

  .itemQuantity {
    font-size: 28rpx;
    color: #666;
  }

  .itemPrice {
    font-size: 30rpx;
    color: #333;
    font-weight: 500;
    min-width: 120rpx;
    text-align: right;
  }
}

/* 订单底部 */
.orderFooter {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 24rpx;
  border-top: 1rpx solid #f0f0f0;

  .orderTotal {
    display: flex;
    align-items: baseline;
    gap: 8rpx;

    .totalLabel {
      font-size: 28rpx;
      color: #666;
    }

    .totalAmount {
      font-size: 36rpx;
      color: #ff4d4f;
      font-weight: 600;
    }
  }

  .orderActions {
    display: flex;
    gap: 16rpx;

    .btnCancel {
      background-color: #fff;
      color: #ff4d4f;
      border: 1rpx solid #ff4d4f;
      border-radius: 8rpx;
      padding: 8rpx 24rpx;
      font-size: 28rpx;
    }
  }
}

/* 订单时间 */
.orderTime {
  margin-top: 16rpx;
  font-size: 26rpx;
  color: #999;
}
</style>
