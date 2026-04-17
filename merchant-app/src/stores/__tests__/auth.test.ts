import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '../auth'
import * as api from '@/api'

// Mock Taro
vi.mock('@tarojs/taro', () => ({
  default: {
    getStorageSync: vi.fn(() => null),
    setStorageSync: vi.fn(),
    removeStorageSync: vi.fn(),
    redirectTo: vi.fn(),
  },
}))

// Mock API
vi.mock('@/api', () => ({
  authApi: {
    login: vi.fn(),
    logout: vi.fn(),
  },
}))

describe('Auth Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('should initialize with no token', () => {
    const authStore = useAuthStore()
    expect(authStore.token).toBeNull()
    expect(authStore.isLoggedIn).toBe(false)
  })

  it('should set token and userInfo after successful login', async () => {
    const authStore = useAuthStore()
    const mockToken = 'test-jwt-token'

    vi.mocked(api.authApi.login).mockResolvedValue({ token: mockToken })

    await authStore.login({ username: 'testuser', password: 'password123' })

    expect(authStore.token).toBe(mockToken)
    expect(authStore.userInfo).toEqual({ username: 'testuser' })
    expect(authStore.isLoggedIn).toBe(true)
  })

  it('should clear token and userInfo after logout', async () => {
    const authStore = useAuthStore()

    // Set initial state
    authStore.token = 'test-token'
    authStore.userInfo = { username: 'testuser' }

    vi.mocked(api.authApi.logout).mockResolvedValue()

    await authStore.logout()

    expect(authStore.token).toBeNull()
    expect(authStore.userInfo).toBeNull()
    expect(authStore.isLoggedIn).toBe(false)
  })

  it('should clear auth state when clearAuth is called', () => {
    const authStore = useAuthStore()

    // Set initial state
    authStore.token = 'test-token'
    authStore.userInfo = { username: 'testuser' }

    authStore.clearAuth()

    expect(authStore.token).toBeNull()
    expect(authStore.userInfo).toBeNull()
    expect(authStore.isLoggedIn).toBe(false)
  })
})
