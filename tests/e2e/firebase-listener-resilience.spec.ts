import { expect, test, type Browser } from '@playwright/test'
import { ARIA_LABELS } from '../../src/lib/ariaLabels'
import {
  byAriaLabel,
  closeContext,
  createMobileContext,
  createRoomAndJoin,
} from './helpers/roomFlow'

test.describe('Firebase 에뮬레이터 리스너 복원력', () => {
  test('다음 실시간 스냅샷이 실패해도 방금 저장한 선택 상태를 유지한다', async ({
    browser,
  }) => {
    const context = await createFirebaseHookContext(browser)
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

async function createFirebaseHookContext(browser: Browser) {
  const context = await createMobileContext(browser)

  await context.addInitScript(() => {
    ;(
      window as Window & {
        __WSWM_FIREBASE_TEST_HOOKS__?: Record<string, unknown>
      }
    ).__WSWM_FIREBASE_TEST_HOOKS__ = {}
  })

  return context
}
