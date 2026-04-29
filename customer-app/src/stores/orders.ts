import { defineStore } from 'pinia'
import { ref } from 'vue'
import { io, Socket } from 'socket.io-client'
import Taro from '@tarojs/taro'

/**
 * 订单状态枚举
 */
export enum OrderStatus {
  PENDING_PAYMENT = 'pending_payment',      // 待支付
  PAID_PENDING_ACCEPT = 'paid_pending_accept', // 已支付/待接单
  ACCEPTED_IN_PROGRESS = 'accepted_in_progress', // 已接单/制作中
  COMPLETED = 'completed',                  // 已完成
  CANCELLED = 'cancelled',                  // 已取消
  REFUNDED = 'refunded'                     // 已退款
}

/**
 * 订单项
 */
export interface OrderItem {
  dishId: string
  dishName: string
  skuId?: string
  skuName?: string
  unitPrice: number // 单位：分
  quantity: number
  subtotal: number // 单位：分
}

/**
 * 订单信息
 */
export interface Order {
  id: string
  orderNo: string
  tableId: string
  tableNo: string
  items: OrderItem[]
  totalAmount: number // 单位：分
  status: OrderStatus
  customerRemark?: string
  createdAt: string
  paidAt?: string
  updatedAt: string
}

/**
 * WebSocket 连接配置
 */
const WS_CONFIG = {
  baseURL: process.env.NODE_ENV === 'development' 
    ? 'http://localhost:7001' 
    : 'http://localhost:7001',
  reconnectionDelays: [1000, 2000, 4000, 8000, 30000], // 指数退避：1s → 2s → 4s → 8s → 最大 30s
}

/**
 * 订单状态 Store
 * 需求：5.2、5.3、5.7、10.3、10.4
 */
export const useOrdersStore = defineStore('orders', () => {
  // 当前 Session 内的订单列表
  const orders = ref<Order[]>([])

  // 当前正在处理的订单 ID（用于支付流程）
  const currentOrderId = ref<string | null>(null)

  // WebSocket 连接实例
  let socket: Socket | null = null

  // 重连计数器
  let reconnectAttempts = 0

  // 是否正在重连
  let isReconnecting = false

  /**
   * 添加订单到列表
   */
  function addOrder(order: Order) {
    orders.value.unshift(order)
  }

  /**
   * 更新订单状态
   * 需求：5.2、5.3 - 订单状态更新延迟不超过 5 秒（WebSocket 推送）
   */
  function updateOrderStatus(orderId: string, status: OrderStatus) {
    const order = orders.value.find(o => o.id === orderId)
    if (order) {
      order.status = status
      order.updatedAt = new Date().toISOString()
    }
  }

  /**
   * 根据 ID 获取订单
   */
  function getOrderById(orderId: string): Order | undefined {
    return orders.value.find(o => o.id === orderId)
  }

  /**
   * 设置当前订单 ID
   */
  function setCurrentOrderId(orderId: string | null) {
    currentOrderId.value = orderId
  }

  /**
   * 清空订单列表（Session 过期时调用）
   */
  function clearOrders() {
    orders.value = []
    currentOrderId.value = null
  }

  /**
   * 初始化 WebSocket 连接
   * 需求：5.2、5.3、10.3、10.4
   * 
   * @param sessionToken - Session Token 用于认证
   */
  function initWebSocket(sessionToken: string) {
    if (socket && socket.connected) {
      console.log('WebSocket already connected')
      return
    }

    console.log('Initializing WebSocket connection...')

    socket = io(WS_CONFIG.baseURL, {
      auth: {
        token: sessionToken
      },
      transports: ['websocket', 'polling'],
      reconnection: false, // 手动控制重连
    })

    // 连接成功
    socket.on('connect', () => {
      console.log('WebSocket connected')
      reconnectAttempts = 0
      isReconnecting = false
      
      Taro.showToast({
        title: '连接成功',
        icon: 'success',
        duration: 1500
      })
    })

    // 认证成功
    socket.on('authenticated', (data) => {
      console.log('WebSocket authenticated:', data)
    })

    // 监听订单状态变更事件
    // 需求：5.2、5.3 - 实时接收订单状态变更，延迟不超过 5 秒
    socket.on('order:status_changed', (data: {
      orderId: string
      tableId: string
      status: OrderStatus
      updatedAt: string
    }) => {
      console.log('Received order:status_changed event:', data)
      updateOrderStatus(data.orderId, data.status)
      
      // 显示状态变更提示
      const statusText = getStatusText(data.status)
      Taro.showToast({
        title: `订单状态已更新：${statusText}`,
        icon: 'none',
        duration: 2000
      })
    })

    // 连接错误
    socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error)
      handleReconnect(sessionToken)
    })

    // 断开连接
    socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason)
      
      // 如果是服务端主动断开或网络问题，尝试重连
      if (reason === 'io server disconnect' || reason === 'transport close') {
        handleReconnect(sessionToken)
      }
    })

    // 错误事件
    socket.on('error', (error) => {
      console.error('WebSocket error:', error)
      Taro.showToast({
        title: error.message || '连接错误',
        icon: 'none',
        duration: 2000
      })
    })
  }

  /**
   * 处理重连逻辑
   * 需求：实现 WebSocket 断线指数退避重连（1s → 2s → 4s → 8s，最大 30s）
   * 
   * @param sessionToken - Session Token
   */
  function handleReconnect(sessionToken: string) {
    if (isReconnecting) {
      return
    }

    isReconnecting = true

    // 获取当前重连延迟（指数退避）
    const delayIndex = Math.min(reconnectAttempts, WS_CONFIG.reconnectionDelays.length - 1)
    const delay = WS_CONFIG.reconnectionDelays[delayIndex]

    console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttempts + 1})...`)

    setTimeout(() => {
      reconnectAttempts++
      isReconnecting = false
      
      // 断开旧连接
      if (socket) {
        socket.removeAllListeners()
        socket.close()
      }

      // 重新初始化连接
      initWebSocket(sessionToken)
    }, delay)
  }

  /**
   * 断开 WebSocket 连接
   */
  function disconnectWebSocket() {
    if (socket) {
      console.log('Disconnecting WebSocket...')
      socket.removeAllListeners()
      socket.close()
      socket = null
    }
    reconnectAttempts = 0
    isReconnecting = false
  }

  /**
   * 获取订单状态文本
   */
  function getStatusText(status: OrderStatus): string {
    const statusMap: Record<OrderStatus, string> = {
      [OrderStatus.PENDING_PAYMENT]: '待支付',
      [OrderStatus.PAID_PENDING_ACCEPT]: '待接单',
      [OrderStatus.ACCEPTED_IN_PROGRESS]: '制作中',
      [OrderStatus.COMPLETED]: '已完成',
      [OrderStatus.CANCELLED]: '已取消',
      [OrderStatus.REFUNDED]: '已退款',
    }
    return statusMap[status] || '未知状态'
  }

  return {
    orders,
    currentOrderId,
    addOrder,
    updateOrderStatus,
    getOrderById,
    setCurrentOrderId,
    clearOrders,
    initWebSocket,
    disconnectWebSocket,
    getStatusText
  }
})
