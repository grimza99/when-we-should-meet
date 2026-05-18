import { expect, test, type Browser, type BrowserContext, type Page } from '@playwright/test'
import { ARIA_LABELS, getParticipantRemoveAriaLabel } from '../../src/lib/ariaLabels'

const FIRESTORE_REST_BASE =
  'http://127.0.0.1:8080/v1/projects/demo-when-should-we-meet/databases/(default)/documents'

function byAriaLabel(label: string) {
  return `[aria-label="${label}"]`
}

test.describe('Firebase emulator document assertions', () => {
  test('creates room and invite code documents, then writes the host participant on join', async ({
    browser,
  }) => {
    const hostContext = await createMobileContext(browser)
    const hostPage = await hostContext.newPage()

    try {
      const { inviteCode, roomId } = await createRoomWithoutJoin(hostPage, {
        maxParticipants: 4,
      })

      const roomDocument = await getDocument(`rooms/${roomId}`)
      const inviteCodeDocument = await getDocument(`inviteCodes/${inviteCode}`)

      expect(readString(roomDocument, 'inviteCode')).toBe(inviteCode)
      expect(readInteger(roomDocument, 'maxParticipants')).toBe(4)
      expect(readInteger(roomDocument, 'participantCount')).toBe(0)
      expect(readString(roomDocument, 'hostClientKey')).toBeTruthy()
      expect(readString(roomDocument, 'expiresAt')).toBeTruthy()
      expect(readString(inviteCodeDocument, 'roomId')).toBe(roomId)

      await joinCurrentRoom(hostPage, '호스트')

      const joinedRoomDocument = await getDocument(`rooms/${roomId}`)
      const participants = await listDocuments(`rooms/${roomId}/participants`)

      expect(readInteger(joinedRoomDocument, 'participantCount')).toBe(1)
      expect(participants).toHaveLength(1)
      expect(readString(participants[0], 'nickname')).toBe('호스트')
      expect(readString(participants[0], 'clientKey')).toBeTruthy()
      expect(readString(participants[0], 'selectionMode')).toBe('available')
    } finally {
      await closeContext(hostContext)
    }
  })

  test('updates Firestore documents when a guest is removed, leaves, and the host deletes the room', async ({
    browser,
  }) => {
    const hostContext = await createMobileContext(browser)
    const guestContext = await createMobileContext(browser)
    const leaveGuestContext = await createMobileContext(browser)
    const hostPage = await hostContext.newPage()
    const guestPage = await guestContext.newPage()
    const leaveGuestPage = await leaveGuestContext.newPage()

    try {
      const { roomId, roomUrl, inviteCode } = await createRoomAndJoinAsHost(hostPage, '방장')

      await guestPage.goto(roomUrl)
      await joinCurrentRoom(guestPage, '제거될게스트')

      await leaveGuestPage.goto(roomUrl)
      await joinCurrentRoom(leaveGuestPage, '나갈게스트')

      await expect(hostPage.getByText('제거될게스트', { exact: true })).toBeVisible()
      await expect(hostPage.getByText('나갈게스트', { exact: true })).toBeVisible()
      await expect(hostPage.getByText('3 / 6명 참여 중')).toBeVisible()
      await expect(
        hostPage.locator(byAriaLabel(getParticipantRemoveAriaLabel('제거될게스트'))),
      ).toBeVisible()

      const guestParticipant = await findParticipantByNickname(roomId, '제거될게스트')
      const leaveParticipant = await findParticipantByNickname(roomId, '나갈게스트')

      await hostPage.locator(byAriaLabel(getParticipantRemoveAriaLabel('제거될게스트'))).click()
      await expect(hostPage.getByText('2 / 6명 참여 중')).toBeVisible()
      await expect.poll(async () => getParticipantCount(roomId)).toBe(2)
      await expect.poll(async () => listParticipantIds(roomId)).toHaveLength(2)

      const roomAfterRemoval = await getDocument(`rooms/${roomId}`)
      const participantsAfterRemoval = await listDocuments(`rooms/${roomId}/participants`)

      expect(readInteger(roomAfterRemoval, 'participantCount')).toBe(2)
      expect(readStringArray(roomAfterRemoval, 'blockedClientKeys')).toContain(guestParticipant.id)
      expect(participantsAfterRemoval.map((document) => readString(document, 'nickname'))).toEqual(
        expect.arrayContaining(['방장', '나갈게스트']),
      )
      expect(participantsAfterRemoval.map((document) => document.id)).not.toContain(guestParticipant.id)

      leaveGuestPage.once('dialog', (dialog) => dialog.accept())
      await leaveGuestPage.locator(byAriaLabel(ARIA_LABELS.room.leaveRoomButton)).click()
      await expect(leaveGuestPage).toHaveURL('/')
      await expect(hostPage.getByText('1 / 6명 참여 중')).toBeVisible()
      await expect.poll(async () => getParticipantCount(roomId)).toBe(1)
      await expect.poll(async () => listParticipantIds(roomId)).toHaveLength(1)

      const roomAfterLeave = await getDocument(`rooms/${roomId}`)
      const participantsAfterLeave = await listDocuments(`rooms/${roomId}/participants`)

      expect(readInteger(roomAfterLeave, 'participantCount')).toBe(1)
      expect(participantsAfterLeave.map((document) => document.id)).toEqual([expect.any(String)])
      expect(participantsAfterLeave.map((document) => document.id)).not.toContain(leaveParticipant.id)

      hostPage.once('dialog', (dialog) => dialog.accept())
      await hostPage.locator(byAriaLabel(ARIA_LABELS.room.deleteRoomButton)).click()
      await expect(hostPage).toHaveURL('/')

      await expect.poll(async () => getDocumentStatus(`rooms/${roomId}`)).toBe(404)
      await expect.poll(async () => getDocumentStatus(`inviteCodes/${inviteCode}`)).toBe(404)
      await expect.poll(async () => listParticipantIds(roomId)).toHaveLength(0)
    } finally {
      await closeContext(leaveGuestContext)
      await closeContext(guestContext)
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

async function createRoomWithoutJoin(
  page: Page,
  options: {
    maxParticipants?: number
  } = {},
) {
  await page.goto('/')
  await page.locator(byAriaLabel(ARIA_LABELS.landing.createRoomButton)).click()

  if (options.maxParticipants) {
    await page
      .locator(byAriaLabel(ARIA_LABELS.createRoom.participantCountInput))
      .fill(String(options.maxParticipants))
  }

  await page.locator(byAriaLabel(ARIA_LABELS.createRoom.submitButton)).click()
  await expect(page).toHaveURL(/\/room\/[^/]+$/)

  const roomUrl = new URL(page.url())
  const roomId = roomUrl.pathname.split('/').at(-1) ?? ''
  const inviteCode =
    (await page.locator(byAriaLabel(ARIA_LABELS.room.inviteCodeHeading)).textContent())?.trim() ||
    ''

  await expect(page.locator(byAriaLabel(ARIA_LABELS.nickname.dialog))).toBeVisible()

  return { inviteCode, roomId, roomUrl: page.url() }
}

async function createRoomAndJoinAsHost(page: Page, nickname: string) {
  const room = await createRoomWithoutJoin(page)
  await joinCurrentRoom(page, nickname)
  await expect(page.locator(byAriaLabel(ARIA_LABELS.room.calendarCard))).toBeVisible()
  return room
}

async function joinCurrentRoom(page: Page, nickname: string) {
  await expect(page.locator(byAriaLabel(ARIA_LABELS.nickname.dialog))).toBeVisible()
  await page.locator(byAriaLabel(ARIA_LABELS.nickname.input)).fill(nickname)
  await page.locator(byAriaLabel(ARIA_LABELS.nickname.submitButton)).click()
  await expect(page.locator(byAriaLabel(ARIA_LABELS.nickname.dialog))).toBeHidden()
  await expect(page.getByText(nickname, { exact: true })).toBeVisible()
}

type FirestoreRestDocument = {
  name: string
  fields?: Record<string, FirestoreRestValue>
}

type FirestoreRestValue = {
  stringValue?: string
  integerValue?: string
  arrayValue?: {
    values?: FirestoreRestValue[]
  }
}

async function getDocument(path: string) {
  const response = await fetch(`${FIRESTORE_REST_BASE}/${path}`)

  if (!response.ok) {
    throw new Error(`Failed to fetch document ${path}: ${response.status}`)
  }

  return parseDocument((await response.json()) as FirestoreRestDocument)
}

async function getDocumentStatus(path: string) {
  const response = await fetch(`${FIRESTORE_REST_BASE}/${path}`)
  return response.status
}

async function listDocuments(path: string) {
  const response = await fetch(`${FIRESTORE_REST_BASE}/${path}`)

  if (!response.ok) {
    throw new Error(`Failed to list documents ${path}: ${response.status}`)
  }

  const payload = (await response.json()) as { documents?: FirestoreRestDocument[] }
  return (payload.documents ?? []).map(parseDocument)
}

function parseDocument(document: FirestoreRestDocument) {
  return {
    id: document.name.split('/').at(-1) ?? '',
    fields: document.fields ?? {},
  }
}

function readString(document: ReturnType<typeof parseDocument>, field: string) {
  return document.fields[field]?.stringValue ?? ''
}

function readInteger(document: ReturnType<typeof parseDocument>, field: string) {
  return Number(document.fields[field]?.integerValue ?? 0)
}

function readStringArray(document: ReturnType<typeof parseDocument>, field: string) {
  return (
    document.fields[field]?.arrayValue?.values?.map((value) => value.stringValue ?? '') ?? []
  )
}

async function findParticipantByNickname(roomId: string, nickname: string) {
  const participants = await listDocuments(`rooms/${roomId}/participants`)
  const participant = participants.find((document) => readString(document, 'nickname') === nickname)

  if (!participant) {
    throw new Error(`Participant ${nickname} not found`)
  }

  return participant
}

async function getParticipantCount(roomId: string) {
  return readInteger(await getDocument(`rooms/${roomId}`), 'participantCount')
}

async function listParticipantIds(roomId: string) {
  return (await listDocuments(`rooms/${roomId}/participants`)).map((document) => document.id)
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
