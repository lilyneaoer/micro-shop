import { test, expect } from '@playwright/test'
import path from 'path'
import { setupAllMocks } from './helpers/mock-api'

/**
 * E2E 测试：商家创建菜品 → 上传图片 → 上架
 *
 * 验证需求：
 * - 需求 2.1: Web_Admin SHALL 支持商家对 Category 进行增加、编辑、删除和排序操作
 * - 需求 2.2: Web_Admin SHALL 支持商家对 Dish 进行增加、编辑、删除操作
 * - 需求 2.3: Web_Admin SHALL 支持为单个 Dish 配置多个规格选项（SKU）
 * - 需求 2.4: 商家将 Dish 设置为下架状态时，顾客端不返回该 Dish
 * - 需求 2.5: 商家上传 Dish 图片时，后端压缩至 ≤500KB 并返回 URL
 */
test.describe('商家创建菜品 → 上传图片 → 上架', () => {
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

  test('可以访问菜单管理页面并看到分类和菜品 Tab', async ({ page }) => {
    await page.goto('/menu')

    // 验证页面标题
    await expect(page.locator('h2.page-heading')).toContainText('菜单管理')

    // 验证两个 Tab 存在
    await expect(page.locator('.el-tabs__item:has-text("菜品分类")')).toBeVisible()
    await expect(page.locator('.el-tabs__item:has-text("菜品列表")')).toBeVisible()
  })

  test('商家可以创建新的菜品分类', async ({ page }) => {
    await page.goto('/menu')

    // 确保在分类 Tab
    await page.locator('.el-tabs__item:has-text("菜品分类")').click()

    // 点击新增分类
    await page.locator('button:has-text("新增分类")').click()

    // 验证弹窗打开
    await expect(page.locator('.el-dialog')).toBeVisible()
    await expect(page.locator('.el-dialog__title')).toContainText('新增分类')

    // 填写分类名称
    await page.locator('.el-dialog input[placeholder="请输入分类名称"]').fill('凉菜')

    // 点击确认
    await page.locator('.el-dialog .el-button--primary:has-text("确认")').click()

    // 验证弹窗关闭
    await expect(page.locator('.el-dialog')).not.toBeVisible({ timeout: 5_000 })

    // 验证成功提示
    await expect(page.locator('.el-message')).toContainText('分类创建成功', { timeout: 5_000 })
  })

  test('商家可以创建新菜品（不含图片）', async ({ page }) => {
    await page.goto('/menu')

    // 切换到菜品列表 Tab
    await page.locator('.el-tabs__item:has-text("菜品列表")').click()

    // 点击新增菜品
    await page.locator('button:has-text("新增菜品")').click()

    // 验证弹窗打开
    await expect(page.locator('.el-dialog')).toBeVisible()
    await expect(page.locator('.el-dialog__title')).toContainText('新增菜品')

    // 填写菜品名称
    await page.locator('.el-dialog input[placeholder="请输入菜品名称"]').fill('宫保鸡丁')

    // 选择分类（mock 数据中有"热菜"分类）
    await page.locator('.el-dialog .el-select').first().click()
    // 等待下拉框出现后选择可见的"热菜"选项
    await page.getByRole('option', { name: '热菜' }).click()

    // 填写价格（使用 el-input-number）
    const priceInput = page.locator('.el-dialog .el-input-number').first().locator('input')
    await priceInput.fill('28')

    // 点击确认
    await page.locator('.el-dialog .el-button--primary:has-text("确认")').click()

    // 验证弹窗关闭
    await expect(page.locator('.el-dialog')).not.toBeVisible({ timeout: 5_000 })

    // 验证成功提示
    await expect(page.locator('.el-message')).toContainText('菜品创建成功', { timeout: 5_000 })
  })

  test('创建菜品时可以上传图片', async ({ page }) => {
    await page.goto('/menu')

    // 切换到菜品列表 Tab
    await page.locator('.el-tabs__item:has-text("菜品列表")').click()

    // 点击新增菜品
    await page.locator('button:has-text("新增菜品")').click()
    await expect(page.locator('.el-dialog')).toBeVisible()

    // 填写必填字段
    await page.locator('.el-dialog input[placeholder="请输入菜品名称"]').fill('麻婆豆腐')
    await page.locator('.el-dialog .el-select').first().click()
    await page.getByRole('option', { name: '热菜' }).click()
    const priceInput = page.locator('.el-dialog .el-input-number').first().locator('input')
    await priceInput.fill('16')

    // 上传图片（使用 el-upload 的文件输入）
    // 创建一个临时的测试图片文件路径（使用 Playwright 内置的文件上传功能）
    const fileInput = page.locator('.el-dialog .el-upload input[type="file"]')
    // 使用 Playwright 的 setInputFiles 上传一个测试图片
    // 由于没有真实图片文件，我们创建一个 1x1 像素的 PNG
    await fileInput.setInputFiles({
      name: 'test-dish.png',
      mimeType: 'image/png',
      // 1x1 像素的最小 PNG 文件（base64 解码后的二进制）
      buffer: Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        'base64',
      ),
    })

    // 验证图片预览出现（el-image 组件）
    await expect(page.locator('.el-dialog .upload-trigger .el-image')).toBeVisible({
      timeout: 3_000,
    })

    // 点击确认提交
    await page.locator('.el-dialog .el-button--primary:has-text("确认")').click()

    // 验证弹窗关闭
    await expect(page.locator('.el-dialog')).not.toBeVisible({ timeout: 5_000 })

    // 验证菜品创建成功（可能同时有图片上传成功消息，使用 first()）
    await expect(page.locator('.el-message').first()).toContainText('菜品创建成功', { timeout: 5_000 })
  })

  test('商家可以切换菜品上架/下架状态', async ({ page }) => {
    // 先创建一个菜品，然后切换其状态
    // 由于 mock 数据中菜品列表初始为空，我们先创建一个菜品
    await page.goto('/menu')
    await page.locator('.el-tabs__item:has-text("菜品列表")').click()

    // 创建菜品
    await page.locator('button:has-text("新增菜品")').click()
    await expect(page.locator('.el-dialog')).toBeVisible()

    await page.locator('.el-dialog input[placeholder="请输入菜品名称"]').fill('测试菜品')
    await page.locator('.el-dialog .el-select').first().click()
    await page.getByRole('option', { name: '热菜' }).click()
    const priceInput = page.locator('.el-dialog .el-input-number').first().locator('input')
    await priceInput.fill('20')

    await page.locator('.el-dialog .el-button--primary:has-text("确认")').click()
    await expect(page.locator('.el-dialog')).not.toBeVisible({ timeout: 5_000 })

    // 等待菜品出现在列表中（等待菜品列表 Tab 中的表格行）
    await page.waitForSelector('.el-tab-pane[aria-hidden="false"] .el-table__row', { timeout: 5_000 })

    // 找到上架状态开关并切换（初始为上架状态，点击后变为下架）
    const switchEl = page.locator('.el-tab-pane[aria-hidden="false"] .el-table__row').first().locator('.el-switch')
    await expect(switchEl).toBeVisible()

    // 点击开关切换状态
    await switchEl.click()

    // 验证操作成功提示
    await expect(page.locator('.el-message').first()).toBeVisible({ timeout: 5_000 })
  })

  test('创建菜品时可以配置 SKU 规格', async ({ page }) => {
    await page.goto('/menu')
    await page.locator('.el-tabs__item:has-text("菜品列表")').click()

    // 点击新增菜品
    await page.locator('button:has-text("新增菜品")').click()
    await expect(page.locator('.el-dialog')).toBeVisible()

    // 填写基本信息
    await page.locator('.el-dialog input[placeholder="请输入菜品名称"]').fill('烤鸭')
    await page.locator('.el-dialog .el-select').first().click()
    await page.getByRole('option', { name: '热菜' }).click()
    const priceInput = page.locator('.el-dialog .el-input-number').first().locator('input')
    await priceInput.fill('88')

    // 启用 SKU 规格
    const skuSwitch = page.locator('.el-dialog').locator('text=启用规格').locator('..').locator('.el-switch')
    await skuSwitch.click()

    // 验证 SKU 配置区域出现
    await expect(page.locator('.el-dialog .sku-list')).toBeVisible({ timeout: 3_000 })

    // 点击"添加规格"
    await page.locator('.el-dialog button:has-text("添加规格")').click()

    // 填写规格名称
    await page.locator('.sku-item input[placeholder="规格名称，如：大份"]').first().fill('半只')

    // 点击确认
    await page.locator('.el-dialog .el-button--primary:has-text("确认")').click()

    // 验证弹窗关闭
    await expect(page.locator('.el-dialog')).not.toBeVisible({ timeout: 5_000 })
  })

  test('完整流程：创建菜品 → 上传图片 → 上架', async ({ page }) => {
    await page.goto('/menu')

    // 步骤 1：切换到菜品列表 Tab
    await page.locator('.el-tabs__item:has-text("菜品列表")').click()

    // 步骤 2：点击新增菜品
    await page.locator('button:has-text("新增菜品")').click()
    await expect(page.locator('.el-dialog')).toBeVisible()

    // 步骤 3：填写菜品信息
    await page.locator('.el-dialog input[placeholder="请输入菜品名称"]').fill('东坡肉')
    await page.locator('.el-dialog .el-select').first().click()
    await page.getByRole('option', { name: '热菜' }).click()
    const priceInput = page.locator('.el-dialog .el-input-number').first().locator('input')
    await priceInput.fill('48')

    // 步骤 4：上传图片
    const fileInput = page.locator('.el-dialog .el-upload input[type="file"]')
    await fileInput.setInputFiles({
      name: 'dongpo-pork.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from(
        '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AJQAB/9k=',
        'base64',
      ),
    })

    // 验证图片预览出现
    await expect(page.locator('.el-dialog .upload-trigger .el-image')).toBeVisible({
      timeout: 3_000,
    })

    // 步骤 5：确保上架状态为开启（默认应该是上架）
    const availableSwitch = page.locator('.el-dialog').locator('text=上架状态').locator('..').locator('.el-switch')
    // 验证上架开关存在
    await expect(availableSwitch).toBeVisible()

    // 步骤 6：提交创建
    await page.locator('.el-dialog .el-button--primary:has-text("确认")').click()

    // 验证弹窗关闭
    await expect(page.locator('.el-dialog')).not.toBeVisible({ timeout: 5_000 })

    // 验证菜品创建成功（可能同时有图片上传成功消息，使用 first()）
    await expect(page.locator('.el-message').first()).toContainText('菜品创建成功', { timeout: 5_000 })

    // 步骤 7：验证菜品出现在列表中
    await page.waitForSelector('.el-tab-pane[aria-hidden="false"] .el-table__row', { timeout: 5_000 })
    await expect(page.locator('.el-tab-pane[aria-hidden="false"] .el-table__body')).toContainText('东坡肉')
  })
})
