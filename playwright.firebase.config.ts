import { defineConfig } from '@playwright/test'

const firebaseEmulatorEnv = [
  'VITE_FIREBASE_API_KEY=demo-api-key',
  'VITE_FIREBASE_AUTH_DOMAIN=demo-when-should-we-meet.firebaseapp.com',
  'VITE_FIREBASE_PROJECT_ID=demo-when-should-we-meet',
  'VITE_FIREBASE_STORAGE_BUCKET=demo-when-should-we-meet.appspot.com',
  'VITE_FIREBASE_MESSAGING_SENDER_ID=000000000000',
  'VITE_FIREBASE_APP_ID=1:000000000000:web:demo',
  'VITE_FIREBASE_MEASUREMENT_ID=',
  'VITE_FIREBASE_USE_EMULATOR=true',
  'VITE_FIRESTORE_EMULATOR_HOST=127.0.0.1',
  'VITE_FIRESTORE_EMULATOR_PORT=8080',
].join(' ')

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/firebase-room-flow.spec.ts',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  reporter: 'list',
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:4174',
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    viewport: {
      width: 390,
      height: 844,
    },
  },
  webServer: {
    command: `${firebaseEmulatorEnv} npm run dev -- --host 127.0.0.1 --port 4174`,
    port: 4174,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
