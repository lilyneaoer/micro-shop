import { vi } from 'vitest'

// Mock Taro APIs
global.Taro = {
  request: vi.fn(),
  login: vi.fn(),
  showModal: vi.fn(),
  showToast: vi.fn(),
  redirectTo: vi.fn(),
  navigateBack: vi.fn(),
  getStorageSync: vi.fn(),
  setStorageSync: vi.fn(),
  removeStorageSync: vi.fn()
} as any
