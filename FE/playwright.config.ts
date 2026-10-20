import { defineConfig } from '@playwright/test'

// Chạy trên Chrome đã cài sẵn (channel), không cần `playwright install`.
// E2E_PORT: the signed-in specs need an origin the gateway CORS allows (5173); reuses a running dev server.
const port = process.env.E2E_PORT ?? '4179'

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: `http://localhost:${port}`,
    channel: 'chrome',
    locale: 'vi-VN',
    timezoneId: 'Asia/Ho_Chi_Minh',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `npm run dev -- --port ${port} --strictPort`,
    url: `http://localhost:${port}`,
    reuseExistingServer: !process.env.CI,
  },
})
