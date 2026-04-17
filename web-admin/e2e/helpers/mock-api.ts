import { type Page, type Route } from '@playwright/test'

/**
 * 模拟后端 API 响应，用于 E2E 测试中不依赖真实后端
 */

/** 统一成功响应格式 */
function successResponse<T>(data: T) {
  return { code: 0, message: 'success', data }
}

/** 模拟登录接口 */
export async function mockLoginApi(page: Page): Promise<void> {
  await page.route('**/api/auth/login', async (route: Route) => {
    const body = route.request().postDataJSON()
    if (body?.username === 'admin' && body?.password === 'admin123') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(
          successResponse({
            token: 'mock-jwt-token-for-testing',
            expiresIn: 86400,
          }),
        ),
      })
    } else {
      // 返回 HTTP 200 + 非零业务码，让 axios 响应拦截器解析业务错误
      // 避免 HTTP 401 被 axios 拦截器覆盖为"未授权，请重新登录"
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ code: 2002, message: '用户名或密码错误', data: null }),
      })
    }
  })
}

/** 模拟桌台列表接口 */
export async function mockTablesApi(page: Page): Promise<void> {
  const mockTables = [
    {
      id: 'table-001',
      tableNo: 'A01',
      seatCount: 4,
      area: '大厅',
      qrToken: 'qr-token-a01',
      isActive: true,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    },
  ]

  // GET /api/tables - 获取桌台列表
  await page.route('**/api/tables', async (route: Route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(successResponse(mockTables)),
      })
    } else if (route.request().method() === 'POST') {
      // 创建桌台
      const body = route.request().postDataJSON()
      const newTable = {
        id: 'table-new-001',
        tableNo: body.tableNo,
        seatCount: body.seatCount,
        area: body.area,
        qrToken: `qr-token-${body.tableNo.toLowerCase()}`,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      mockTables.push(newTable)
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(successResponse(newTable)),
      })
    } else {
      await route.continue()
    }
  })

  // GET /api/tables/:id/qrcode - 获取二维码 token
  await page.route('**/api/tables/*/qrcode', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(successResponse({ qrToken: 'mock-qr-token-12345' })),
    })
  })

  // DELETE /api/tables/:id
  await page.route('**/api/tables/*', async (route: Route) => {
    if (route.request().method() === 'DELETE') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(successResponse(null)),
      })
    } else {
      await route.continue()
    }
  })
}

/** 模拟菜单（分类 + 菜品）接口 */
export async function mockMenuApi(page: Page): Promise<void> {
  const mockCategories = [
    {
      id: 'cat-001',
      name: '热菜',
      sortOrder: 1,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    },
  ]

  const mockDishes: Array<{
    id: string
    categoryId: string
    name: string
    description: string
    price: number
    imageUrl: string
    isAvailable: boolean
    hasSku: boolean
    sortOrder: number
    skus: unknown[]
    createdAt: string
    updatedAt: string
  }> = []

  // GET/POST /api/categories
  await page.route('**/api/categories', async (route: Route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(successResponse(mockCategories)),
      })
    } else if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON()
      const newCat = {
        id: `cat-${Date.now()}`,
        name: body.name,
        sortOrder: body.sortOrder ?? 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      mockCategories.push(newCat)
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(successResponse(newCat)),
      })
    } else {
      await route.continue()
    }
  })

  // GET/POST /api/dishes
  await page.route('**/api/dishes', async (route: Route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(successResponse(mockDishes)),
      })
    } else if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON()
      const newDish = {
        id: `dish-${Date.now()}`,
        categoryId: body.categoryId,
        name: body.name,
        description: body.description ?? '',
        price: body.price,
        imageUrl: '',
        isAvailable: body.isAvailable ?? true,
        hasSku: body.hasSku ?? false,
        sortOrder: body.sortOrder ?? 0,
        skus: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      mockDishes.push(newDish)
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(successResponse(newDish)),
      })
    } else {
      await route.continue()
    }
  })

  // PUT /api/dishes/:id (上架/下架)
  await page.route('**/api/dishes/*', async (route: Route) => {
    if (route.request().method() === 'PUT') {
      const url = route.request().url()
      // 排除 /image 子路径
      if (url.includes('/image')) {
        await route.continue()
        return
      }
      const body = route.request().postDataJSON()
      const dishId = url.split('/dishes/')[1]
      const dish = mockDishes.find((d) => d.id === dishId)
      if (dish) {
        Object.assign(dish, body, { updatedAt: new Date().toISOString() })
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(successResponse(dish)),
        })
      } else {
        await route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({ code: 1004, message: '菜品不存在', data: null }),
        })
      }
    } else {
      await route.continue()
    }
  })

  // POST /api/dishes/:id/image - 图片上传
  await page.route('**/api/dishes/*/image', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(
        successResponse({ imageUrl: 'https://example.com/mock-dish-image.jpg' }),
      ),
    })
  })
}

/** 模拟订单接口 */
export async function mockOrdersApi(page: Page): Promise<void> {
  const mockOrders = [
    {
      id: 'order-001',
      orderNo: 'ORD20240101001',
      tableId: 'table-001',
      tableNo: 'A01',
      totalAmount: 8800, // 88.00 元
      status: 'paid',
      customerRemark: '不要辣',
      paidAt: '2024-01-01T12:00:00.000Z',
      items: [
        {
          id: 'item-001',
          dishId: 'dish-001',
          skuId: null,
          dishName: '宫保鸡丁',
          skuName: null,
          unitPrice: 2800,
          quantity: 2,
          subtotal: 5600,
        },
        {
          id: 'item-002',
          dishId: 'dish-002',
          skuId: null,
          dishName: '麻婆豆腐',
          skuName: null,
          unitPrice: 1600,
          quantity: 2,
          subtotal: 3200,
        },
      ],
      createdAt: '2024-01-01T11:55:00.000Z',
      updatedAt: '2024-01-01T12:00:00.000Z',
    },
  ]

  // GET /api/orders
  await page.route(/\/api\/orders(\?.*)?$/, async (route: Route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(successResponse({ list: mockOrders, total: mockOrders.length })),
      })
    } else {
      await route.continue()
    }
  })

  // PUT /api/orders/:id/status
  await page.route('**/api/orders/*/status', async (route: Route) => {
    if (route.request().method() === 'PUT') {
      const body = route.request().postDataJSON()
      const url = route.request().url()
      const orderId = url.split('/orders/')[1].split('/status')[0]
      const order = mockOrders.find((o) => o.id === orderId)
      if (order) {
        order.status = body.status
        order.updatedAt = new Date().toISOString()
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(successResponse({ ...order })),
        })
      } else {
        await route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({ code: 1004, message: '订单不存在', data: null }),
        })
      }
    } else {
      await route.continue()
    }
  })
}

/** 模拟统计看板接口（防止看板页面报错） */
export async function mockStatsApi(page: Page): Promise<void> {
  await page.route('**/api/stats/dashboard', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(
        successResponse({
          today_revenue: 0,
          today_order_count: 0,
          today_avg_order_value: 0,
          month_revenue: 0,
        }),
      ),
    })
  })

  await page.route('**/api/stats/**', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(successResponse([])),
    })
  })
}

/** 模拟 WebSocket 连接（防止 socket.io 连接失败报错） */
export async function mockWebSocket(page: Page): Promise<void> {
  // 拦截 socket.io 轮询请求，返回空响应
  await page.route('**/socket.io/**', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ sid: 'mock-sid', upgrades: [], pingInterval: 25000, pingTimeout: 5000 }),
    })
  })
}

/**
 * 设置所有 mock API（登录后的完整环境）
 */
export async function setupAllMocks(page: Page): Promise<void> {
  await mockLoginApi(page)
  await mockTablesApi(page)
  await mockMenuApi(page)
  await mockOrdersApi(page)
  await mockStatsApi(page)
  await mockWebSocket(page)
}
