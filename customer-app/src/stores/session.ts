import { defineStore } from 'pinia'
import { ref } from 'vue'

/**
 * 桌台信息
 */
export interface TableInfo {
  id: string
  tableNo: string
  area?: string
  seatCount?: number
}

/**
 * 会话状态 Store
 */
export const useSessionStore = defineStore('session', () => {
  // Session Token
  const sessionToken = ref<string | null>(null)
  
  // 桌台信息
  const tableInfo = ref<TableInfo | null>(null)
  
  // OpenID
  const openId = ref<string | null>(null)

  /**
   * 设置会话信息
   */
  function setSession(token: string, table: TableInfo, openIdValue: string) {
    sessionToken.value = token
    tableInfo.value = table
    openId.value = openIdValue
  }

  /**
   * 清除会话信息
   */
  function clearSession() {
    sessionToken.value = null
    tableInfo.value = null
    openId.value = null
  }

  /**
   * 检查会话是否有效
   */
  function hasValidSession(): boolean {
    return !!sessionToken.value && !!tableInfo.value
  }

  return {
    sessionToken,
    tableInfo,
    openId,
    setSession,
    clearSession,
    hasValidSession
  }
})
