import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright E2E 测试配置
 * 测试 Web 管理端（Vue3 + Element Plus）
 *
 * 运行前需要启动开发服务器：npm run dev
 * 或使用 webServer 配置自动启动
 */
export default defineConfig({
  testDir: './e2e',
  /* 每个测试的最大超时时间 */
  timeout: 30_000,
  /* 期望断言的超时时间 */
  expect: {
    timeout: 10_000,
  },
  /* 失败时重试次数（CI 环境下重试 2 次） */
  retries: process.env.CI ? 2 : 0,
  /* 并发 worker 数量 */
  workers: process.env.CI ? 1 : undefined,
  /* 测试报告 */
  reporter: [['html', { open: 'never' }], ['list']],
  /* 全局测试配置 */
  use: {
    /* 基础 URL，对应 vite dev server */
    baseURL: 'http://localhost:3000',
    /* 失败时截图 */
    screenshot: 'only-on-failure',
    /* 失败时录制视频 */
    video: 'retain-on-failure',
    /* 失败时保存 trace */
    trace: 'retain-on-failure',
    /* 视口大小 */
    viewport: { width: 1280, height: 720 },
    /* 忽略 HTTPS 证书错误 */
    ignoreHTTPSErrors: true,
  },
  /* 测试项目（浏览器） */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  /* 自动启动开发服务器（如果未运行） */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
