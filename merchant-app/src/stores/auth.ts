import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import Taro from '@tarojs/taro'
import { authApi, type LoginParams } from '@/api'

export interface UserInfo {
  username: string
}

/**
 * 认证状态 Store
 * - Token 持久化至 Taro.setStorageSync（key: 'token'）
 * - 提供 login / logout Action
 * - 提供 isLoggedIn computed getter
 * - Token 过期时自动跳转登录页并清除本地存储
 */
export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(Taro.getStorageSync('token') || null)
  const userInfo = ref<UserInfo | null>(null)

  /** 是否已登录（token 存在即视为已登录） */
  const isLoggedIn = computed(() => !!token.value)

  /**
   * 登录：调用后端接口，成功后持久化 Token 并更新状态
   */
  async function login(params: LoginParams): Promise<void> {
    const result = await authApi.login(params)
    token.value = result.token
    Taro.setStorageSync('token', result.token)
    // 从登录参数中保存用户名作为基础用户信息
    userInfo.value = { username: params.username }
  }

  /**
   * 登出：调用后端接口，清除本地 Token 并重置状态
   */
  async function logout(): Promise<void> {
    try {
      await authApi.logout()
    } finally {
      token.value = null
      userInfo.value = null
      Taro.removeStorageSync('token')
    }
  }

  /**
   * 清除认证状态（用于 Token 过期时）
   */
  function clearAuth(): void {
    token.value = null
    userInfo.value = null
    Taro.removeStorageSync('token')
  }

  return { token, userInfo, isLoggedIn, login, logout, clearAuth }
})
