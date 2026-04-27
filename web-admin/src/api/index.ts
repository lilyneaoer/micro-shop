import axios, { type AxiosInstance, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'

/**
 * 统一 API 响应格式
 * 对应后端 { code: number, message: string, data: any }
 */
export interface ApiResponse<T = unknown> {
  code: number
  message: string
  data: T
}

/**
 * 业务错误类，携带后端返回的 code 和 message
 */
export class ApiError extends Error {
  constructor(
    public readonly code: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

/**
 * 从 localStorage 获取 JWT Token
 */
function getToken(): string | null {
  return localStorage.getItem('token')
}

/**
 * 跳转至登录页，清除本地 Token
 */
function redirectToLogin(): void {
  localStorage.removeItem('token')
  // 避免在登录页重复跳转
  if (window.location.pathname !== '/login') {
    window.location.href = '/login'
  }
}

/**
 * 将对象的键从下划线命名转换为驼峰命名
 */
function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
}

/**
 * 递归转换对象/数组的键名为驼峰命名
 */
function convertKeysToCamelCase(obj: unknown): unknown {
  if (obj === null || obj === undefined) {
    return obj
  }

  if (Array.isArray(obj)) {
    return obj.map(item => convertKeysToCamelCase(item))
  }

  if (typeof obj === 'object') {
    const converted: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj)) {
      const camelKey = toCamelCase(key)
      converted[camelKey] = convertKeysToCamelCase(value)
    }
    return converted
  }

  return obj
}

/**
 * 创建 axios 实例
 */
const request: AxiosInstance = axios.create({
  baseURL: '/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
})

/**
 * 请求拦截器：自动注入 JWT Token
 */
request.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error),
)

/**
 * 响应拦截器：
 * 1. HTTP 401 → 自动跳转登录页
 * 2. 业务 code !== 0 → 抛出 ApiError
 * 3. 成功时直接返回 data 字段
 * 4. 转换下划线命名为驼峰命名
 */
request.interceptors.response.use(
  (response: AxiosResponse<ApiResponse>) => {
    const { code, message, data } = response.data

    // 业务层成功
    if (code === 0) {
      // 转换下划线命名为驼峰命名
      const convertedData = convertKeysToCamelCase(data)
      return convertedData as unknown as AxiosResponse
    }

    // 业务层 401（Token 无效/过期，错误码 1002）
    if (code === 1002) {
      redirectToLogin()
    }

    return Promise.reject(new ApiError(code, message))
  },
  (error) => {
    // HTTP 层 401
    if (error.response?.status === 401) {
      redirectToLogin()
      return Promise.reject(new ApiError(1002, '未授权，请重新登录'))
    }

    // 网络错误或超时
    if (!error.response) {
      return Promise.reject(new ApiError(-1, '网络连接失败，请检查网络'))
    }

    // 其他 HTTP 错误，尝试解析后端响应体
    const responseData = error.response?.data as ApiResponse | undefined
    if (responseData?.code !== undefined) {
      return Promise.reject(new ApiError(responseData.code, responseData.message))
    }

    return Promise.reject(new ApiError(error.response.status, error.message))
  },
)

export default request

// ─── 认证相关接口 ────────────────────────────────────────────────────────────

export interface LoginParams {
  username: string
  password: string
}

export interface LoginResult {
  token: string
  expiresIn: number
}

export const authApi = {
  login: (params: LoginParams) =>
    request.post<unknown, LoginResult>('/auth/login', params),

  logout: () =>
    request.post<unknown, void>('/auth/logout'),

  refresh: () =>
    request.post<unknown, LoginResult>('/auth/refresh'),
}

// ─── 桌台管理接口 ────────────────────────────────────────────────────────────

export interface Table {
  id: string
  tableNo: string
  seatCount: number
  area: string
  qrToken: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateTableParams {
  tableNo: string
  seatCount: number
  area: string
}

export interface UpdateTableParams extends Partial<CreateTableParams> {
  isActive?: boolean
}

export const tableApi = {
  list: () =>
    request.get<unknown, Table[]>('/tables'),

  create: (params: CreateTableParams) =>
    request.post<unknown, Table>('/tables', {
      table_no: params.tableNo,
      seat_count: params.seatCount,
      area: params.area,
    }),

  update: (id: string, params: UpdateTableParams) =>
    request.put<unknown, Table>(`/tables/${id}`, {
      ...(params.tableNo !== undefined && { table_no: params.tableNo }),
      ...(params.seatCount !== undefined && { seat_count: params.seatCount }),
      ...(params.area !== undefined && { area: params.area }),
      ...(params.isActive !== undefined && { is_active: params.isActive }),
    }),

  remove: (id: string) =>
    request.delete<unknown, void>(`/tables/${id}`),

  getQrcode: (id: string) =>
    request.get<unknown, { qrToken: string }>(`/tables/${id}/qrcode`),
}

// ─── 菜单管理接口 ────────────────────────────────────────────────────────────

export interface Category {
  id: string
  name: string
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface Dish {
  id: string
  categoryId: string
  name: string
  description: string
  price: number // 单位：分
  imageUrl: string
  isAvailable: boolean
  hasSku: boolean
  sortOrder: number
  skus?: Sku[]
  createdAt: string
  updatedAt: string
}

export interface Sku {
  id: string
  dishId: string
  name: string
  priceDelta: number // 单位：分
  isAvailable: boolean
}

export const menuApi = {
  // 分类
  listCategories: () =>
    request.get<unknown, Category[]>('/categories'),

  createCategory: (params: { name: string; sortOrder?: number }) =>
    request.post<unknown, Category>('/categories', params),

  updateCategory: (id: string, params: { name?: string; sortOrder?: number }) =>
    request.put<unknown, Category>(`/categories/${id}`, params),

  deleteCategory: (id: string) =>
    request.delete<unknown, void>(`/categories/${id}`),

  // 菜品
  listDishes: (params?: { categoryId?: string; isAvailable?: boolean }) =>
    request.get<unknown, Dish[]>('/dishes', { params }),

  createDish: (params: Omit<Dish, 'id' | 'imageUrl' | 'skus' | 'createdAt' | 'updatedAt'>) =>
    request.post<unknown, Dish>('/dishes', params),

  updateDish: (id: string, params: Partial<Omit<Dish, 'id' | 'createdAt' | 'updatedAt'>>) =>
    request.put<unknown, Dish>(`/dishes/${id}`, params),

  deleteDish: (id: string) =>
    request.delete<unknown, void>(`/dishes/${id}`),

  uploadImage: (id: string, formData: FormData) =>
    request.post<unknown, { imageUrl: string }>(`/dishes/${id}/image`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
}

// ─── 订单管理接口 ────────────────────────────────────────────────────────────

export type OrderStatus =
  | 'pending_payment'
  | 'paid'
  | 'accepted'
  | 'completed'
  | 'cancelled'
  | 'refunded'

export interface OrderItem {
  id: string
  dishId: string
  skuId: string | null
  dishName: string
  skuName: string | null
  unitPrice: number // 单位：分
  quantity: number
  subtotal: number // 单位：分
}

export interface Order {
  id: string
  orderNo: string
  tableId: string
  tableNo: string
  area: string
  totalAmount: number // 单位：分
  status: OrderStatus
  customerRemark: string
  paidAt: string | null
  items: OrderItem[]
  createdAt: string
  updatedAt: string
}

export interface OrderListParams {
  startDate?: string
  endDate?: string
  status?: OrderStatus
  tableNo?: string
  page?: number
  pageSize?: number
}

export const orderApi = {
  list: (params?: OrderListParams) =>
    request.get<unknown, { list: Order[]; total: number }>('/orders', { params }),

  detail: (id: string) =>
    request.get<unknown, Order>(`/orders/${id}`),

  updateStatus: (id: string, status: OrderStatus) =>
    request.put<unknown, Order>(`/orders/${id}/status`, { status }),

  refund: (id: string, amount: number) =>
    request.post<unknown, void>(`/orders/${id}/refund`, { amount }),
}

// ─── 数据统计接口 ────────────────────────────────────────────────────────────

export interface DashboardData {
  todayRevenue: number // 单位：分
  todayOrderCount: number
  todayAvgOrderValue: number // 单位：分
  monthRevenue: number // 单位：分
}

export interface RevenuePoint {
  date: string
  revenue: number // 单位：分
  orderCount: number
}

export interface DishRankItem {
  dishId: string
  dishName: string
  quantity: number
  revenue: number // 单位：分
}

export const statsApi = {
  dashboard: () =>
    request.get<unknown, DashboardData>('/stats/dashboard'),

  revenue: (params: { startDate: string; endDate: string }) =>
    request.get<unknown, RevenuePoint[]>('/stats/revenue', { params }),

  dishes: (params: { startDate: string; endDate: string }) =>
    request.get<unknown, DishRankItem[]>('/stats/dishes', { params }),
}
