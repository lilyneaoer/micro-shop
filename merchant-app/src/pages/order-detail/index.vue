<template>
  <view class="order-detail-container">
    <!-- 加载中 -->
    <view v-if="loading" class="loading-container">
      <text class="loading-text">加载中...</text>
    </view>

    <!-- 订单详情 -->
    <view v-else-if="order" class="order-content">
      <!-- 订单状态卡片 -->
      <view class="status-card">
        <view :class="['status-badge', `status-${getStatusClass(order.status)}`]">
          {{ order.status }}
        </view>
        <text class="order-no">订单号：{{ order.order_no }}</text>
      </view>

      <!-- 桌台信息 -->
      <view class="info-card">
        <view class="card-title">桌台信息</view>
        <view class="info-row">
          <text class="label">桌号：</text>
          <text class="value">{{ order.table?.table_no || '未知' }}</text>
        </view>
        <view class="info-row">
          <text class="label">区域：</text>
          <text class="value">{{ order.table?.area || '未知' }}</text>
        </view>
        <view class="info-row">
          <text class="label">下单时间：</text>
          <text class="value">{{ formatDateTime(order.created_at) }}</text>
        </view>
        <view v-if="order.paid_at" class="info-row">
          <text class="label">支付时间：</text>
          <text class="value">{{ formatDateTime(order.paid_at) }}</text>
        </view>
      </view>

      <!-- 菜品列表 -->
      <view class="info-card">
        <view class="card-title">菜品明细</view>
        <view class="dish-list">
          <view v-for="item in order.items" :key="item.id" class="dish-item">
            <view class="dish-info">
              <text class="dish-name"
                >{{ item.dish_name }}{{ item.sku_name ? `（${item.sku_name}）` : '' }}</text
              >
              <text class="dish-price">¥{{ formatAmount(item.unit_price) }}</text>
            </view>
            <view class="dish-quantity">
              <text class="quantity-label">x{{ item.quantity }}</text>
              <text class="subtotal">¥{{ formatAmount(item.subtotal) }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 顾客备注 -->
      <view v-if="order.customer_remark" class="info-card">
        <view class="card-title">顾客备注</view>
        <view class="remark-content">
          <text class="remark-text">{{ order.customer_remark }}</text>
        </view>
      </view>

      <!-- 金额汇总 -->
      <view class="info-card">
        <view class="card-title">金额汇总</view>
        <view class="amount-row total">
          <text class="label">总金额：</text>
          <text class="value">¥{{ formatAmount(order.total_amount) }}</text>
        </view>
      </view>

      <!-- 操作按钮 -->
      <view class="action-buttons">
        <button
          v-if="order.status === '已支付'"
          class="action-button accept"
          @tap="handleAcceptOrder"
        >
          接单
        </button>
        <button
          v-if="order.status === '已接单'"
          class="action-button complete"
          @tap="handleCompleteOrder"
        >
          完成订单
        </button>
      </view>
    </view>

    <!-- 错误状态 -->
    <view v-else class="error-container">
      <text class="error-text">订单不存在或已被删除</text>
      <button class="back-button" @tap="handleBack">返回</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import Taro from '@tarojs/taro'
import { useOrdersStore, type Order, type OrderStatus } from '@/stores/orders'

const ordersStore = useOrdersStore()

const order = ref<Order | null>(null)
const loading = ref(true)
const orderId = ref('')

/**
 * 格式化日期时间
 */
function formatDateTime(dateString: string): string {
  const date = new Date(dateString)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  const second = String(date.getSeconds()).padStart(2, '0')
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`
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
 * 接单
 */
async function handleAcceptOrder() {
  try {
    await Taro.showModal({
      title: '确认接单',
      content: '确定要接受这个订单吗？',
    })

    await ordersStore.acceptOrder(orderId.value)

    // 刷新订单详情
    await loadOrderDetail()
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
async function handleCompleteOrder() {
  try {
    await Taro.showModal({
      title: '确认完成',
      content: '确定要标记这个订单为已完成吗？',
    })

    await ordersStore.completeOrder(orderId.value)

    // 刷新订单详情
    await loadOrderDetail()

    // 显示成功提示后返回
    setTimeout(() => {
      Taro.navigateBack()
    }, 1500)
  } catch (error: any) {
    // 用户取消或完成失败
    if (error.errMsg && error.errMsg.includes('cancel')) {
      return
    }
    console.error('Complete order error:', error)
  }
}

/**
 * 返回上一页
 */
function handleBack() {
  Taro.navigateBack()
}

/**
 * 加载订单详情
 */
async function loadOrderDetail() {
  loading.value = true
  try {
    order.value = await ordersStore.fetchOrderDetail(orderId.value)
  } catch (error) {
    console.error('Failed to load order detail:', error)
    order.value = null
  } finally {
    loading.value = false
  }
}

/**
 * 页面加载时获取订单详情
 */
onMounted(async () => {
  // 从路由参数获取订单 ID
  const instance = Taro.getCurrentInstance()
  orderId.value = instance.router?.params?.id || ''

  if (!orderId.value) {
    Taro.showToast({
      title: '订单ID不存在',
      icon: 'error',
    })
    setTimeout(() => {
      Taro.navigateBack()
    }, 1500)
    return
  }

  await loadOrderDetail()
})
</script>

<style scoped lang="less">
.order-detail-container {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding: 20px 30px;
}

.loading-container,
.error-container {
  padding: 200px 0;
  text-align: center;
}

.loading-text,
.error-text {
  font-size: 32px;
  color: #909399;
}

.back-button {
  margin-top: 40px;
  padding: 16px 48px;
  font-size: 28px;
  background-color: #409eff;
  color: #fff;
  border-radius: 8px;
  border: none;
}

.order-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.status-card {
  background-color: #fff;
  border-radius: 16px;
  padding: 40px 30px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);

  .status-badge {
    display: inline-block;
    padding: 12px 40px;
    border-radius: 12px;
    font-size: 32px;
    font-weight: 600;
    margin-bottom: 20px;

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

  .order-no {
    display: block;
    font-size: 24px;
    color: #909399;
  }
}

.info-card {
  background-color: #fff;
  border-radius: 16px;
  padding: 30px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);

  .card-title {
    font-size: 32px;
    font-weight: 500;
    color: #303133;
    margin-bottom: 24px;
    padding-bottom: 16px;
    border-bottom: 1px solid #ebeef5;
  }

  .info-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 0;
    font-size: 28px;

    .label {
      color: #606266;
    }

    .value {
      color: #303133;
      font-weight: 500;
    }
  }

  .amount-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 0;
    font-size: 28px;

    &.total {
      padding-top: 20px;
      border-top: 1px solid #ebeef5;

      .label {
        font-size: 32px;
        color: #303133;
        font-weight: 500;
      }

      .value {
        font-size: 40px;
        color: #f56c6c;
        font-weight: 600;
      }
    }
  }
}

.dish-list {
  display: flex;
  flex-direction: column;
  gap: 20px;

  .dish-item {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 20px;
    background-color: #f5f7fa;
    border-radius: 12px;

    .dish-info {
      display: flex;
      justify-content: space-between;
      align-items: center;

      .dish-name {
        flex: 1;
        font-size: 28px;
        color: #303133;
        font-weight: 500;
      }

      .dish-price {
        font-size: 28px;
        color: #606266;
        margin-left: 20px;
      }
    }

    .dish-quantity {
      display: flex;
      justify-content: space-between;
      align-items: center;

      .quantity-label {
        font-size: 24px;
        color: #909399;
      }

      .subtotal {
        font-size: 28px;
        color: #f56c6c;
        font-weight: 500;
      }
    }
  }
}

.remark-content {
  padding: 20px;
  background-color: #fef0f0;
  border-radius: 12px;
  border-left: 4px solid #f56c6c;

  .remark-text {
    font-size: 28px;
    color: #606266;
    line-height: 1.6;
  }
}

.action-buttons {
  display: flex;
  gap: 20px;
  padding: 20px 0;

  .action-button {
    flex: 1;
    padding: 24px 0;
    font-size: 32px;
    font-weight: 500;
    border-radius: 12px;
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
</style>
