import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi, type LoginParams } from '@/api'

export interface UserInfo {
  username: string
}

/**
 * 认证状态 Store
 * - Token 持久化至 localStorage（key: 'token'）
 * - 提供 login / logout Action
 * - 提供 isLoggedIn computed getter
 */
export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('token'))
  const userInfo = ref<UserInfo | null>(null)

  /** 是否已登录（token 存在即视为已登录） */
  const isLoggedIn = computed(() => !!token.value)

  /**
   * 登录：调用后端接口，成功后持久化 Token 并更新状态
   */
  async function login(params: LoginParams): Promise<void> {
    const result = await authApi.login(params)
    token.value = result.token
    localStorage.setItem('token', result.token)
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
      localStorage.removeItem('token')
    }
  }

  return { token, userInfo, isLoggedIn, login, logout }
})
