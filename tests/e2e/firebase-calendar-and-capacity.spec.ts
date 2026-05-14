import { expect, test, type Browser, type BrowserContext, type Page } from '@playwright/test'
import {
  ARIA_LABELS,
  getCalendarDayAriaLabel,
  getWeekdayRuleAriaLabel,
} from '../../src/lib/ariaLabels'
import { WEEKDAY_LABELS } from '../../src/lib/constants'

function byAriaLabel(label: string) {
  return `[aria-label="${label}"]`
}

test.describe('Firebase emulator calendar and capacity flows', () => {
  test('shows the full-room state to newcomers while existing participants can still edit and refresh', async ({
    browser,
  }) => {
    const hostContext = await createMobileContext(browser)
    const guestContext = await createMobileContext(browser)
    const viewerContext = await createMobileContext(browser)
    const hostPage = await hostContext.newPage()
    const guestPage = await guestContext.newPage()
    const viewerPage = await viewerContext.newPage()

    try {
      const { roomUrl } = await createRoomAndJoinAsHost(hostPage, '방장', {
        maxParticipants: 2,
      })

      await guestPage.goto(roomUrl)
      await joinCurrentRoom(guestPage, '참가자')

      await expect(hostPage.getByText('2 / 2명 참여 중')).toBeVisible()
      await expect(
        guestPage.locator(byAriaLabel(ARIA_LABELS.room.leaveRoomButton)),
      ).toBeVisible()
      await expect(
        guestPage.locator(byAriaLabel(ARIA_LABELS.room.deleteRoomButton)),
      ).toHaveCount(0)

      await viewerPage.goto(roomUrl)
      await expect(viewerPage.getByText('이 방은 정원이 모두 찼어요')).toBeVisible()
      await expect(
        viewerPage.locator(byAriaLabel(ARIA_LABELS.nickname.dialog)),
      ).toHaveCount(0)

      await guestPage.locator(byAriaLabel(ARIA_LABELS.room.nicknameInput)).fill('참가자2')
      await guestPage.locator(byAriaLabel(ARIA_LABELS.room.nicknameSaveButton)).click()

      await expect(hostPage.getByText('참가자2', { exact: true })).toBeVisible()
      await expect(hostPage.getByText('참가자', { exact: true })).toHaveCount(0)

      await guestPage.reload()
      await expect(guestPage.getByText('참가자2', { exact: true })).toBeVisible()
      await expect(
        guestPage.locator(byAriaLabel(ARIA_LABELS.nickname.dialog)),
      ).toHaveCount(0)
    } finally {
      await closeContext(viewerContext)
      await closeContext(guestContext)
      await closeContext(hostContext)
    }
  })

  test('persists weekday rules and nickname changes, resets selections, and clamps month navigation', async ({
    browser,
  }) => {
    const hostContext = await createMobileContext(browser)
    const hostPage = await hostContext.newPage()

    try {
      const roomRange = createTwoMonthRoomRange()
      await createRoomAndJoinAsHost(hostPage, '달력왕', {
        range: roomRange,
      })

      const monthHeading = hostPage.locator(byAriaLabel(ARIA_LABELS.room.monthHeading))
      const currentMonthLabel = formatMonthLabel(roomRange.startDate)
      const nextMonthLabel = formatMonthLabel(roomRange.endDate)
      const mondayRuleButton = hostPage.locator(byAriaLabel(getWeekdayRuleAriaLabel('월')))
      const unavailableModeButton = hostPage.locator(
        byAriaLabel(ARIA_LABELS.room.unavailableModeButton),
      )
      const resetButton = hostPage.locator(byAriaLabel(ARIA_LABELS.room.resetSelectionButton))
      const dashboardEmptyState = hostPage.getByText(
        '아직 모인 날짜 선택이 없어요. 먼저 참가자들이 닉네임을 입력하고 달력에서 가능한 날짜를 골라보세요.',
      )

      await expect(monthHeading).toHaveText(currentMonthLabel)

      await hostPage.locator(byAriaLabel(ARIA_LABELS.room.previousMonthButton)).click()
      await expect(monthHeading).toHaveText(currentMonthLabel)

      await hostPage.locator(byAriaLabel(ARIA_LABELS.room.nextMonthButton)).click()
      await expect(monthHeading).toHaveText(nextMonthLabel)

      await hostPage.locator(byAriaLabel(ARIA_LABELS.room.nextMonthButton)).click()
      await expect(monthHeading).toHaveText(nextMonthLabel)

      await hostPage.locator(byAriaLabel(ARIA_LABELS.room.previousMonthButton)).click()
      await expect(monthHeading).toHaveText(currentMonthLabel)

      await mondayRuleButton.click()
      await expect(mondayRuleButton).toHaveAttribute('aria-pressed', 'true')
      await expect(hostPage.getByText(/1명 가능/).first()).toBeVisible()
      await expect(resetButton).toBeEnabled()

      await hostPage.reload()
      await expect(mondayRuleButton).toHaveAttribute('aria-pressed', 'true')
      await expect(resetButton).toBeEnabled()

      await resetButton.click()
      await expect(mondayRuleButton).toHaveAttribute('aria-pressed', 'false')
      await expect(resetButton).toBeDisabled()
      await expect(dashboardEmptyState).toBeVisible()

      const firstSelectableDay = hostPage
        .locator('button[aria-label$="날짜 선택 버튼"]:not(:disabled)')
        .first()
      await firstSelectableDay.click()

      await expect(resetButton).toBeEnabled()
      await expect(hostPage.getByText(/1명 가능/).first()).toBeVisible()

      await firstSelectableDay.click()
      await expect(resetButton).toBeDisabled()
      await expect(dashboardEmptyState).toBeVisible()

      await unavailableModeButton.click()
      await expect(unavailableModeButton).toHaveAttribute('aria-pressed', 'true')

      await hostPage.reload()
      await expect(unavailableModeButton).toHaveAttribute('aria-pressed', 'true')

      await hostPage.locator(byAriaLabel(ARIA_LABELS.room.nicknameInput)).fill('달력왕2')
      await hostPage.locator(byAriaLabel(ARIA_LABELS.room.nicknameSaveButton)).click()

      await expect(hostPage.getByText('달력왕2', { exact: true })).toBeVisible()

      await hostPage.reload()
      await expect(hostPage.getByText('달력왕2', { exact: true })).toBeVisible()
      await expect(
        hostPage.locator(byAriaLabel(ARIA_LABELS.room.nicknameInput)),
      ).toHaveValue('달력왕2')
    } finally {
      await closeContext(hostContext)
    }
  })

  test('keeps dashboard rankings and calendar badges in sync across participants', async ({
    browser,
  }) => {
    const hostContext = await createMobileContext(browser)
    const guestContext = await createMobileContext(browser)
    const hostPage = await hostContext.newPage()
    const guestPage = await guestContext.newPage()

    try {
      const roomRange = createUpcomingWorkweekRange()
      const { roomUrl } = await createRoomAndJoinAsHost(hostPage, '호스트', {
        range: roomRange,
      })

      const mondayButton = hostPage.locator(
        byAriaLabel(getCalendarDayAriaLabel(roomRange.mondayDate)),
      )
      const tuesdayButton = hostPage.locator(
        byAriaLabel(getCalendarDayAriaLabel(roomRange.tuesdayDate)),
      )

      await mondayButton.click()
      await tuesdayButton.click()

      await guestPage.goto(roomUrl)
      await joinCurrentRoom(guestPage, '게스트')

      await guestPage
        .locator(byAriaLabel(getCalendarDayAriaLabel(roomRange.tuesdayDate)))
        .click()

      const rankingItems = hostPage.locator('.ranking-item')

      await expect(rankingItems).toHaveCount(2)
      await expect(rankingItems.nth(0)).toContainText(formatReadableDate(roomRange.tuesdayDate))
      await expect(rankingItems.nth(0)).toContainText('2명 가능')
      await expect(rankingItems.nth(1)).toContainText(formatReadableDate(roomRange.mondayDate))
      await expect(rankingItems.nth(1)).toContainText('1명 가능')

      await expect(tuesdayButton.getByText('#1')).toBeVisible()
      await expect(mondayButton.getByText('#2')).toBeVisible()
      await expect(tuesdayButton.locator('.dot')).toHaveCount(2)
      await expect(mondayButton.locator('.dot')).toHaveCount(1)
    } finally {
      await closeContext(guestContext)
      await closeContext(hostContext)
    }
  })

  test('preserves availability when switching to unavailable mode and persists unavailable overrides after refresh', async ({
    browser,
  }) => {
    const hostContext = await createMobileContext(browser)
    const hostPage = await hostContext.newPage()

    try {
      const roomRange = createUpcomingWorkweekRange()
      await createRoomAndJoinAsHost(hostPage, '호스트', {
        range: roomRange,
      })

      const mondayButton = hostPage.locator(
        byAriaLabel(getCalendarDayAriaLabel(roomRange.mondayDate)),
      )
      const unavailableModeButton = hostPage.locator(
        byAriaLabel(ARIA_LABELS.room.unavailableModeButton),
      )
      const rankingItems = hostPage.locator('.ranking-item')
      const dashboardEmptyState = hostPage.getByText(
        '아직 모인 날짜 선택이 없어요. 먼저 참가자들이 닉네임을 입력하고 달력에서 가능한 날짜를 골라보세요.',
      )

      await mondayButton.click()
      await expect(rankingItems).toHaveCount(1)
      await expect(rankingItems.nth(0)).toContainText(formatReadableDate(roomRange.mondayDate))
      await expect(rankingItems.nth(0)).toContainText('1명 가능')

      await unavailableModeButton.click()
      await expect(unavailableModeButton).toHaveAttribute('aria-pressed', 'true')
      await expect(rankingItems).toHaveCount(1)
      await expect(rankingItems.nth(0)).toContainText(formatReadableDate(roomRange.mondayDate))

      await mondayButton.click()
      await expect(rankingItems).toHaveCount(0)
      await expect(dashboardEmptyState).toBeVisible()

      await hostPage.reload()
      await expect(unavailableModeButton).toHaveAttribute('aria-pressed', 'true')
      await expect(rankingItems).toHaveCount(0)
      await expect(dashboardEmptyState).toBeVisible()

      await mondayButton.click()
      await expect(rankingItems).toHaveCount(1)
      await expect(rankingItems.nth(0)).toContainText(formatReadableDate(roomRange.mondayDate))
      await expect(rankingItems.nth(0)).toContainText('1명 가능')
    } finally {
      await closeContext(hostContext)
    }
  })
})

async function createMobileContext(browser: Browser) {
  return browser.newContext({
    viewport: {
      width: 390,
      height: 844,
    },
  })
}

async function createRoomAndJoinAsHost(
  page: Page,
  nickname: string,
  options: {
    maxParticipants?: number
    range?: {
      startDate: string
      endDate: string
    }
  } = {},
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

  await expect(page).toHaveURL(/\/room\/[^/]+$/)

  const roomUrl = page.url()
  const inviteCode =
    (await page.locator(byAriaLabel(ARIA_LABELS.room.inviteCodeHeading)).textContent())?.trim() ||
    ''

  await joinCurrentRoom(page, nickname)
  await expect(page.locator(byAriaLabel(ARIA_LABELS.room.calendarCard))).toBeVisible()

  return { inviteCode, roomUrl }
}

async function joinCurrentRoom(page: Page, nickname: string) {
  const joinButton = page.locator(byAriaLabel(ARIA_LABELS.nickname.submitButton))

  await expect(page.locator(byAriaLabel(ARIA_LABELS.nickname.dialog))).toBeVisible()
  await page.locator(byAriaLabel(ARIA_LABELS.nickname.input)).fill(nickname)
  await joinButton.click()

  await expect(page.locator(byAriaLabel(ARIA_LABELS.nickname.dialog))).toBeHidden()
  await expect(page.getByText(nickname, { exact: true })).toBeVisible()
}

function createTwoMonthRoomRange() {
  const now = new Date()
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1)
  const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 10)

  return {
    startDate: formatDate(startDate),
    endDate: formatDate(endDate),
  }
}

function createUpcomingWorkweekRange() {
  const mondayDate = getNextWeekdayDate(1)
  const tuesdayDate = addDays(mondayDate, 1)
  const endDate = addDays(mondayDate, 2)

  return {
    startDate: formatDate(mondayDate),
    endDate: formatDate(endDate),
    mondayDate: formatDate(mondayDate),
    tuesdayDate: formatDate(tuesdayDate),
  }
}

function formatMonthLabel(dateString: string) {
  const [year, month] = dateString.split('-').map(Number)
  return `${year}년 ${month}월`
}

function formatReadableDate(dateString: string) {
  const [year, month, day] = dateString.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return `${month}월 ${day}일 ${WEEKDAY_LABELS[date.getDay()]}요일`
}

function formatDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function addDays(date: Date, amount: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + amount)
  return next
}

function getNextWeekdayDate(targetWeekday: number) {
  const today = new Date()
  const candidate = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  let daysUntilTarget = (targetWeekday - candidate.getDay() + 7) % 7

  if (daysUntilTarget === 0) {
    daysUntilTarget = 7
  }

  candidate.setDate(candidate.getDate() + daysUntilTarget)
  return candidate
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
