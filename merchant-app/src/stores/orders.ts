import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import Taro from '@tarojs/taro'
import { io, Socket } from 'socket.io-client'
import { useAuthStore } from './auth'

/**
 * 订单状态类型
 */
export type OrderStatus = '待支付' | '已支付' | '已接单' | '已完成' | '已取消' | '已退款'

/**
 * 订单项接口
 */
export interface OrderItem {
  id: string
  dish_id: string
  sku_id: string | null
  dish_name: string
  sku_name: string | null
  unit_price: number // 单位：分
  quantity: number
  subtotal: number // 单位：分
}

/**
 * 订单接口
 */
export interface Order {
  id: string
  order_no: string
  merchant_id: string
  table_id: string
  session_id: string
  total_amount: number // 单位：分
  status: OrderStatus
  customer_remark: string | null
  paid_at: string | null
  created_at: string
  updated_at: string
  items: OrderItem[]
  table?: {
    table_no: string
    area: string
  }
}

/**
 * WebSocket 事件数据接口
 */
interface OrderStatusChangedEvent {
  orderId: string
  tableId: string
  status: OrderStatus
  updatedAt: string
}

interface NewOrderEvent {
  orderId: string
  tableNo: string
  totalAmount: number
  createdAt: string
}

/**
 * 订单状态 Store
 * - 管理订单列表状态
 * - 监听 WebSocket order:new 和 order:status_changed 事件
 * - 提供订单查询、状态更新等操作
 *
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6
 */
export const useOrdersStore = defineStore('orders', () => {
  const authStore = useAuthStore()

  // 订单列表
  const orders = ref<Order[]>([])
  // WebSocket 连接实例
  const socket = ref<Socket | null>(null)
  // WebSocket 连接状态
  const isConnected = ref(false)
  // 加载状态
  const loading = ref(false)

  /**
   * 待处理订单列表（已支付状态）
   */
  const pendingOrders = computed(() => {
    return orders.value.filter((order) => order.status === '已支付')
  })

  /**
   * 制作中订单列表（已接单状态）
   */
  const processingOrders = computed(() => {
    return orders.value.filter((order) => order.status === '已接单')
  })

  /**
   * 已完成订单列表
   */
  const completedOrders = computed(() => {
    return orders.value.filter((order) => order.status === '已完成')
  })

  /**
   * 待处理订单数量
   */
  const pendingCount = computed(() => pendingOrders.value.length)

  /**
   * 初始化 WebSocket 连接
   * Requirements: 6.1, 6.6
   */
  function initWebSocket() {
    if (socket.value?.connected) {
      console.log('WebSocket already connected')
      return
    }

    const token = authStore.token
    if (!token) {
      console.warn('No token available, cannot connect WebSocket')
      return
    }

    const wsUrl =
      process.env.NODE_ENV === 'development'
        ? 'http://localhost:7001'
        : 'https://api.example.com'

    console.log('Connecting to WebSocket:', wsUrl)

    socket.value = io(wsUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30000,
      reconnectionAttempts: Infinity,
    })

    // 连接成功
    socket.value.on('connect', () => {
      console.log('WebSocket connected')
      isConnected.value = true
    })

    // 认证成功
    socket.value.on('authenticated', (data: any) => {
      console.log('WebSocket authenticated:', data)
    })

    // 连接断开
    socket.value.on('disconnect', (reason: string) => {
      console.log('WebSocket disconnected:', reason)
      isConnected.value = false
    })

    // 连接错误
    socket.value.on('error', (error: any) => {
      console.error('WebSocket error:', error)
      Taro.showToast({
        title: error.message || 'WebSocket 连接错误',
        icon: 'none',
      })
    })

    // 监听新订单事件
    // Requirement 6.1: 新订单到达时在 10 秒内收到推送通知并播放提示音
    socket.value.on('order:new', async (data: NewOrderEvent) => {
      console.log('New order received:', data)

      // 播放提示音和震动
      await playNotification()

      // 显示通知
      Taro.showToast({
        title: `新订单：${data.tableNo}`,
        icon: 'none',
        duration: 3000,
      })

      // 刷新订单列表
      await fetchOrders()
    })

    // 监听订单状态变更事件
    socket.value.on('order:status_changed', (data: OrderStatusChangedEvent) => {
      console.log('Order status changed:', data)

      // 更新本地订单状态
      const order = orders.value.find((o) => o.id === data.orderId)
      if (order) {
        order.status = data.status
        order.updated_at = data.updatedAt
      }
    })

    // 重连成功后刷新订单列表
    socket.value.on('reconnect', async () => {
      console.log('WebSocket reconnected, refreshing orders')
      await fetchOrders()
    })
  }

  /**
   * 播放新订单提示音和震动
   * Requirement 6.1: 播放提示音（Taro.vibrateShort + 音频 API）
   */
  async function playNotification() {
    try {
      // 短震动
      await Taro.vibrateShort({ type: 'heavy' })

      // 播放系统提示音（使用内置音频）
      const innerAudioContext = Taro.createInnerAudioContext()
      innerAudioContext.src = 'https://web.sdk.qcloud.com/trtc/webrtc/assets/audio/new-message.mp3'
      innerAudioContext.play()

      // 清理音频上下文
      innerAudioContext.onEnded(() => {
        innerAudioContext.destroy()
      })

      innerAudioContext.onError((error) => {
        console.error('Audio play error:', error)
        innerAudioContext.destroy()
      })
    } catch (error) {
      console.error('Notification error:', error)
    }
  }

  /**
   * 断开 WebSocket 连接
   */
  function disconnectWebSocket() {
    if (socket.value) {
      socket.value.disconnect()
      socket.value = null
      isConnected.value = false
      console.log('WebSocket disconnected manually')
    }
  }

  /**
   * 获取订单列表
   * Requirement 6.2: 展示待处理订单列表
   * Requirement 6.5: 支持按状态筛选
   */
  async function fetchOrders(filters?: {
    status?: OrderStatus
    start_date?: string
    end_date?: string
  }) {
    loading.value = true
    try {
      const token = authStore.token
      if (!token) {
        throw new Error('未登录')
      }

      const params: Record<string, string> = {}
      if (filters?.status) {
        params.status = filters.status
      }
      if (filters?.start_date) {
        params.start_date = filters.start_date
      }
      if (filters?.end_date) {
        params.end_date = filters.end_date
      }

      const response = await Taro.request({
        url: `${process.env.NODE_ENV === 'development' ? 'http://localhost:7001' : 'https://api.example.com'}/api/orders`,
        method: 'GET',
        data: params,
        header: {
          Authorization: `Bearer ${token}`,
        },
      })

      const result = response.data as { code: number; message: string; data: Order[] }

      if (result.code !== 0) {
        throw new Error(result.message)
      }

      orders.value = result.data
    } catch (error: any) {
      console.error('Fetch orders error:', error)
      Taro.showToast({
        title: error.message || '获取订单列表失败',
        icon: 'error',
      })
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * 获取订单详情
   */
  async function fetchOrderDetail(orderId: string): Promise<Order> {
    try {
      const token = authStore.token
      if (!token) {
        throw new Error('未登录')
      }

      const response = await Taro.request({
        url: `${process.env.NODE_ENV === 'development' ? 'http://localhost:7001' : 'https://api.example.com'}/api/orders/${orderId}`,
        method: 'GET',
        header: {
          Authorization: `Bearer ${token}`,
        },
      })

      const result = response.data as { code: number; message: string; data: Order }

      if (result.code !== 0) {
        throw new Error(result.message)
      }

      return result.data
    } catch (error: any) {
      console.error('Fetch order detail error:', error)
      Taro.showToast({
        title: error.message || '获取订单详情失败',
        icon: 'error',
      })
      throw error
    }
  }

  /**
   * 接单（更新订单状态为"已接单"）
   * Requirement 6.3: 商家点击接单时更新订单状态为"已接单/制作中"
   */
  async function acceptOrder(orderId: string) {
    try {
      const token = authStore.token
      if (!token) {
        throw new Error('未登录')
      }

      const response = await Taro.request({
        url: `${process.env.NODE_ENV === 'development' ? 'http://localhost:7001' : 'https://api.example.com'}/api/orders/${orderId}/status`,
        method: 'PUT',
        data: {
          status: '已接单',
        },
        header: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      const result = response.data as { code: number; message: string; data: Order }

      if (result.code !== 0) {
        throw new Error(result.message)
      }

      // 更新本地订单状态
      const order = orders.value.find((o) => o.id === orderId)
      if (order) {
        order.status = '已接单'
        order.updated_at = result.data.updated_at
      }

      Taro.showToast({
        title: '接单成功',
        icon: 'success',
      })

      return result.data
    } catch (error: any) {
      console.error('Accept order error:', error)
      Taro.showToast({
        title: error.message || '接单失败',
        icon: 'error',
      })
      throw error
    }
  }

  /**
   * 完成订单（更新订单状态为"已完成"）
   * Requirement 6.4: 商家点击完成时更新订单状态为"已完成"
   */
  async function completeOrder(orderId: string) {
    try {
      const token = authStore.token
      if (!token) {
        throw new Error('未登录')
      }

      const response = await Taro.request({
        url: `${process.env.NODE_ENV === 'development' ? 'http://localhost:7001' : 'https://api.example.com'}/api/orders/${orderId}/status`,
        method: 'PUT',
        data: {
          status: '已完成',
        },
        header: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      const result = response.data as { code: number; message: string; data: Order }

      if (result.code !== 0) {
        throw new Error(result.message)
      }

      // 更新本地订单状态
      const order = orders.value.find((o) => o.id === orderId)
      if (order) {
        order.status = '已完成'
        order.updated_at = result.data.updated_at
      }

      Taro.showToast({
        title: '订单已完成',
        icon: 'success',
      })

      return result.data
    } catch (error: any) {
      console.error('Complete order error:', error)
      Taro.showToast({
        title: error.message || '完成订单失败',
        icon: 'error',
      })
      throw error
    }
  }

  /**
   * 清空订单列表（用于登出时）
   */
  function clearOrders() {
    orders.value = []
    disconnectWebSocket()
  }

  return {
    // State
    orders,
    loading,
    isConnected,

    // Computed
    pendingOrders,
    processingOrders,
    completedOrders,
    pendingCount,

    // Actions
    initWebSocket,
    disconnectWebSocket,
    fetchOrders,
    fetchOrderDetail,
    acceptOrder,
    completeOrder,
    clearOrders,
  }
})
