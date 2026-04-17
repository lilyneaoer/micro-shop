<template>
  <view class="order-list-container">
    <!-- 顶部导航栏 -->
    <view class="header">
      <view class="welcome">欢迎，{{ userInfo?.username || '商家' }}</view>
      <view class="header-actions">
        <button class="stats-button" @tap="handleGoToStats">数据</button>
        <button class="logout-button" @tap="handleLogout">退出登录</button>
      </view>
    </view>

    <!-- 状态筛选标签 -->
    <view class="filter-tabs">
      <view
        v-for="tab in filterTabs"
        :key="tab.value"
        :class="['tab-item', { active: currentFilter === tab.value }]"
        @tap="handleFilterChange(tab.value)"
      >
        <text class="tab-label">{{ tab.label }}</text>
        <text v-if="tab.value === 'pending' && pendingCount > 0" class="badge">{{
          pendingCount
        }}</text>
      </view>
    </view>

    <!-- 订单列表 -->
    <view class="order-list">
      <!-- 加载中 -->
      <view v-if="loading" class="loading-container">
        <text class="loading-text">加载中...</text>
      </view>

      <!-- 空状态 -->
      <view v-else-if="displayOrders.length === 0" class="empty-container">
        <text class="empty-text">暂无订单</text>
      </view>

      <!-- 订单卡片列表 -->
      <view v-else class="order-cards">
        <view
          v-for="order in displayOrders"
          :key="order.id"
          class="order-card"
          @tap="handleOrderClick(order.id)"
        >
          <!-- 订单头部 -->
          <view class="order-header">
            <view class="order-info">
              <text class="table-no">{{ order.table?.table_no || '未知桌号' }}</text>
              <text class="order-time">{{ formatTime(order.created_at) }}</text>
            </view>
            <view :class="['order-status', `status-${getStatusClass(order.status)}`]">
              {{ order.status }}
            </view>
          </view>

          <!-- 订单菜品列表 -->
          <view class="order-items">
            <view v-for="item in order.items" :key="item.id" class="order-item">
              <text class="item-name"
                >{{ item.dish_name }}{{ item.sku_name ? `（${item.sku_name}）` : '' }}</text
              >
              <text class="item-quantity">x{{ item.quantity }}</text>
            </view>
          </view>

          <!-- 订单底部 -->
          <view class="order-footer">
            <view class="total-amount">
              <text class="label">总金额：</text>
              <text class="amount">¥{{ formatAmount(order.total_amount) }}</text>
            </view>
            <view class="order-actions">
              <button
                v-if="order.status === '已支付'"
                class="action-button accept"
                @tap.stop="handleAcceptOrder(order.id)"
              >
                接单
              </button>
              <button
                v-if="order.status === '已接单'"
                class="action-button complete"
                @tap.stop="handleCompleteOrder(order.id)"
              >
                完成
              </button>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- WebSocket 连接状态指示器 -->
    <view v-if="!isConnected" class="connection-status">
      <text class="status-text">连接已断开，正在重连...</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import Taro from '@tarojs/taro'
import { useAuthStore } from '@/stores/auth'
import { useOrdersStore, type OrderStatus } from '@/stores/orders'

const authStore = useAuthStore()
const ordersStore = useOrdersStore()

const userInfo = computed(() => authStore.userInfo)
const loading = computed(() => ordersStore.loading)
const isConnected = computed(() => ordersStore.isConnected)
const pendingCount = computed(() => ordersStore.pendingCount)

// 当前筛选条件
const currentFilter = ref<'all' | 'pending' | 'processing' | 'completed'>('pending')

// 筛选标签配置
const filterTabs = [
  { label: '待处理', value: 'pending' as const },
  { label: '制作中', value: 'processing' as const },
  { label: '已完成', value: 'completed' as const },
  { label: '全部', value: 'all' as const },
]

// 根据筛选条件显示的订单列表
const displayOrders = computed(() => {
  switch (currentFilter.value) {
    case 'pending':
      return ordersStore.pendingOrders
    case 'processing':
      return ordersStore.processingOrders
    case 'completed':
      return ordersStore.completedOrders
    case 'all':
    default:
      return ordersStore.orders
  }
})

/**
 * 格式化时间
 */
function formatTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  // 小于1分钟
  if (diff < 60 * 1000) {
    return '刚刚'
  }

  // 小于1小时
  if (diff < 60 * 60 * 1000) {
    const minutes = Math.floor(diff / (60 * 1000))
    return `${minutes}分钟前`
  }

  // 小于24小时
  if (diff < 24 * 60 * 60 * 1000) {
    const hours = Math.floor(diff / (60 * 60 * 1000))
    return `${hours}小时前`
  }

  // 格式化为 MM-DD HH:mm
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  return `${month}-${day} ${hour}:${minute}`
}

/**
 * 格式化金额（分转元）
 */
function formatAmount(amount: number): string {
  return (amount / 100).toFixed(2)
}

/**
 * 获取状态样式类名
 */
function getStatusClass(status: OrderStatus): string {
  const statusMap: Record<OrderStatus, string> = {
    待支付: 'pending',
    已支付: 'paid',
    已接单: 'processing',
    已完成: 'completed',
    已取消: 'cancelled',
    已退款: 'refunded',
  }
  return statusMap[status] || 'default'
}

/**
 * 切换筛选条件
 */
function handleFilterChange(filter: 'all' | 'pending' | 'processing' | 'completed') {
  currentFilter.value = filter
}

/**
 * 点击订单卡片，跳转到订单详情页
 */
function handleOrderClick(orderId: string) {
  Taro.navigateTo({
    url: `/pages/order-detail/index?id=${orderId}`,
  })
}

/**
 * 接单
 */
async function handleAcceptOrder(orderId: string) {
  try {
    await Taro.showModal({
      title: '确认接单',
      content: '确定要接受这个订单吗？',
    })

    await ordersStore.acceptOrder(orderId)
  } catch (error: any) {
    // 用户取消或接单失败
    if (error.errMsg && error.errMsg.includes('cancel')) {
      return
    }
    console.error('Accept order error:', error)
  }
}

/**
 * 完成订单
 */
async function handleCompleteOrder(orderId: string) {
  try {
    await Taro.showModal({
      title: '确认完成',
      content: '确定要标记这个订单为已完成吗？',
    })

    await ordersStore.completeOrder(orderId)
  } catch (error: any) {
    // 用户取消或完成失败
    if (error.errMsg && error.errMsg.includes('cancel')) {
      return
    }
    console.error('Complete order error:', error)
  }
}

/**
 * 退出登录
 */
async function handleLogout() {
  try {
    await authStore.logout()
    ordersStore.clearOrders()
    Taro.showToast({
      title: '已退出登录',
      icon: 'success',
      duration: 1500,
    })
    setTimeout(() => {
      Taro.redirectTo({ url: '/pages/login/index' })
    }, 1500)
  } catch (error) {
    console.error('Logout error:', error)
    Taro.showToast({
      title: '退出失败',
      icon: 'error',
    })
  }
}

/**
 * 跳转到数据汇总页
 */
function handleGoToStats() {
  Taro.navigateTo({
    url: '/pages/stats/index',
  })
}

/**
 * 页面加载时初始化
 */
onMounted(async () => {
  // 初始化 WebSocket 连接
  ordersStore.initWebSocket()

  // 加载订单列表
  try {
    await ordersStore.fetchOrders()
  } catch (error) {
    console.error('Failed to fetch orders:', error)
  }
})

/**
 * 页面卸载时断开 WebSocket
 */
onUnmounted(() => {
  // 注意：不在这里断开 WebSocket，因为需要在后台持续监听
  // Requirement 6.6: App 后台运行时持续监听 WebSocket 推送
})

/**
 * 页面显示时刷新订单列表
 */
Taro.useDidShow(() => {
  ordersStore.fetchOrders().catch((error) => {
    console.error('Failed to refresh orders:', error)
  })
})
</script>

<style scoped lang="less">
.order-list-container {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding-bottom: 20px;
}

.header {
  background-color: #fff;
  padding: 30px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);

  .welcome {
    font-size: 32px;
    color: #333;
    font-weight: 500;
  }

  .header-actions {
    display: flex;
    gap: 16px;
  }

  .stats-button {
    padding: 12px 24px;
    font-size: 28px;
    background-color: #409eff;
    color: #fff;
    border-radius: 8px;
    border: none;
  }

  .logout-button {
    padding: 12px 24px;
    font-size: 28px;
    background-color: #f56c6c;
    color: #fff;
    border-radius: 8px;
    border: none;
  }
}

.filter-tabs {
  display: flex;
  background-color: #fff;
  padding: 20px 30px;
  margin-bottom: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);

  .tab-item {
    flex: 1;
    text-align: center;
    padding: 16px 0;
    position: relative;
    font-size: 28px;
    color: #606266;
    border-bottom: 4px solid transparent;
    transition: all 0.3s;

    &.active {
      color: #409eff;
      border-bottom-color: #409eff;
      font-weight: 500;
    }

    .tab-label {
      display: inline-block;
    }

    .badge {
      display: inline-block;
      margin-left: 8px;
      padding: 2px 10px;
      background-color: #f56c6c;
      color: #fff;
      font-size: 20px;
      border-radius: 20px;
      min-width: 32px;
      text-align: center;
    }
  }
}

.order-list {
  padding: 0 30px;
}

.loading-container,
.empty-container {
  padding: 200px 0;
  text-align: center;
}

.loading-text,
.empty-text {
  font-size: 32px;
  color: #909399;
}

.order-cards {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.order-card {
  background-color: #fff;
  border-radius: 16px;
  padding: 30px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.order-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 20px;
  border-bottom: 1px solid #ebeef5;

  .order-info {
    display: flex;
    flex-direction: column;
    gap: 8px;

    .table-no {
      font-size: 32px;
      font-weight: 500;
      color: #303133;
    }

    .order-time {
      font-size: 24px;
      color: #909399;
    }
  }

  .order-status {
    padding: 8px 20px;
    border-radius: 8px;
    font-size: 24px;
    font-weight: 500;

    &.status-pending {
      background-color: #fef0f0;
      color: #f56c6c;
    }

    &.status-paid {
      background-color: #fdf6ec;
      color: #e6a23c;
    }

    &.status-processing {
      background-color: #ecf5ff;
      color: #409eff;
    }

    &.status-completed {
      background-color: #f0f9ff;
      color: #67c23a;
    }

    &.status-cancelled,
    &.status-refunded {
      background-color: #f4f4f5;
      color: #909399;
    }
  }
}

.order-items {
  margin-bottom: 20px;

  .order-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 0;
    font-size: 28px;

    .item-name {
      flex: 1;
      color: #606266;
    }

    .item-quantity {
      color: #909399;
      margin-left: 20px;
    }
  }
}

.order-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 20px;
  border-top: 1px solid #ebeef5;

  .total-amount {
    display: flex;
    align-items: baseline;

    .label {
      font-size: 28px;
      color: #606266;
    }

    .amount {
      font-size: 36px;
      font-weight: 600;
      color: #f56c6c;
      margin-left: 8px;
    }
  }

  .order-actions {
    display: flex;
    gap: 16px;

    .action-button {
      padding: 12px 32px;
      font-size: 28px;
      border-radius: 8px;
      border: none;

      &.accept {
        background-color: #409eff;
        color: #fff;
      }

      &.complete {
        background-color: #67c23a;
        color: #fff;
      }
    }
  }
}

.connection-status {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  background-color: #f56c6c;
  padding: 16px;
  text-align: center;
  z-index: 1000;

  .status-text {
    font-size: 24px;
    color: #fff;
  }
}
</style>
