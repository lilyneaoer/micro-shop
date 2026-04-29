import Taro from '@tarojs/taro'

/**
 * API 响应统一格式
 */
export interface ApiResponse<T = any> {
  code: number
  message: string
  data: T
}

/**
 * API 配置
 */
const API_CONFIG = {
  // 开发环境使用本地后端
  baseURL: process.env.NODE_ENV === 'development' 
    ? 'http://localhost:7001' 
    : 'http://localhost:7001',
  timeout: 10000
}

/**
 * 获取 Session Token
 */
function getSessionToken(): string | null {
  try {
    return Taro.getStorageSync('session_token')
  } catch (error) {
    console.error('获取 Session Token 失败:', error)
    return null
  }
}

/**
 * 设置 Session Token
 */
export function setSessionToken(token: string): void {
  try {
    Taro.setStorageSync('session_token', token)
  } catch (error) {
    console.error('设置 Session Token 失败:', error)
  }
}

/**
 * 清除 Session Token
 */
export function clearSessionToken(): void {
  try {
    Taro.removeStorageSync('session_token')
  } catch (error) {
    console.error('清除 Session Token 失败:', error)
  }
}

/**
 * 请求拦截器 - 注入 Session Token
 */
Taro.addInterceptor((chain) => {
  const requestParams = chain.requestParams
  const { url, header = {} } = requestParams

  // 如果是完整 URL，直接使用；否则拼接 baseURL
  const fullUrl = url.startsWith('http') ? url : `${API_CONFIG.baseURL}${url}`

  // 注入 Session Token（使用 X-Session-Token header，符合后端 optionalAuth 中间件的要求）
  const sessionToken = getSessionToken()
  if (sessionToken) {
    header['X-Session-Token'] = sessionToken
  }

  // 设置默认 Content-Type
  if (!header['Content-Type']) {
    header['Content-Type'] = 'application/json'
  }

  return chain.proceed({
    ...requestParams,
    url: fullUrl,
    header,
    timeout: API_CONFIG.timeout
  })
})

/**
 * 统一请求方法
 */
export async function request<T = any>(options: {
  url: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  data?: any
  header?: Record<string, string>
}): Promise<ApiResponse<T>> {
  const { url, method = 'GET', data, header } = options

  try {
    const response = await Taro.request({
      url,
      method,
      data,
      header
    })

    const result = response.data as ApiResponse<T>

    // 统一处理响应
    if (result.code === 0) {
      return result
    }

    // 处理特殊错误码
    if (result.code === 1002 || result.code === 5002) {
      // Token 无效或 Session 过期
      clearSessionToken()
      Taro.showToast({
        title: result.message || 'Session 已过期，请重新扫码',
        icon: 'none',
        duration: 2000
      })
      // 跳转到扫码页
      setTimeout(() => {
        Taro.reLaunch({ url: '/pages/scan/index' })
      }, 2000)
    } else if (result.code === 5001) {
      // 桌台不可用
      Taro.showModal({
        title: '提示',
        content: result.message || '该桌台不可用，请联系服务员',
        showCancel: false
      })
    } else {
      // 其他错误
      Taro.showToast({
        title: result.message || '请求失败',
        icon: 'none',
        duration: 2000
      })
    }

    return result
  } catch (error: any) {
    console.error('请求失败:', error)
    
    // 网络错误处理
    const errorMessage = error.errMsg || '网络请求失败，请检查网络连接'
    Taro.showToast({
      title: errorMessage,
      icon: 'none',
      duration: 2000
    })

    return {
      code: 9999,
      message: errorMessage,
      data: null as any
    }
  }
}

/**
 * GET 请求
 */
export function get<T = any>(url: string, data?: any): Promise<ApiResponse<T>> {
  return request<T>({ url, method: 'GET', data })
}

/**
 * POST 请求
 */
export function post<T = any>(url: string, data?: any): Promise<ApiResponse<T>> {
  return request<T>({ url, method: 'POST', data })
}

/**
 * PUT 请求
 */
export function put<T = any>(url: string, data?: any): Promise<ApiResponse<T>> {
  return request<T>({ url, method: 'PUT', data })
}

/**
 * DELETE 请求
 */
export function del<T = any>(url: string, data?: any): Promise<ApiResponse<T>> {
  return request<T>({ url, method: 'DELETE', data })
}
