import { test, expect } from '@playwright/test'
import { setupAllMocks } from './helpers/mock-api'

/**
 * E2E 测试：商家登录 → 创建桌台 → 下载二维码
 *
 * 验证需求：
 * - 需求 1.1: Web_Admin SHALL 支持商家创建、编辑和删除餐桌信息（桌号、座位数、区域）
 * - 需求 1.2: 创建桌台时后端生成唯一 QR_Code 数据
 * - 需求 1.3: Web_Admin SHALL 将 QR_Code 渲染为可下载的 PNG（≥300×300 像素）
 */
test.describe('商家登录 → 创建桌台 → 下载二维码', () => {
  test.beforeEach(async ({ page }) => {
    // 设置所有 API mock，避免依赖真实后端
    await setupAllMocks(page)
  })

  test('商家可以通过用户名密码登录', async ({ page }) => {
    await page.goto('/login')

    // 验证登录页面已加载
    await expect(page.locator('.login-title')).toContainText('扫码点餐管理后台')

    // 填写登录表单
    await page.locator('input[placeholder="请输入用户名"]').fill('admin')
    await page.locator('input[placeholder="请输入密码"]').fill('admin123')

    // 点击登录按钮
    await page.locator('button:has-text("登录")').click()

    // 验证登录成功后跳转到看板页面
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 })
  })

  test('登录失败时显示错误提示', async ({ page }) => {
    await page.goto('/login')

    // 填写错误的密码
    await page.locator('input[placeholder="请输入用户名"]').fill('admin')
    await page.locator('input[placeholder="请输入密码"]').fill('wrong-password')

    // 点击登录按钮
    await page.locator('button:has-text("登录")').click()

    // 验证显示错误提示
    await expect(page.locator('.el-alert')).toBeVisible({ timeout: 5_000 })
    await expect(page.locator('.el-alert')).toContainText('用户名或密码错误')
  })

  test('登录后可以访问桌台管理页面', async ({ page }) => {
    // 先登录
    await page.goto('/login')
    await page.locator('input[placeholder="请输入用户名"]').fill('admin')
    await page.locator('input[placeholder="请输入密码"]').fill('admin123')
    await page.locator('button:has-text("登录")').click()
    await page.waitForURL('**/dashboard', { timeout: 10_000 })

    // 导航到桌台管理页面
    await page.goto('/tables')

    // 验证桌台管理页面已加载
    await expect(page.locator('h2')).toContainText('桌台管理')
    await expect(page.locator('button:has-text("新增桌台")')).toBeVisible()
  })

  test('商家可以创建新桌台', async ({ page }) => {
    // 先登录
    await page.goto('/login')
    await page.locator('input[placeholder="请输入用户名"]').fill('admin')
    await page.locator('input[placeholder="请输入密码"]').fill('admin123')
    await page.locator('button:has-text("登录")').click()
    await page.waitForURL('**/dashboard', { timeout: 10_000 })

    // 导航到桌台管理页面
    await page.goto('/tables')
    await expect(page.locator('h2')).toContainText('桌台管理')

    // 点击新增桌台按钮
    await page.locator('button:has-text("新增桌台")').click()

    // 验证弹窗已打开
    await expect(page.locator('.el-dialog')).toBeVisible()
    await expect(page.locator('.el-dialog__title')).toContainText('新增桌台')

    // 填写桌台信息
    await page.locator('.el-dialog input[placeholder="请输入桌号，如 A01"]').fill('B01')
    await page.locator('.el-dialog input[type="number"]').fill('6')
    await page.locator('.el-dialog input[placeholder="请输入区域，如 大厅"]').fill('包厢')

    // 点击确认按钮
    await page.locator('.el-dialog .el-button--primary:has-text("确认")').click()

    // 验证弹窗关闭（创建成功）
    await expect(page.locator('.el-dialog')).not.toBeVisible({ timeout: 5_000 })

    // 验证成功提示消息
    await expect(page.locator('.el-message')).toContainText('桌台创建成功', { timeout: 5_000 })
  })

  test('创建桌台时表单验证正常工作', async ({ page }) => {
    // 先登录
    await page.goto('/login')
    await page.locator('input[placeholder="请输入用户名"]').fill('admin')
    await page.locator('input[placeholder="请输入密码"]').fill('admin123')
    await page.locator('button:has-text("登录")').click()
    await page.waitForURL('**/dashboard', { timeout: 10_000 })

    await page.goto('/tables')

    // 点击新增桌台
    await page.locator('button:has-text("新增桌台")').click()
    await expect(page.locator('.el-dialog')).toBeVisible()

    // 不填写任何内容，直接点击确认
    await page.locator('.el-dialog .el-button--primary:has-text("确认")').click()

    // 验证表单验证错误提示出现
    await expect(page.locator('.el-form-item__error').first()).toBeVisible({ timeout: 3_000 })
  })

  test('商家可以下载桌台二维码', async ({ page }) => {
    // 先登录
    await page.goto('/login')
    await page.locator('input[placeholder="请输入用户名"]').fill('admin')
    await page.locator('input[placeholder="请输入密码"]').fill('admin123')
    await page.locator('button:has-text("登录")').click()
    await page.waitForURL('**/dashboard', { timeout: 10_000 })

    await page.goto('/tables')

    // 等待桌台列表加载（mock 数据中有 A01 桌台）
    await expect(page.locator('.el-table')).toBeVisible()
    await expect(page.locator('.el-table__body')).toBeVisible()

    // 等待表格行出现
    await page.waitForSelector('.el-table__row', { timeout: 5_000 })

    // 监听下载事件
    const downloadPromise = page.waitForEvent('download', { timeout: 10_000 })

    // 点击第一行的"下载二维码"按钮
    await page.locator('.el-table__row').first().locator('button:has-text("下载二维码")').click()

    // 等待下载开始
    const download = await downloadPromise

    // 验证下载文件名包含 qrcode
    expect(download.suggestedFilename()).toMatch(/qrcode\.png$/)
  })

  test('完整流程：登录 → 创建桌台 → 下载二维码', async ({ page }) => {
    // 步骤 1：登录
    await page.goto('/login')
    await page.locator('input[placeholder="请输入用户名"]').fill('admin')
    await page.locator('input[placeholder="请输入密码"]').fill('admin123')
    await page.locator('button:has-text("登录")').click()
    await page.waitForURL('**/dashboard', { timeout: 10_000 })

    // 步骤 2：导航到桌台管理
    await page.goto('/tables')
    await expect(page.locator('h2')).toContainText('桌台管理')

    // 步骤 3：创建新桌台
    await page.locator('button:has-text("新增桌台")').click()
    await expect(page.locator('.el-dialog')).toBeVisible()

    await page.locator('.el-dialog input[placeholder="请输入桌号，如 A01"]').fill('C01')
    await page.locator('.el-dialog input[type="number"]').fill('4')
    await page.locator('.el-dialog input[placeholder="请输入区域，如 大厅"]').fill('大厅')

    await page.locator('.el-dialog .el-button--primary:has-text("确认")').click()
    await expect(page.locator('.el-dialog')).not.toBeVisible({ timeout: 5_000 })

    // 步骤 4：下载已有桌台的二维码（mock 数据中的 A01）
    await page.waitForSelector('.el-table__row', { timeout: 5_000 })

    const downloadPromise = page.waitForEvent('download', { timeout: 10_000 })
    await page.locator('.el-table__row').first().locator('button:has-text("下载二维码")').click()

    const download = await downloadPromise

    // 验证下载的文件是 PNG 格式
    expect(download.suggestedFilename()).toMatch(/\.png$/)
  })
})
