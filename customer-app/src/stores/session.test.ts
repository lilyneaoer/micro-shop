import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useSessionStore } from './session'

describe('Session Store', () => {
  beforeEach(() => {
    // 为每个测试创建新的 Pinia 实例
    setActivePinia(createPinia())
  })

  it('should initialize with null values', () => {
    const store = useSessionStore()
    
    expect(store.sessionToken).toBeNull()
    expect(store.tableInfo).toBeNull()
    expect(store.openId).toBeNull()
    expect(store.hasValidSession()).toBe(false)
  })

  it('should set session information correctly', () => {
    const store = useSessionStore()
    
    const token = 'test-session-token'
    const table = {
      id: 'table-123',
      tableNo: 'A01',
      area: '大厅',
      seatCount: 4
    }
    const openId = 'test-open-id'

    store.setSession(token, table, openId)

    expect(store.sessionToken).toBe(token)
    expect(store.tableInfo).toEqual(table)
    expect(store.openId).toBe(openId)
    expect(store.hasValidSession()).toBe(true)
  })

  it('should clear session information', () => {
    const store = useSessionStore()
    
    // 先设置会话
    store.setSession('token', { id: '1', tableNo: 'A01' }, 'openid')
    expect(store.hasValidSession()).toBe(true)

    // 清除会话
    store.clearSession()

    expect(store.sessionToken).toBeNull()
    expect(store.tableInfo).toBeNull()
    expect(store.openId).toBeNull()
    expect(store.hasValidSession()).toBe(false)
  })

  it('should validate session correctly', () => {
    const store = useSessionStore()

    // 无会话信息
    expect(store.hasValidSession()).toBe(false)

    // 只有 token，没有桌台信息
    store.sessionToken = 'token'
    expect(store.hasValidSession()).toBe(false)

    // 只有桌台信息，没有 token
    store.sessionToken = null
    store.tableInfo = { id: '1', tableNo: 'A01' }
    expect(store.hasValidSession()).toBe(false)

    // 同时有 token 和桌台信息
    store.sessionToken = 'token'
    expect(store.hasValidSession()).toBe(true)
  })
})
