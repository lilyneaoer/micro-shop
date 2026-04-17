import { type Page } from '@playwright/test'

/**
 * 测试用商家账号（需要后端测试数据库中存在该账号）
 */
export const TEST_CREDENTIALS = {
  username: 'admin',
  password: 'admin123',
}

/**
 * 执行商家登录操作
 * 通过 UI 表单填写用户名和密码并提交
 */
export async function loginAsAdmin(page: Page): Promise<void> {
  await page.goto('/login')

  // 等待登录表单加载
  await page.waitForSelector('.login-card', { state: 'visible' })

  // 填写用户名
  await page.locator('input[placeholder="请输入用户名"]').fill(TEST_CREDENTIALS.username)

  // 填写密码
  await page.locator('input[placeholder="请输入密码"]').fill(TEST_CREDENTIALS.password)

  // 点击登录按钮
  await page.locator('button:has-text("登录")').click()

  // 等待跳转到看板页面（登录成功的标志）
  await page.waitForURL('**/dashboard', { timeout: 10_000 })
}

/**
 * 通过直接设置 localStorage token 的方式跳过登录 UI
 * 用于需要快速进入特定页面的测试场景
 */
export async function setAuthToken(page: Page, token: string): Promise<void> {
  await page.goto('/login')
  await page.evaluate((t) => {
    localStorage.setItem('token', t)
  }, token)
}
