<template>
  <view class="stats-container">
    <!-- 顶部导航栏 -->
    <view class="header">
      <view class="title">数据汇总</view>
    </view>

    <!-- 加载中 -->
    <view v-if="loading" class="loading-container">
      <text class="loading-text">加载中...</text>
    </view>

    <!-- 数据卡片 -->
    <view v-else class="stats-cards">
      <!-- 今日营业额 -->
      <view class="stat-card revenue">
        <view class="card-header">
          <text class="card-icon">💰</text>
          <text class="card-title">今日营业额</text>
        </view>
        <view class="card-value">
          <text class="value-symbol">¥</text>
          <text class="value-number">{{ formatAmount(dashboardData.today_revenue) }}</text>
        </view>
        <view class="card-footer">
          <text class="footer-text">本月累计：¥{{ formatAmount(dashboardData.month_revenue) }}</text>
        </view>
      </view>

      <!-- 今日订单数 -->
      <view class="stat-card orders">
        <view class="card-header">
          <text class="card-icon">📋</text>
          <text class="card-title">今日订单数</text>
        </view>
        <view class="card-value">
          <text class="value-number">{{ dashboardData.today_order_count }}</text>
          <text class="value-unit">单</text>
        </view>
        <view class="card-footer">
          <text class="footer-text"
            >客单价：¥{{ formatAmount(dashboardData.today_avg_order_value) }}</text
          >
        </view>
      </view>

      <!-- 待处理订单数 -->
      <view class="stat-card pending">
        <view class="card-header">
          <text class="card-icon">⏰</text>
          <text class="card-title">待处理订单</text>
        </view>
        <view class="card-value">
          <text class="value-number">{{ pendingCount }}</text>
          <text class="value-unit">单</text>
        </view>
        <view class="card-footer">
          <button class="action-button" @tap="handleGoToOrders">查看订单</button>
        </view>
      </view>
    </view>

    <!-- 刷新按钮 -->
    <view v-if="!loading" class="refresh-section">
      <button class="refresh-button" @tap="handleRefresh">刷新数据</button>
    </view>

    <!-- 错误提示 -->
    <view v-if="error" class="error-container">
      <text class="error-text">{{ error }}</text>
      <button class="retry-button" @tap="handleRefresh">重试</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import Taro from '@tarojs/taro'
import { statsApi } from '@/api/index'
import { useOrdersStore } from '@/stores/orders'

const ordersStore = useOrdersStore()

// 待处理订单数（从 orders store 获取）
const pendingCount = computed(() => ordersStore.pendingCount)

// 看板数据
const dashboardData = ref({
  today_revenue: 0,
  today_order_count: 0,
  today_avg_order_value: 0,
  month_revenue: 0,
})

const loading = ref(false)
const error = ref('')

/**
 * 格式化金额（分转元）
 */
function formatAmount(amount: number): string {
  return (amount / 100).toFixed(2)
}

/**
 * 加载看板数据
 */
async function loadDashboardData() {
  loading.value = true
  error.value = ''

  try {
    const data = await statsApi.getDashboard()
    dashboardData.value = data
  } catch (err: any) {
    console.error('Failed to load dashboard data:', err)
    error.value = err.message || '加载数据失败'
    Taro.showToast({
      title: '加载数据失败',
      icon: 'error',
      duration: 2000,
    })
  } finally {
    loading.value = false
  }
}

/**
 * 刷新数据
 */
async function handleRefresh() {
  await loadDashboardData()
  // 同时刷新订单列表以更新待处理订单数
  await ordersStore.fetchOrders()
  Taro.showToast({
    title: '刷新成功',
    icon: 'success',
    duration: 1500,
  })
}

/**
 * 跳转到订单列表页
 */
function handleGoToOrders() {
  Taro.navigateBack()
}

/**
 * 页面加载时初始化
 */
onMounted(async () => {
  await loadDashboardData()
  // 确保订单数据已加载（用于获取待处理订单数）
  if (ordersStore.orders.length === 0) {
    await ordersStore.fetchOrders()
  }
})

/**
 * 页面显示时刷新数据
 */
Taro.useDidShow(() => {
  loadDashboardData()
  ordersStore.fetchOrders()
})
</script>

<style scoped lang="less">
.stats-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding-bottom: 40px;
}

.header {
  padding: 60px 30px 40px;
  text-align: center;

  .title {
    font-size: 40px;
    font-weight: 600;
    color: #fff;
  }
}

.loading-container {
  padding: 200px 0;
  text-align: center;

  .loading-text {
    font-size: 32px;
    color: #fff;
  }
}

.stats-cards {
  padding: 0 30px;
  display: flex;
  flex-direction: column;
  gap: 30px;
}

.stat-card {
  background-color: #fff;
  border-radius: 24px;
  padding: 40px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);

  .card-header {
    display: flex;
    align-items: center;
    margin-bottom: 30px;

    .card-icon {
      font-size: 48px;
      margin-right: 16px;
    }

    .card-title {
      font-size: 32px;
      color: #606266;
      font-weight: 500;
    }
  }

  .card-value {
    display: flex;
    align-items: baseline;
    margin-bottom: 20px;

    .value-symbol {
      font-size: 36px;
      color: #303133;
      font-weight: 600;
      margin-right: 4px;
    }

    .value-number {
      font-size: 56px;
      color: #303133;
      font-weight: 700;
      line-height: 1;
    }

    .value-unit {
      font-size: 28px;
      color: #909399;
      margin-left: 8px;
    }
  }

  .card-footer {
    padding-top: 20px;
    border-top: 1px solid #ebeef5;

    .footer-text {
      font-size: 26px;
      color: #909399;
    }

    .action-button {
      width: 100%;
      padding: 20px;
      font-size: 28px;
      background-color: #409eff;
      color: #fff;
      border-radius: 12px;
      border: none;
    }
  }

  &.revenue {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);

    .card-title,
    .card-value,
    .footer-text {
      color: #fff;
    }

    .card-footer {
      border-top-color: rgba(255, 255, 255, 0.2);
    }
  }

  &.orders {
    background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);

    .card-title,
    .card-value,
    .footer-text {
      color: #fff;
    }

    .card-footer {
      border-top-color: rgba(255, 255, 255, 0.2);
    }
  }

  &.pending {
    background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);

    .card-title,
    .card-value,
    .footer-text {
      color: #fff;
    }

    .card-footer {
      border-top-color: rgba(255, 255, 255, 0.2);
    }
  }
}

.refresh-section {
  padding: 40px 30px;

  .refresh-button {
    width: 100%;
    padding: 24px;
    font-size: 32px;
    background-color: #fff;
    color: #667eea;
    border-radius: 16px;
    border: none;
    font-weight: 500;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
}

.error-container {
  padding: 60px 30px;
  text-align: center;

  .error-text {
    display: block;
    font-size: 28px;
    color: #fff;
    margin-bottom: 30px;
  }

  .retry-button {
    padding: 20px 60px;
    font-size: 28px;
    background-color: #fff;
    color: #667eea;
    border-radius: 12px;
    border: none;
  }
}
</style>
