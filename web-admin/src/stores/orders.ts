import { defineStore } from 'pinia'
import { ref } from 'vue'
import { orderApi, type Order, type OrderListParams, type OrderStatus } from '@/api'
import { useWebSocket } from '@/composables/useWebSocket'
import { ElNotification } from 'element-plus'

/**
 * WebSocket 新订单事件数据
 */
interface NewOrderEventData {
  orderId: string
  tableNo: string
  totalAmount: number // 单位：分
  createdAt: string
}

/**
 * WebSocket 订单状态变更事件数据
 */
interface OrderStatusChangedEventData {
  orderId: string
  tableId: string
  status: OrderStatus
  updatedAt: string
}

/**
 * 订单状态 Store
 * - 订单列表状态管理（含分页）
 * - 提供 fetchOrders / updateOrderStatus / refundOrder Action
 * - 监听 WebSocket order:new 和 order:status_changed 事件，实时更新列表
 */
export const useOrdersStore = defineStore('orders', () => {
  const orders = ref<Order[]>([])
  const total = ref(0)
  const loading = ref(false)
  const error = ref<string | null>(null)

  // 保存最近一次查询参数，用于 WebSocket 事件触发后刷新
  const lastParams = ref<OrderListParams | undefined>(undefined)

  // ─── WebSocket ────────────────────────────────────────────────────────────

  const { connect, on, status: wsStatus } = useWebSocket('/')

  /**
   * 初始化 WebSocket 连接并注册事件监听
   * 应在应用启动后（登录成功后）调用一次
   */
  function initWebSocket(): void {
    connect()

    // 新订单到达：刷新列表并弹出通知
    on<NewOrderEventData>('order:new', (data) => {
      ElNotification({
        title: '新订单',
        message: `桌号 ${data.tableNo} 下了新订单，金额 ¥${(data.totalAmount / 100).toFixed(2)}`,
        type: 'success',
        duration: 5000,
      })
      // 刷新订单列表以包含新订单
      fetchOrders(lastParams.value)
    })

    // 订单状态变更：更新列表中对应订单的状态
    on<OrderStatusChangedEventData>('order:status_changed', (data) => {
      const idx = orders.value.findIndex((o) => o.id === data.orderId)
      if (idx !== -1) {
        orders.value[idx] = {
          ...orders.value[idx],
          status: data.status,
          updatedAt: data.updatedAt,
        }
      }
    })
  }

  // ─── Actions ─────────────────────────────────────────────────────────────

  /**
   * 获取订单列表（支持筛选 + 分页）
   */
  async function fetchOrders(params?: OrderListParams): Promise<void> {
    loading.value = true
    error.value = null
    lastParams.value = params
    try {
      const result = await orderApi.list(params)
      orders.value = result.list
      total.value = result.total
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : '获取订单列表失败'
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * 更新订单状态
   */
  async function updateOrderStatus(id: string, status: OrderStatus): Promise<Order> {
    const updated = await orderApi.updateStatus(id, status)
    const idx = orders.value.findIndex((o) => o.id === id)
    if (idx !== -1) {
      orders.value[idx] = updated
    }
    return updated
  }

  /**
   * 发起退款
   * @param id 订单 ID
   * @param amount 退款金额（单位：分）
   */
  async function refundOrder(id: string, amount: number): Promise<void> {
    await orderApi.refund(id, amount)
    // 退款成功后刷新该订单状态
    const updated = await orderApi.detail(id)
    const idx = orders.value.findIndex((o) => o.id === id)
    if (idx !== -1) {
      orders.value[idx] = updated
    }
  }

  return {
    orders,
    total,
    loading,
    error,
    wsStatus,
    fetchOrders,
    updateOrderStatus,
    refundOrder,
    initWebSocket,
  }
})
