import { expect, test, type Browser, type BrowserContext, type Page } from '@playwright/test'
import { ARIA_LABELS } from '../../src/lib/ariaLabels'

function byAriaLabel(label: string) {
  return `[aria-label="${label}"]`
}

test.describe('Firebase emulator listener resilience', () => {
  test('keeps the locally saved selection when the next realtime snapshot fails', async ({
    browser,
  }) => {
    const context = await createMobileContext(browser)
    const page = await context.newPage()

    try {
      await createRoomAndJoin(page, '복원테스트')

      const resetButton = page.locator(byAriaLabel(ARIA_LABELS.room.resetSelectionButton))
      const rankingItems = page.locator('.ranking-item')
      const firstSelectableDay = page
        .locator('button[aria-label$="날짜 선택 버튼"]:not(:disabled)')
        .first()

      await firstSelectableDay.click()
      await page.evaluate(() => {
        ;(
          window as Window & {
            __WSWM_FIREBASE_TEST_HOOKS__?: {
              emitSnapshotError?: (() => void) | null
            }
          }
        ).__WSWM_FIREBASE_TEST_HOOKS__?.emitSnapshotError?.()
      })

      await expect(page.locator(byAriaLabel(ARIA_LABELS.toast))).toHaveText(
        '실시간 연결에 문제가 있어요. 새로고침하면 최신 상태를 볼 수 있어요.',
      )
      await expect(resetButton).toBeEnabled()
      await expect(rankingItems).toHaveCount(1)
      await expect(rankingItems.nth(0)).toContainText('1명 가능')

      await page.reload()

      await expect(resetButton).toBeEnabled()
      await expect(rankingItems).toHaveCount(1)
      await expect(rankingItems.nth(0)).toContainText('1명 가능')
    } finally {
      await closeContext(context)
    }
  })
})

async function createMobileContext(browser: Browser) {
  const context = await browser.newContext({
    viewport: {
      width: 390,
      height: 844,
    },
  })

  await context.addInitScript(() => {
    ;(
      window as Window & {
        __WSWM_FIREBASE_TEST_HOOKS__?: Record<string, unknown>
      }
    ).__WSWM_FIREBASE_TEST_HOOKS__ = {}
  })

  return context
}

async function createRoomAndJoin(page: Page, nickname: string) {
  await page.goto('/')
  await page.locator(byAriaLabel(ARIA_LABELS.landing.createRoomButton)).click()
  await page.locator(byAriaLabel(ARIA_LABELS.createRoom.submitButton)).click()

  await expect(page).toHaveURL(/\/room\/[^/]+$/)
  await expect(page.locator(byAriaLabel(ARIA_LABELS.nickname.dialog))).toBeVisible()

  await page.locator(byAriaLabel(ARIA_LABELS.nickname.input)).fill(nickname)
  await page.locator(byAriaLabel(ARIA_LABELS.nickname.submitButton)).click()

  await expect(page.locator(byAriaLabel(ARIA_LABELS.nickname.dialog))).toBeHidden()
  await expect(page.getByText(nickname, { exact: true })).toBeVisible()
}

async function closeContext(context: BrowserContext | null) {
  if (!context) {
    return
  }

  try {
    await context.close()
  } catch {
    // 브라우저 종료 이후 정리 단계에서 던지는 close 에러는 무시한다.
  }
}
