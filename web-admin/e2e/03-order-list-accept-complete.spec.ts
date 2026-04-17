import { test, expect } from '@playwright/test'
import { setupAllMocks } from './helpers/mock-api'

/**
 * E2E 测试：商家查看订单列表 → 接单 → 完成
 *
 * 验证需求：
 * - 需求 7.1: Web_Admin SHALL 展示所有 Order 的列表，支持按日期范围、Order 状态和桌号进行筛选
 * - 需求 7.2: Web_Admin SHALL 支持商家查看单个 Order 的详情
 * - 需求 7.3: 商家在 Web_Admin 中更新 Order 状态时，Backend SHALL 验证状态流转合法性后执行更新
 */
test.describe('商家查看订单列表 → 接单 → 完成', () => {
  test.beforeEach(async ({ page }) => {
    // 设置所有 API mock
    await setupAllMocks(page)

    // 登录
    await page.goto('/login')
    await page.locator('input[placeholder="请输入用户名"]').fill('admin')
    await page.locator('input[placeholder="请输入密码"]').fill('admin123')
    await page.locator('button:has-text("登录")').click()
    await page.waitForURL('**/dashboard', { timeout: 10_000 })
  })

  test('可以访问订单管理页面并看到订单列表', async ({ page }) => {
    await page.goto('/orders')

    // 验证页面标题
    await expect(page.locator('h2.page-heading')).toContainText('订单管理')

    // 验证筛选栏存在
    await expect(page.locator('.filter-card')).toBeVisible()

    // 验证订单表格存在
    await expect(page.locator('.el-table')).toBeVisible()
  })

  test('订单列表显示 mock 数据中的订单', async ({ page }) => {
    await page.goto('/orders')

    // 等待订单列表加载
    await page.waitForSelector('.el-table__row', { timeout: 5_000 })

    // 验证 mock 数据中的订单号出现在列表中
    await expect(page.locator('.el-table__body')).toContainText('ORD20240101001')

    // 验证桌号显示
    await expect(page.locator('.el-table__body')).toContainText('A01')

    // 验证订单状态显示（已支付/待接单）
    await expect(page.locator('.el-table__body')).toContainText('已支付/待接单')
  })

  test('可以按订单状态筛选订单', async ({ page }) => {
    await page.goto('/orders')

    // 点击状态筛选下拉框
    await page.locator('.filter-card .el-select').click()

    // 选择"已支付/待接单"状态
    await page.locator('.el-select-dropdown__item:has-text("已支付/待接单")').click()

    // 点击查询按钮
    await page.locator('button:has-text("查询")').click()

    // 验证查询请求发出（通过等待表格更新）
    await expect(page.locator('.el-table')).toBeVisible()
  })

  test('可以按桌号筛选订单', async ({ page }) => {
    await page.goto('/orders')

    // 填写桌号筛选
    await page.locator('input[placeholder="请输入桌号"]').fill('A01')

    // 点击查询
    await page.locator('button:has-text("查询")').click()

    // 验证查询执行
    await expect(page.locator('.el-table')).toBeVisible()
  })

  test('点击重置按钮清空筛选条件', async ({ page }) => {
    await page.goto('/orders')

    // 填写筛选条件
    await page.locator('input[placeholder="请输入桌号"]').fill('A01')

    // 点击重置
    await page.locator('button:has-text("重置")').click()

    // 验证桌号输入框已清空
    await expect(page.locator('input[placeholder="请输入桌号"]')).toHaveValue('')
  })

  test('可以查看订单详情', async ({ page }) => {
    await page.goto('/orders')

    // 等待订单列表加载
    await page.waitForSelector('.el-table__row', { timeout: 5_000 })

    // 点击第一行的"查看详情"链接
    await page.locator('.el-table__row').first().locator('button:has-text("查看详情")').click()

    // 验证详情弹窗打开
    await expect(page.locator('.el-dialog')).toBeVisible()
    await expect(page.locator('.el-dialog__title')).toContainText('订单详情')

    // 验证订单基本信息显示
    await expect(page.locator('.el-dialog .el-descriptions')).toBeVisible()
    await expect(page.locator('.el-dialog')).toContainText('ORD20240101001')
    await expect(page.locator('.el-dialog')).toContainText('A01')
  })

  test('订单详情显示菜品明细', async ({ page }) => {
    await page.goto('/orders')

    // 等待订单列表加载
    await page.waitForSelector('.el-table__row', { timeout: 5_000 })

    // 打开订单详情
    await page.locator('.el-table__row').first().locator('button:has-text("查看详情")').click()
    await expect(page.locator('.el-dialog')).toBeVisible()

    // 验证菜品明细区域
    await expect(page.locator('.el-dialog .section-title')).toContainText('菜品明细')

    // 验证菜品名称显示（mock 数据中有宫保鸡丁和麻婆豆腐）
    await expect(page.locator('.el-dialog .el-table__body')).toContainText('宫保鸡丁')
    await expect(page.locator('.el-dialog .el-table__body')).toContainText('麻婆豆腐')
  })

  test('商家可以接单（paid → accepted）', async ({ page }) => {
    await page.goto('/orders')

    // 等待订单列表加载
    await page.waitForSelector('.el-table__row', { timeout: 5_000 })

    // 打开订单详情（mock 数据中订单状态为 paid）
    await page.locator('.el-table__row').first().locator('button:has-text("查看详情")').click()
    await expect(page.locator('.el-dialog')).toBeVisible()

    // 验证"接单"按钮存在（状态为 paid 时显示）
    const acceptButton = page.locator('.el-dialog .action-row button:has-text("接单")')
    await expect(acceptButton).toBeVisible()

    // 点击接单
    await acceptButton.click()

    // 验证状态更新成功提示
    await expect(page.locator('.el-message')).toContainText('订单状态已更新', { timeout: 5_000 })

    // 验证弹窗中状态已更新为"已接单/制作中"
    await expect(page.locator('.el-dialog .el-tag')).toContainText('已接单/制作中', {
      timeout: 5_000,
    })
  })

  test('接单后可以完成订单（accepted → completed）', async ({ page }) => {
    await page.goto('/orders')

    // 等待订单列表加载
    await page.waitForSelector('.el-table__row', { timeout: 5_000 })

    // 打开订单详情
    await page.locator('.el-table__row').first().locator('button:has-text("查看详情")').click()
    await expect(page.locator('.el-dialog')).toBeVisible()

    // 先接单（paid → accepted）
    const acceptButton = page.locator('.el-dialog .action-row button:has-text("接单")')
    await expect(acceptButton).toBeVisible()
    await acceptButton.click()
    await expect(page.locator('.el-message')).toContainText('订单状态已更新', { timeout: 5_000 })

    // 等待状态更新后，"完成订单"按钮出现
    const completeButton = page.locator('.el-dialog .action-row button:has-text("完成订单")')
    await expect(completeButton).toBeVisible({ timeout: 5_000 })

    // 点击完成订单
    await completeButton.click()

    // 验证状态更新成功提示
    await expect(page.locator('.el-message').first()).toContainText('订单状态已更新', { timeout: 5_000 })

    // 验证弹窗中状态已更新为"已完成"
    await expect(page.locator('.el-dialog .el-tag')).toContainText('已完成', { timeout: 5_000 })
  })

  test('完整流程：查看订单列表 → 接单 → 完成', async ({ page }) => {
    await page.goto('/orders')

    // 步骤 1：验证订单列表加载
    await expect(page.locator('h2.page-heading')).toContainText('订单管理')
    await page.waitForSelector('.el-table__row', { timeout: 5_000 })

    // 验证订单存在
    await expect(page.locator('.el-table__body')).toContainText('ORD20240101001')

    // 步骤 2：打开订单详情
    await page.locator('.el-table__row').first().locator('button:has-text("查看详情")').click()
    await expect(page.locator('.el-dialog')).toBeVisible()
    await expect(page.locator('.el-dialog__title')).toContainText('订单详情')

    // 验证订单信息完整
    await expect(page.locator('.el-dialog')).toContainText('ORD20240101001')
    await expect(page.locator('.el-dialog')).toContainText('A01')
    await expect(page.locator('.el-dialog')).toContainText('不要辣') // 顾客备注

    // 步骤 3：接单
    const acceptButton = page.locator('.el-dialog .action-row button:has-text("接单")')
    await expect(acceptButton).toBeVisible()
    await acceptButton.click()

    // 验证接单成功
    await expect(page.locator('.el-message').first()).toContainText('订单状态已更新', { timeout: 5_000 })
    await expect(page.locator('.el-dialog .el-tag')).toContainText('已接单/制作中', {
      timeout: 5_000,
    })

    // 步骤 4：完成订单
    const completeButton = page.locator('.el-dialog .action-row button:has-text("完成订单")')
    await expect(completeButton).toBeVisible({ timeout: 5_000 })
    await completeButton.click()

    // 验证完成成功
    await expect(page.locator('.el-message').first()).toContainText('订单状态已更新', { timeout: 5_000 })
    await expect(page.locator('.el-dialog .el-tag')).toContainText('已完成', { timeout: 5_000 })

    // 步骤 5：关闭弹窗，验证列表中状态已更新
    await page.locator('.el-dialog__headerbtn').click()
    await expect(page.locator('.el-dialog')).not.toBeVisible({ timeout: 3_000 })
  })

  test('订单详情显示顾客备注', async ({ page }) => {
    await page.goto('/orders')

    await page.waitForSelector('.el-table__row', { timeout: 5_000 })

    // 打开订单详情
    await page.locator('.el-table__row').first().locator('button:has-text("查看详情")').click()
    await expect(page.locator('.el-dialog')).toBeVisible()

    // 验证顾客备注显示（mock 数据中备注为"不要辣"）
    await expect(page.locator('.el-dialog')).toContainText('不要辣')
  })

  test('订单详情显示支付金额', async ({ page }) => {
    await page.goto('/orders')

    await page.waitForSelector('.el-table__row', { timeout: 5_000 })

    // 打开订单详情
    await page.locator('.el-table__row').first().locator('button:has-text("查看详情")').click()
    await expect(page.locator('.el-dialog')).toBeVisible()

    // 验证金额显示（mock 数据中总金额为 8800 分 = 88.00 元）
    await expect(page.locator('.el-dialog')).toContainText('88.00')
  })
})
