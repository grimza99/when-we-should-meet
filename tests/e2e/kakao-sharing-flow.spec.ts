import { expect, test, type Browser, type Page } from '@playwright/test'
import { ARIA_LABELS } from '../../src/lib/ariaLabels'

function byAriaLabel(label: string) {
  return `[aria-label="${label}"]`
}

type KakaoShareCall = {
  buttons?: Array<{
    link: {
      mobileWebUrl: string
      webUrl: string
    }
    title: string
  }>
  link: {
    mobileWebUrl: string
    webUrl: string
  }
  objectType: string
  text: string
}

type KakaoInitState = {
  calls: number
  key: string
}

test.describe('카카오 공유 플로우', () => {
  test('calls the Kakao SDK when room and ranking sharing are requested', async ({ browser }) => {
    const context = await createKakaoContext(browser)
    const page = await context.newPage()

    try {
      await createRoomAndJoin(page, '카카오공유')

      const roomUrl = page.url()

      await page.locator(byAriaLabel(ARIA_LABELS.room.shareRoomButton)).click()
      await expect(page.locator(byAriaLabel(ARIA_LABELS.toast))).toHaveText(
        '카카오톡 공유 창을 열었어요.',
      )

      const roomShareCalls = await getKakaoShareCalls(page)
      expect(roomShareCalls).toHaveLength(1)
      expect(roomShareCalls[0]).toMatchObject({
        buttons: [
          {
            link: {
              mobileWebUrl: roomUrl,
              webUrl: roomUrl,
            },
            title: '약속 일정 잡기',
          },
        ],
        link: {
          mobileWebUrl: roomUrl,
          webUrl: roomUrl,
        },
        objectType: 'text',
        text: '친구가 일정방에 초대했어요!\n아래 링크를 통해 로그인 없이도\n쉽게 약속을 잡아봐요!',
      })
      await expect(page.locator('#kakao-js-sdk')).toHaveCount(0)
      expect(await getKakaoInitState(page)).toEqual({
        calls: 1,
        key: 'test-kakao-key',
      })

      await page.locator('button[aria-label$="날짜 선택 버튼"]:not(:disabled)').first().click()
      await page.locator(byAriaLabel(ARIA_LABELS.room.shareRankingButton)).click()
      await expect(page.locator(byAriaLabel(ARIA_LABELS.toast))).toHaveText(
        '카카오톡 공유 창을 열었어요.',
      )

      const allShareCalls = await getKakaoShareCalls(page)
      expect(allShareCalls).toHaveLength(2)
      expect(allShareCalls[1]).toMatchObject({
        buttons: [
          {
            link: {
              mobileWebUrl: roomUrl,
              webUrl: roomUrl,
            },
            title: '랭킹 일정 확인하기',
          },
        ],
        link: {
          mobileWebUrl: roomUrl,
          webUrl: roomUrl,
        },
        objectType: 'text',
      })
      expect(allShareCalls[1]?.text).toContain('우리 언제 볼까? 일정 랭킹이에요.')
      expect(allShareCalls[1]?.text).toContain('1위')
      expect(await getKakaoInitState(page)).toEqual({
        calls: 1,
        key: 'test-kakao-key',
      })
    } finally {
      await closeContext(context)
    }
  })
})

async function createKakaoContext(browser: Browser) {
  const context = await browser.newContext({
    viewport: {
      width: 390,
      height: 844,
    },
  })

  await context.addInitScript(() => {
    const shareCalls: KakaoShareCall[] = []
    let initCalls = 0
    let initKey = ''
    let initialized = false

    Object.defineProperty(window, '__kakaoShareCalls', {
      configurable: true,
      value: shareCalls,
    })
    Object.defineProperty(window, '__kakaoInitState', {
      configurable: true,
      get: () => ({
        calls: initCalls,
        key: initKey,
      }),
    })

    Object.defineProperty(window, 'Kakao', {
      configurable: true,
      value: {
        Share: {
          sendDefault: (payload: KakaoShareCall) => {
            shareCalls.push(payload)
          },
        },
        init: (key: string) => {
          initCalls += 1
          initKey = key
          initialized = true
        },
        isInitialized: () => initialized,
      },
    })

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

async function getKakaoShareCalls(page: Page) {
  return page.evaluate(() => {
    return (window as Window & { __kakaoShareCalls?: KakaoShareCall[] }).__kakaoShareCalls ?? []
  })
}

async function getKakaoInitState(page: Page) {
  return page.evaluate(() => {
    return (
      (window as Window & { __kakaoInitState?: KakaoInitState }).__kakaoInitState ?? {
        calls: 0,
        key: '',
      }
    )
  })
}

async function closeContext(context: Awaited<ReturnType<Browser['newContext']>>) {
  try {
    await context.close()
  } catch {
    // Ignore trace-artifact teardown failures so the test reports the real assertion error.
  }
}
