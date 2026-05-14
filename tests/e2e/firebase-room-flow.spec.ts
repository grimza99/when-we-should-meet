import { expect, test, type Browser, type Page } from '@playwright/test'
import { ARIA_LABELS, getParticipantRemoveAriaLabel } from '../../src/lib/ariaLabels'

function byAriaLabel(label: string) {
  return `[aria-label="${label}"]`
}

test.describe('Firebase emulator room flows', () => {
  test('joins by invite code, syncs across clients, restores after reload, and blocks removed participants', async ({
    browser,
  }) => {
    const hostContext = await createMobileContext(browser)
    const guestContext = await createMobileContext(browser)
    const hostPage = await hostContext.newPage()
    const guestPage = await guestContext.newPage()

    try {
      const { inviteCode } = await createRoomAndJoinAsHost(hostPage, '호스트')

      await guestPage.goto('/')
      await guestPage.locator(byAriaLabel(ARIA_LABELS.landing.inviteCodeInput)).fill(inviteCode)
      await guestPage.locator(byAriaLabel(ARIA_LABELS.landing.joinRoomButton)).click()
      await joinCurrentRoom(guestPage, '게스트')

      await expect(hostPage.getByText('게스트', { exact: true })).toBeVisible()
      await expect(hostPage.getByText('2 / 6명 참여 중')).toBeVisible()

      await guestPage
        .locator('button[aria-label$="날짜 선택 버튼"]:not(:disabled)')
        .first()
        .click()

      await expect(hostPage.getByText(/1명 가능/)).toBeVisible()

      await guestPage.reload()
      await expect(guestPage.locator(byAriaLabel(ARIA_LABELS.nickname.dialog))).toBeHidden()
      await expect(guestPage.getByText('게스트', { exact: true })).toBeVisible()
      await expect(guestPage.getByText('2 / 6명 참여 중')).toBeVisible()

      await hostPage.locator(byAriaLabel(getParticipantRemoveAriaLabel('게스트'))).click()

      await expect(hostPage.getByText('1 / 6명 참여 중')).toBeVisible()
      await expect(hostPage.getByText('게스트', { exact: true })).toHaveCount(0)
      await expect(
        guestPage.locator(byAriaLabel(ARIA_LABELS.room.restrictedPage)),
      ).toBeVisible()
    } finally {
      await guestContext.close()
      await hostContext.close()
    }
  })

  test('supports deep-link join, guest leave, and host room deletion', async ({
    browser,
  }) => {
    const hostContext = await createMobileContext(browser)
    const guestContext = await createMobileContext(browser)
    const hostPage = await hostContext.newPage()
    const guestPage = await guestContext.newPage()

    try {
      const { roomUrl } = await createRoomAndJoinAsHost(hostPage, '방장')

      await guestPage.goto(roomUrl)
      await joinCurrentRoom(guestPage, '참가자')

      await expect(hostPage.getByText('2 / 6명 참여 중')).toBeVisible()

      guestPage.once('dialog', (dialog) => dialog.accept())
      await guestPage.locator(byAriaLabel(ARIA_LABELS.room.leaveRoomButton)).click()

      await expect(guestPage).toHaveURL('http://127.0.0.1:4174/')
      await expect(hostPage.getByText('1 / 6명 참여 중')).toBeVisible()
      await expect(hostPage.getByText('참가자', { exact: true })).toHaveCount(0)

      hostPage.once('dialog', (dialog) => dialog.accept())
      await hostPage.locator(byAriaLabel(ARIA_LABELS.room.deleteRoomButton)).click()

      await expect(hostPage).toHaveURL('http://127.0.0.1:4174/')

      await guestPage.goto(roomUrl)
      await expect(guestPage.getByText('존재하지 않는 방입니다')).toBeVisible()
    } finally {
      await guestContext.close()
      await hostContext.close()
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

async function createRoomAndJoinAsHost(page: Page, nickname: string) {
  await page.goto('/')
  await page.locator(byAriaLabel(ARIA_LABELS.landing.createRoomButton)).click()
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
