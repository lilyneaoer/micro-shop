import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useOrdersStore, OrderStatus, type Order } from '../../stores/orders'

// Mock socket instance
const mockSocket = {
  connected: false,
  on: vi.fn(),
  emit: vi.fn(),
  close: vi.fn(),
  removeAllListeners: vi.fn(),
}

// Mock socket.io-client
vi.mock('socket.io-client', () => ({
  io: vi.fn(() => mockSocket),
}))

// Mock Taro
vi.mock('@tarojs/taro', () => ({
  default: {
    showToast: vi.fn(),
    showModal: vi.fn(),
    showLoading: vi.fn(),
    hideLoading: vi.fn(),
    reLaunch: vi.fn(),
  },
}))

describe('Orders Store', () => {
  beforeEach(() => {
    // 为每个测试创建新的 Pinia 实例
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  it('should initialize with empty orders', () => {
    const store = useOrdersStore()
    
    expect(store.orders).toEqual([])
    expect(store.currentOrderId).toBeNull()
  })

  it('should add order to list', () => {
    const store = useOrdersStore()
    
    const mockOrder: Order = {
      id: 'order-1',
      orderNo: 'ORD-20240101-001',
      tableId: 'table-1',
      tableNo: 'A01',
      items: [
        {
          dishId: 'dish-1',
          dishName: '宫保鸡丁',
          unitPrice: 3800,
          quantity: 2,
          subtotal: 7600
        }
      ],
      totalAmount: 7600,
      status: OrderStatus.PENDING_PAYMENT,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    store.addOrder(mockOrder)

    expect(store.orders).toHaveLength(1)
    expect(store.orders[0]).toEqual(mockOrder)
  })

  it('should add new orders to the beginning of the list', () => {
    const store = useOrdersStore()
    
    const order1: Order = {
      id: 'order-1',
      orderNo: 'ORD-001',
      tableId: 'table-1',
      tableNo: 'A01',
      items: [],
      totalAmount: 5000,
      status: OrderStatus.PENDING_PAYMENT,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    const order2: Order = {
      id: 'order-2',
      orderNo: 'ORD-002',
      tableId: 'table-1',
      tableNo: 'A01',
      items: [],
      totalAmount: 8000,
      status: OrderStatus.PENDING_PAYMENT,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    store.addOrder(order1)
    store.addOrder(order2)

    expect(store.orders).toHaveLength(2)
    expect(store.orders[0].id).toBe('order-2')
    expect(store.orders[1].id).toBe('order-1')
  })

  it('should update order status', () => {
    const store = useOrdersStore()
    
    const mockOrder: Order = {
      id: 'order-1',
      orderNo: 'ORD-001',
      tableId: 'table-1',
      tableNo: 'A01',
      items: [],
      totalAmount: 5000,
      status: OrderStatus.PENDING_PAYMENT,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    store.addOrder(mockOrder)
    store.updateOrderStatus('order-1', OrderStatus.PAID_PENDING_ACCEPT)

    expect(store.orders[0].status).toBe(OrderStatus.PAID_PENDING_ACCEPT)
  })

  it('should not update status for non-existent order', () => {
    const store = useOrdersStore()
    
    const mockOrder: Order = {
      id: 'order-1',
      orderNo: 'ORD-001',
      tableId: 'table-1',
      tableNo: 'A01',
      items: [],
      totalAmount: 5000,
      status: OrderStatus.PENDING_PAYMENT,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    store.addOrder(mockOrder)
    store.updateOrderStatus('non-existent-id', OrderStatus.PAID_PENDING_ACCEPT)

    // 原订单状态不变
    expect(store.orders[0].status).toBe(OrderStatus.PENDING_PAYMENT)
  })

  it('should get order by ID', () => {
    const store = useOrdersStore()
    
    const mockOrder: Order = {
      id: 'order-1',
      orderNo: 'ORD-001',
      tableId: 'table-1',
      tableNo: 'A01',
      items: [],
      totalAmount: 5000,
      status: OrderStatus.PENDING_PAYMENT,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    store.addOrder(mockOrder)

    const foundOrder = store.getOrderById('order-1')
    expect(foundOrder).toEqual(mockOrder)
  })

  it('should return undefined for non-existent order ID', () => {
    const store = useOrdersStore()
    
    const foundOrder = store.getOrderById('non-existent-id')
    expect(foundOrder).toBeUndefined()
  })

  it('should set and clear current order ID', () => {
    const store = useOrdersStore()
    
    expect(store.currentOrderId).toBeNull()

    store.setCurrentOrderId('order-1')
    expect(store.currentOrderId).toBe('order-1')

    store.setCurrentOrderId(null)
    expect(store.currentOrderId).toBeNull()
  })

  it('should clear all orders', () => {
    const store = useOrdersStore()
    
    const mockOrder: Order = {
      id: 'order-1',
      orderNo: 'ORD-001',
      tableId: 'table-1',
      tableNo: 'A01',
      items: [],
      totalAmount: 5000,
      status: OrderStatus.PENDING_PAYMENT,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    store.addOrder(mockOrder)
    store.setCurrentOrderId('order-1')

    expect(store.orders).toHaveLength(1)
    expect(store.currentOrderId).toBe('order-1')

    store.clearOrders()

    expect(store.orders).toHaveLength(0)
    expect(store.currentOrderId).toBeNull()
  })

  it('should return correct status text', () => {
    const store = useOrdersStore()
    
    expect(store.getStatusText(OrderStatus.PENDING_PAYMENT)).toBe('待支付')
    expect(store.getStatusText(OrderStatus.PAID_PENDING_ACCEPT)).toBe('待接单')
    expect(store.getStatusText(OrderStatus.ACCEPTED_IN_PROGRESS)).toBe('制作中')
    expect(store.getStatusText(OrderStatus.COMPLETED)).toBe('已完成')
    expect(store.getStatusText(OrderStatus.CANCELLED)).toBe('已取消')
    expect(store.getStatusText(OrderStatus.REFUNDED)).toBe('已退款')
  })

  describe('WebSocket functionality', () => {
    it('should initialize WebSocket connection', () => {
      const store = useOrdersStore()
      
      // Just verify the function can be called without errors
      store.initWebSocket('test-session-token')
      
      // Verify socket event handlers are registered
      expect(mockSocket.on).toHaveBeenCalled()
    })

    it('should disconnect WebSocket', () => {
      const store = useOrdersStore()
      
      store.initWebSocket('test-session-token')
      store.disconnectWebSocket()
      
      expect(mockSocket.removeAllListeners).toHaveBeenCalled()
      expect(mockSocket.close).toHaveBeenCalled()
    })
  })
})
