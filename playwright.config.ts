import { defineConfig } from '@playwright/test'

const localFallbackEnv =
  'VITE_FIREBASE_API_KEY= VITE_FIREBASE_AUTH_DOMAIN= VITE_FIREBASE_PROJECT_ID= VITE_FIREBASE_STORAGE_BUCKET= VITE_FIREBASE_MESSAGING_SENDER_ID= VITE_FIREBASE_APP_ID= VITE_FIREBASE_MEASUREMENT_ID= VITE_KAKAO_JAVASCRIPT_KEY='

export default defineConfig({
  testDir: './tests/e2e',
  testIgnore: '**/firebase-*.spec.ts',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  reporter: 'list',
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: 'http://127.0.0.1:4173',
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    viewport: {
      width: 390,
      height: 844,
    },
  },
  webServer: {
    command: `${localFallbackEnv} npm run dev -- --host 127.0.0.1 --port 4173`,
    port: 4173,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
