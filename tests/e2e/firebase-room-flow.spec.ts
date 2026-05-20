import { expect, test, type BrowserContext } from '@playwright/test'
import { ARIA_LABELS, getParticipantRemoveAriaLabel } from '../../src/lib/ariaLabels'
import {
  byAriaLabel,
  closeContext,
  createMobileContext,
  createRoomAndJoin,
  joinCurrentRoom,
} from './helpers/roomFlow'

test.describe('Firebase 에뮬레이터 방 플로우', () => {
  test('초대 코드 참여, 실시간 동기화, 새로고침 복원, 강제 퇴장을 검증한다', async ({
    browser,
  }) => {
    const hostContext = await createMobileContext(browser)
    const guestContext = await createMobileContext(browser)
    const hostPage = await hostContext.newPage()
    const guestPage = await guestContext.newPage()

    try {
      const { inviteCode } = await createRoomAndJoin(hostPage, '호스트')

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

      await expect(hostPage.locator('.ranking-item').first()).toContainText('1명 가능')

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
      await closeContext(guestContext)
      await closeContext(hostContext)
    }
  })

  test('딥링크 참여, 참가자 나가기, 방 삭제를 지원한다', async ({
    browser,
  }) => {
    const hostContext = await createMobileContext(browser)
    const guestContext = await createMobileContext(browser)
    let viewerContext: BrowserContext | null = null
    const hostPage = await hostContext.newPage()
    const guestPage = await guestContext.newPage()

    try {
      const { roomUrl } = await createRoomAndJoin(hostPage, '방장')

      await guestPage.goto(roomUrl)
      await joinCurrentRoom(guestPage, '참가자')

      await expect(hostPage.getByText('2 / 6명 참여 중')).toBeVisible()

      guestPage.once('dialog', (dialog) => dialog.accept())
      await guestPage.locator(byAriaLabel(ARIA_LABELS.room.leaveRoomButton)).click()

      await expect(guestPage).toHaveURL('/')
      await expect(hostPage.getByText('1 / 6명 참여 중')).toBeVisible()
      await expect(hostPage.getByText('참가자', { exact: true })).toHaveCount(0)

      hostPage.once('dialog', (dialog) => dialog.accept())
      await hostPage.locator(byAriaLabel(ARIA_LABELS.room.deleteRoomButton)).click()

      await expect(hostPage).toHaveURL('/')

      viewerContext = await createMobileContext(browser)
      const viewerPage = await viewerContext.newPage()

      await viewerPage.goto(roomUrl)
      await expect(viewerPage.getByText('존재하지 않는 방입니다')).toBeVisible()
    } finally {
      await closeContext(viewerContext)
      await closeContext(guestContext)
      await closeContext(hostContext)
    }
  })
})
