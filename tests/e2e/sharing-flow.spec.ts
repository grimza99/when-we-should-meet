import { expect, test, type Browser, type Page } from '@playwright/test'
import { ARIA_LABELS } from '../../src/lib/ariaLabels'

function byAriaLabel(label: string) {
  return `[aria-label="${label}"]`
}

test.describe('공유 플로우', () => {
  test('copies invite code, room link, and ranking text through clipboard fallbacks', async ({
    browser,
  }) => {
    const context = await createClipboardContext(browser)
    const page = await context.newPage()

    try {
      await createRoomAndJoin(page, '공유테스트')

      const inviteCode =
        (await page.locator(byAriaLabel(ARIA_LABELS.room.inviteCodeHeading)).textContent())?.trim() ||
        ''
      const roomUrl = page.url()

      await page.locator(byAriaLabel(ARIA_LABELS.room.copyInviteCodeButton)).click()
      await expect(page.locator(byAriaLabel(ARIA_LABELS.toast))).toHaveText('초대 코드가 복사되었어요.')
      await expect(readClipboardText(page)).resolves.toBe(inviteCode)

      await page.locator(byAriaLabel(ARIA_LABELS.room.shareRoomButton)).click()
      await expect(page.locator(byAriaLabel(ARIA_LABELS.toast))).toHaveText('공유 링크를 복사했어요.')
      await expect(readClipboardText(page)).resolves.toBe(roomUrl)

      await page.locator('button[aria-label$="날짜 선택 버튼"]:not(:disabled)').first().click()
      await page.locator(byAriaLabel(ARIA_LABELS.room.shareRankingButton)).click()

      const rankingShareText = await readClipboardText(page)
      await expect(page.locator(byAriaLabel(ARIA_LABELS.toast))).toHaveText(
        '랭킹 공유 문구를 복사했어요.',
      )
      expect(rankingShareText).toContain('우리 언제 볼까? 일정 랭킹이에요.')
      expect(rankingShareText).toContain('1위')
      expect(rankingShareText).toContain(roomUrl)
    } finally {
      await context.close()
    }
  })

  test('uses navigator.share when the browser share API is available', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: {
        width: 390,
        height: 844,
      },
    })

    await context.addInitScript(() => {
      const shareCalls: unknown[] = []

      Object.defineProperty(window, '__shareCalls', {
        configurable: true,
        value: shareCalls,
      })

      Object.defineProperty(navigator, 'share', {
        configurable: true,
        value: async (payload: unknown) => {
          shareCalls.push(payload)
        },
      })
    })

    const page = await context.newPage()

    try {
      await createRoomAndJoin(page, '웹공유')

      const roomUrl = page.url()
      const inviteCode =
        (await page.locator(byAriaLabel(ARIA_LABELS.room.inviteCodeHeading)).textContent())?.trim() ||
        ''

      await page.locator(byAriaLabel(ARIA_LABELS.room.shareRoomButton)).click()
      await expect(page.locator(byAriaLabel(ARIA_LABELS.toast))).toHaveText('공유 시트를 열었어요.')
      await expect(getShareCalls(page)).resolves.toEqual([
        {
          text: `초대 코드 ${inviteCode}로 방에 참여해 주세요.`,
          title: 'when should we meet?',
          url: roomUrl,
        },
      ])

      await page.locator('button[aria-label$="날짜 선택 버튼"]:not(:disabled)').first().click()
      await page.locator(byAriaLabel(ARIA_LABELS.room.shareRankingButton)).click()

      const shareCalls = await getShareCalls(page)
      await expect(page.locator(byAriaLabel(ARIA_LABELS.toast))).toHaveText('공유 시트를 열었어요.')
      expect(shareCalls).toHaveLength(2)
      expect(shareCalls[1]).toMatchObject({
        title: 'when should we meet?',
        url: roomUrl,
      })
      expect(String((shareCalls[1] as { text: string }).text)).toContain(
        '우리 언제 볼까? 일정 랭킹이에요.',
      )
      expect(String((shareCalls[1] as { text: string }).text)).toContain('1위')
    } finally {
      await context.close()
    }
  })
})

async function createClipboardContext(browser: Browser) {
  const context = await browser.newContext({
    viewport: {
      width: 390,
      height: 844,
    },
  })

  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: undefined,
    })
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

async function readClipboardText(page: Page) {
  return page.evaluate(async () => navigator.clipboard.readText())
}

async function getShareCalls(page: Page) {
  return page.evaluate(() => {
    return (window as Window & { __shareCalls?: unknown[] }).__shareCalls ?? []
  })
}
