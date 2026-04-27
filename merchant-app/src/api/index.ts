import Taro from '@tarojs/taro'

/**
 * API 基础配置
 */
const BASE_URL =
  process.env.NODE_ENV === 'development'
    ? 'http://localhost:7001/api'
    : 'http://localhost:7001/api'

/**
 * 统一 API 响应格式
 */
export interface ApiResponse<T = any> {
  code: number
  message: string
  data: T
}

/**
 * API 错误类
 */
export class ApiError extends Error {
  code: number
  constructor(code: number, message: string) {
    super(message)
    this.code = code
    this.name = 'ApiError'
  }
}

/**
 * 封装 Taro.request，统一处理响应格式和 Token 注入
 */
async function request<T = any>(options: {
  url: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  data?: any
  header?: Record<string, string>
}): Promise<T> {
  const { url, method = 'GET', data, header = {} } = options

  // 从本地存储读取 Token
  const token = Taro.getStorageSync('token')
  if (token) {
    header['Authorization'] = `Bearer ${token}`
  }

  try {
    const response = await Taro.request({
      url: `${BASE_URL}${url}`,
      method,
      data,
      header: {
        'Content-Type': 'application/json',
        ...header,
      },
    })

    const result = response.data as ApiResponse<T>

    // 统一错误处理
    if (result.code !== 0) {
      // Token 过期或无效，跳转登录页
      if (result.code === 1002) {
        Taro.removeStorageSync('token')
        Taro.reLaunch({ url: '/pages/login/index' })
      }
      throw new ApiError(result.code, result.message)
    }

    return result.data
  } catch (error: any) {
    if (error instanceof ApiError) {
      throw error
    }
    // 网络错误或其他异常
    throw new ApiError(9999, error.errMsg || '网络请求失败')
  }
}

/**
 * 认证相关 API
 */
export interface LoginParams {
  username: string
  password: string
}

export interface LoginResult {
  token: string
}

export const authApi = {
  /**
   * 商家登录
   */
  login(params: LoginParams): Promise<LoginResult> {
    return request<LoginResult>({
      url: '/auth/login',
      method: 'POST',
      data: params,
    })
  },

  /**
   * 商家登出
   */
  logout(): Promise<void> {
    return request<void>({
      url: '/auth/logout',
      method: 'POST',
    })
  },
}

/**
 * 数据统计相关 API
 */
export interface DashboardData {
  today_revenue: number
  today_order_count: number
  today_avg_order_value: number
  month_revenue: number
}

export const statsApi = {
  /**
   * 获取看板数据
   * Requirement 8.4
   */
  getDashboard(): Promise<DashboardData> {
    return request<DashboardData>({
      url: '/stats/dashboard',
      method: 'GET',
    })
  },
}
