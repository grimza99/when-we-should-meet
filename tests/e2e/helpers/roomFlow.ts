import { expect, type Browser, type BrowserContext, type Page } from '@playwright/test'
import { ARIA_LABELS } from '../../../src/lib/ariaLabels'

export const ROOM_URL_PATTERN = /\/room\/[^/]+$/

type RoomCreationOptions = {
  maxParticipants?: number
  range?: {
    startDate: string
    endDate: string
  }
}

export function byAriaLabel(label: string) {
  return `[aria-label="${label}"]`
}

export async function createMobileContext(browser: Browser) {
  return browser.newContext({
    viewport: {
      width: 390,
      height: 844,
    },
  })
}

export async function expectRoomUrl(page: Page) {
  await expect(page).toHaveURL(ROOM_URL_PATTERN)
}

export async function createRoomWithoutJoin(
  page: Page,
  options: RoomCreationOptions = {},
) {
  await page.goto('/')
  await page.locator(byAriaLabel(ARIA_LABELS.landing.createRoomButton)).click()

  if (options.maxParticipants) {
    await page
      .locator(byAriaLabel(ARIA_LABELS.createRoom.participantCountInput))
      .fill(String(options.maxParticipants))
  }

  if (options.range) {
    await page.locator(byAriaLabel(ARIA_LABELS.createRoom.customRangeButton)).click()
    await page
      .locator(byAriaLabel(ARIA_LABELS.createRoom.startDateInput))
      .fill(options.range.startDate)
    await page
      .locator(byAriaLabel(ARIA_LABELS.createRoom.endDateInput))
      .fill(options.range.endDate)
  }

  await page.locator(byAriaLabel(ARIA_LABELS.createRoom.submitButton)).click()
  await expectRoomUrl(page)

  const roomUrl = page.url()
  const roomId = new URL(roomUrl).pathname.split('/').at(-1) ?? ''
  const inviteCode =
    (await page.locator(byAriaLabel(ARIA_LABELS.room.inviteCodeHeading)).textContent())?.trim() ||
    ''

  await expect(page.locator(byAriaLabel(ARIA_LABELS.nickname.dialog))).toBeVisible()

  return { inviteCode, roomId, roomUrl }
}

export async function joinCurrentRoom(page: Page, nickname: string) {
  const joinButton = page.locator(byAriaLabel(ARIA_LABELS.nickname.submitButton))

  await expect(page.locator(byAriaLabel(ARIA_LABELS.nickname.dialog))).toBeVisible()
  await page.locator(byAriaLabel(ARIA_LABELS.nickname.input)).fill(nickname)
  await joinButton.click()

  await expect(page.locator(byAriaLabel(ARIA_LABELS.nickname.dialog))).toBeHidden()
  await expect(page.getByText(nickname, { exact: true })).toBeVisible()
}

export async function createRoomAndJoin(
  page: Page,
  nickname: string,
  options: RoomCreationOptions = {},
) {
  const room = await createRoomWithoutJoin(page, options)

  await joinCurrentRoom(page, nickname)
  await expect(page.locator(byAriaLabel(ARIA_LABELS.room.calendarCard))).toBeVisible()

  return room
}

export async function closeContext(context: BrowserContext | null) {
  if (!context) {
    return
  }

  try {
    await context.close()
  } catch {
    // 브라우저 종료 이후 정리 단계에서 던지는 close 에러는 무시한다.
  }
}
