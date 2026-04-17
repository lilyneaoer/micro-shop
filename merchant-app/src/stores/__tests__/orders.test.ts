import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useOrdersStore, type Order, type OrderStatus } from '../orders'

// Mock Taro
vi.mock('@tarojs/taro', () => ({
  default: {
    request: vi.fn(),
    showToast: vi.fn(),
    vibrateShort: vi.fn(),
    getStorageSync: vi.fn(() => null),
    setStorageSync: vi.fn(),
    removeStorageSync: vi.fn(),
    createInnerAudioContext: vi.fn(() => ({
      src: '',
      play: vi.fn(),
      destroy: vi.fn(),
      onEnded: vi.fn(),
      onError: vi.fn(),
    })),
  },
}))

// Mock socket.io-client
vi.mock('socket.io-client', () => ({
  io: vi.fn(() => ({
    on: vi.fn(),
    emit: vi.fn(),
    disconnect: vi.fn(),
    connected: false,
  })),
}))

describe('Orders Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('should initialize with empty orders', () => {
    const store = useOrdersStore()
    expect(store.orders).toEqual([])
    expect(store.loading).toBe(false)
    expect(store.isConnected).toBe(false)
  })

  it('should compute pending orders correctly', () => {
    const store = useOrdersStore()

    const mockOrders: Order[] = [
      {
        id: '1',
        order_no: 'ORDER001',
        merchant_id: 'merchant1',
        table_id: 'table1',
        session_id: 'session1',
        total_amount: 10000,
        status: '已支付',
        customer_remark: null,
        paid_at: '2024-01-01T10:00:00Z',
        created_at: '2024-01-01T10:00:00Z',
        updated_at: '2024-01-01T10:00:00Z',
        items: [],
      },
      {
        id: '2',
        order_no: 'ORDER002',
        merchant_id: 'merchant1',
        table_id: 'table2',
        session_id: 'session2',
        total_amount: 20000,
        status: '已接单',
        customer_remark: null,
        paid_at: '2024-01-01T11:00:00Z',
        created_at: '2024-01-01T11:00:00Z',
        updated_at: '2024-01-01T11:00:00Z',
        items: [],
      },
      {
        id: '3',
        order_no: 'ORDER003',
        merchant_id: 'merchant1',
        table_id: 'table3',
        session_id: 'session3',
        total_amount: 15000,
        status: '已支付',
        customer_remark: null,
        paid_at: '2024-01-01T12:00:00Z',
        created_at: '2024-01-01T12:00:00Z',
        updated_at: '2024-01-01T12:00:00Z',
        items: [],
      },
    ]

    store.orders = mockOrders

    expect(store.pendingOrders).toHaveLength(2)
    expect(store.pendingOrders[0].status).toBe('已支付')
    expect(store.pendingOrders[1].status).toBe('已支付')
    expect(store.pendingCount).toBe(2)
  })

  it('should compute processing orders correctly', () => {
    const store = useOrdersStore()

    const mockOrders: Order[] = [
      {
        id: '1',
        order_no: 'ORDER001',
        merchant_id: 'merchant1',
        table_id: 'table1',
        session_id: 'session1',
        total_amount: 10000,
        status: '已接单',
        customer_remark: null,
        paid_at: '2024-01-01T10:00:00Z',
        created_at: '2024-01-01T10:00:00Z',
        updated_at: '2024-01-01T10:00:00Z',
        items: [],
      },
      {
        id: '2',
        order_no: 'ORDER002',
        merchant_id: 'merchant1',
        table_id: 'table2',
        session_id: 'session2',
        total_amount: 20000,
        status: '已完成',
        customer_remark: null,
        paid_at: '2024-01-01T11:00:00Z',
        created_at: '2024-01-01T11:00:00Z',
        updated_at: '2024-01-01T11:00:00Z',
        items: [],
      },
    ]

    store.orders = mockOrders

    expect(store.processingOrders).toHaveLength(1)
    expect(store.processingOrders[0].status).toBe('已接单')
  })

  it('should compute completed orders correctly', () => {
    const store = useOrdersStore()

    const mockOrders: Order[] = [
      {
        id: '1',
        order_no: 'ORDER001',
        merchant_id: 'merchant1',
        table_id: 'table1',
        session_id: 'session1',
        total_amount: 10000,
        status: '已完成',
        customer_remark: null,
        paid_at: '2024-01-01T10:00:00Z',
        created_at: '2024-01-01T10:00:00Z',
        updated_at: '2024-01-01T10:00:00Z',
        items: [],
      },
      {
        id: '2',
        order_no: 'ORDER002',
        merchant_id: 'merchant1',
        table_id: 'table2',
        session_id: 'session2',
        total_amount: 20000,
        status: '已完成',
        customer_remark: null,
        paid_at: '2024-01-01T11:00:00Z',
        created_at: '2024-01-01T11:00:00Z',
        updated_at: '2024-01-01T11:00:00Z',
        items: [],
      },
    ]

    store.orders = mockOrders

    expect(store.completedOrders).toHaveLength(2)
    expect(store.completedOrders[0].status).toBe('已完成')
    expect(store.completedOrders[1].status).toBe('已完成')
  })

  it('should clear orders on clearOrders()', () => {
    const store = useOrdersStore()

    store.orders = [
      {
        id: '1',
        order_no: 'ORDER001',
        merchant_id: 'merchant1',
        table_id: 'table1',
        session_id: 'session1',
        total_amount: 10000,
        status: '已支付',
        customer_remark: null,
        paid_at: '2024-01-01T10:00:00Z',
        created_at: '2024-01-01T10:00:00Z',
        updated_at: '2024-01-01T10:00:00Z',
        items: [],
      },
    ]

    expect(store.orders).toHaveLength(1)

    store.clearOrders()

    expect(store.orders).toHaveLength(0)
  })

  it('should handle order status filtering', () => {
    const store = useOrdersStore()

    const mockOrders: Order[] = [
      {
        id: '1',
        order_no: 'ORDER001',
        merchant_id: 'merchant1',
        table_id: 'table1',
        session_id: 'session1',
        total_amount: 10000,
        status: '已支付',
        customer_remark: null,
        paid_at: '2024-01-01T10:00:00Z',
        created_at: '2024-01-01T10:00:00Z',
        updated_at: '2024-01-01T10:00:00Z',
        items: [],
      },
      {
        id: '2',
        order_no: 'ORDER002',
        merchant_id: 'merchant1',
        table_id: 'table2',
        session_id: 'session2',
        total_amount: 20000,
        status: '已接单',
        customer_remark: null,
        paid_at: '2024-01-01T11:00:00Z',
        created_at: '2024-01-01T11:00:00Z',
        updated_at: '2024-01-01T11:00:00Z',
        items: [],
      },
      {
        id: '3',
        order_no: 'ORDER003',
        merchant_id: 'merchant1',
        table_id: 'table3',
        session_id: 'session3',
        total_amount: 15000,
        status: '已完成',
        customer_remark: null,
        paid_at: '2024-01-01T12:00:00Z',
        created_at: '2024-01-01T12:00:00Z',
        updated_at: '2024-01-01T12:00:00Z',
        items: [],
      },
      {
        id: '4',
        order_no: 'ORDER004',
        merchant_id: 'merchant1',
        table_id: 'table4',
        session_id: 'session4',
        total_amount: 25000,
        status: '已取消',
        customer_remark: null,
        paid_at: null,
        created_at: '2024-01-01T13:00:00Z',
        updated_at: '2024-01-01T13:00:00Z',
        items: [],
      },
    ]

    store.orders = mockOrders

    // Test all computed properties
    expect(store.pendingOrders).toHaveLength(1)
    expect(store.processingOrders).toHaveLength(1)
    expect(store.completedOrders).toHaveLength(1)

    // Verify correct filtering
    expect(store.pendingOrders[0].id).toBe('1')
    expect(store.processingOrders[0].id).toBe('2')
    expect(store.completedOrders[0].id).toBe('3')
  })
})
