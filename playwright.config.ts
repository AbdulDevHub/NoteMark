import { defineConfig } from '@playwright/test'

// End-to-end tests launch the built Electron app (`npm run build` first; `npm run test:e2e` does both).
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  workers: 1,
  reporter: [['list']],
  use: { trace: 'retain-on-failure' }
})
