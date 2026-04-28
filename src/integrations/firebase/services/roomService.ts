import {
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  onSnapshot,
  runTransaction,
  updateDoc,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore'
import { COLOR_PALETTE } from '../../../lib/constants'
import type { CreateRoomPayload, Participant, Room } from '../../../types'
import { db } from '../client'

type FirestoreRoomDocument = {
  inviteCode: string
  blockedClientKeys?: string[]
  maxParticipants: number
  participantCount: number
  dateRangeType: Room['dateRangeType']
  startDate: string
  endDate: string
  createdAt: string
  expiresAt: string
  hostClientKey: string
  updatedAt: string
}

type FirestoreParticipantDocument = {
  clientKey: string
  nickname: string
  colorIndex: number
  selectionMode: Participant['selectionMode']
  weekdayRules: number[]
  overrides: Participant['overrides']
  joinedAt: string
  updatedAt: string
}

type FirestoreInviteCodeDocument = {
  roomId: string
  createdAt: string
}

type RoomSnapshot = {
  room: RoomRow
  participants: ParticipantRow[]
}

type RoomRow = FirestoreRoomDocument & {
  id: string
}

type ParticipantRow = FirestoreParticipantDocument & {
  id: string
}

export type RoomChangeSubscription = Unsubscribe

export async function createRoom(
  payload: CreateRoomPayload & { hostClientKey: string },
) {
  const now = new Date().toISOString()
  const roomId = crypto.randomUUID()
  const inviteCode = await createUniqueInviteCode()
  const room: FirestoreRoomDocument = {
    inviteCode,
    maxParticipants: payload.maxParticipants,
    participantCount: 0,
    dateRangeType: payload.dateRangeType,
    startDate: payload.startDate,
    endDate: payload.endDate,
    createdAt: now,
    expiresAt: addOneMonth(now),
    hostClientKey: payload.hostClientKey,
    updatedAt: now,
  }
  const inviteCodeRecord: FirestoreInviteCodeDocument = {
    roomId,
    createdAt: now,
  }
  const batch = writeBatch(db)

  batch.set(roomRef(roomId), room)
  batch.set(inviteCodeRef(inviteCode), inviteCodeRecord)
  await batch.commit()

  return {
    id: roomId,
    ...room,
  }
}

export async function getRoomByInviteCode(inviteCode: string) {
  const inviteCodeSnapshot = await getDoc(inviteCodeRef(inviteCode))

  if (!inviteCodeSnapshot.exists()) {
    return null
  }

  const { roomId } = inviteCodeSnapshot.data() as FirestoreInviteCodeDocument
  const roomSnapshot = await getDoc(roomRef(roomId))

  if (!roomSnapshot.exists()) {
    return null
  }

  return mapRoomSnapshot(roomSnapshot.id, roomSnapshot.data() as FirestoreRoomDocument)
}

export async function joinRoom(params: {
  clientKey: string
  nickname: string
  roomId: string
}) {
  const now = new Date().toISOString()

  return runTransaction(db, async (transaction) => {
    const roomDocumentRef = roomRef(params.roomId)
    const participantDocumentRef = participantRef(params.roomId, params.clientKey)
    const [roomSnapshot, existingParticipantSnapshot] = await Promise.all([
      transaction.get(roomDocumentRef),
      transaction.get(participantDocumentRef),
    ])

    if (!roomSnapshot.exists()) {
      throw new Error('ROOM_NOT_FOUND')
    }

    if (existingParticipantSnapshot.exists()) {
      return mapParticipantSnapshot(
        existingParticipantSnapshot.id,
        existingParticipantSnapshot.data() as FirestoreParticipantDocument,
      )
    }

    const room = roomSnapshot.data() as FirestoreRoomDocument

    if (room.blockedClientKeys?.includes(params.clientKey)) {
      throw new Error('ROOM_ACCESS_RESTRICTED')
    }

    if (room.participantCount >= room.maxParticipants) {
      throw new Error('ROOM_CAPACITY_REACHED')
    }

    const participant: FirestoreParticipantDocument = {
      clientKey: params.clientKey,
      nickname: params.nickname,
      colorIndex: room.participantCount % COLOR_PALETTE.length,
      selectionMode: 'available',
      weekdayRules: [],
      overrides: {},
      joinedAt: now,
      updatedAt: now,
    }

    transaction.set(participantDocumentRef, participant)
    transaction.update(roomDocumentRef, {
      participantCount: increment(1),
      updatedAt: now,
    })

    return mapParticipantSnapshot(params.clientKey, participant)
  })
}

export async function restoreParticipant(params: {
  clientKey: string
  roomId: string
}) {
  const roomSnapshot = await getDoc(roomRef(params.roomId))

  if (roomSnapshot.exists()) {
    const room = roomSnapshot.data() as FirestoreRoomDocument

    if (room.blockedClientKeys?.includes(params.clientKey)) {
      throw new Error('ROOM_ACCESS_RESTRICTED')
    }
  }

  const participantSnapshot = await getDoc(
    participantRef(params.roomId, params.clientKey),
  )

  if (!participantSnapshot.exists()) {
    return null
  }

  return mapParticipantSnapshot(
    participantSnapshot.id,
    participantSnapshot.data() as FirestoreParticipantDocument,
  )
}

export async function getRoomSnapshot(roomId: string) {
  const [roomSnapshot, participantSnapshots] = await Promise.all([
    getDoc(roomRef(roomId)),
    getDocs(collection(db, 'rooms', roomId, 'participants')),
  ])

  if (!roomSnapshot.exists()) {
    return null
  }

  return {
    room: mapRoomSnapshot(roomSnapshot.id, roomSnapshot.data() as FirestoreRoomDocument),
    participants: participantSnapshots.docs.map((snapshot) =>
      mapParticipantSnapshot(
        snapshot.id,
        snapshot.data() as FirestoreParticipantDocument,
      ),
    ),
  } satisfies RoomSnapshot
}

export async function updateParticipantAvailability(params: {
  clientKey: string
  participantId: string
  roomId: string
  selectionMode: Participant['selectionMode']
  weekdayRules: number[]
}) {
  assertParticipantOwnership(params)

  await updateDoc(participantRef(params.roomId, params.participantId), {
    selectionMode: params.selectionMode,
    weekdayRules: params.weekdayRules,
    updatedAt: new Date().toISOString(),
  })
}

export async function setParticipantDateOverride(params: {
  clientKey: string
  participantId: string
  roomId: string
  overrides: Participant['overrides']
}) {
  assertParticipantOwnership(params)

  await updateDoc(participantRef(params.roomId, params.participantId), {
    overrides: params.overrides,
    updatedAt: new Date().toISOString(),
  })
}

export async function updateParticipantNickname(params: {
  clientKey: string
  nickname: string
  participantId: string
  roomId: string
}) {
  assertParticipantOwnership(params)

  await updateDoc(participantRef(params.roomId, params.participantId), {
    nickname: params.nickname,
    updatedAt: new Date().toISOString(),
  })
}

export async function removeParticipant(params: {
  hostClientKey: string
  participantId: string
  roomId: string
}) {
  if (params.participantId === params.hostClientKey) {
    throw new Error('HOST_PARTICIPANT_CANNOT_BE_REMOVED')
  }

  const now = new Date().toISOString()

  await runTransaction(db, async (transaction) => {
    const roomDocumentRef = roomRef(params.roomId)
    const participantDocumentRef = participantRef(
      params.roomId,
      params.participantId,
    )
    const [roomSnapshot, participantSnapshot] = await Promise.all([
      transaction.get(roomDocumentRef),
      transaction.get(participantDocumentRef),
    ])

    if (!roomSnapshot.exists()) {
      throw new Error('ROOM_NOT_FOUND')
    }

    const room = roomSnapshot.data() as FirestoreRoomDocument

    if (room.hostClientKey !== params.hostClientKey) {
      throw new Error('HOST_PERMISSION_REQUIRED')
    }

    if (!participantSnapshot.exists()) {
      return
    }

    const participant = participantSnapshot.data() as FirestoreParticipantDocument
    const blockedClientKeys = Array.from(
      new Set([...(room.blockedClientKeys ?? []), participant.clientKey]),
    )

    transaction.delete(participantDocumentRef)
    transaction.update(roomDocumentRef, {
      blockedClientKeys,
      participantCount: increment(-1),
      updatedAt: now,
    })
  })
}

export async function leaveRoom(params: {
  clientKey: string
  participantId: string
  roomId: string
}) {
  assertParticipantOwnership(params)

  const now = new Date().toISOString()

  await runTransaction(db, async (transaction) => {
    const roomDocumentRef = roomRef(params.roomId)
    const participantDocumentRef = participantRef(
      params.roomId,
      params.participantId,
    )
    const [roomSnapshot, participantSnapshot] = await Promise.all([
      transaction.get(roomDocumentRef),
      transaction.get(participantDocumentRef),
    ])

    if (!roomSnapshot.exists()) {
      throw new Error('ROOM_NOT_FOUND')
    }

    const room = roomSnapshot.data() as FirestoreRoomDocument

    if (room.hostClientKey === params.participantId) {
      throw new Error('HOST_PARTICIPANT_CANNOT_LEAVE')
    }

    if (!participantSnapshot.exists()) {
      return
    }

    transaction.delete(participantDocumentRef)
    transaction.update(roomDocumentRef, {
      participantCount: increment(-1),
      updatedAt: now,
    })
  })
}

export async function isRoomAccessRestricted(params: {
  clientKey: string
  roomId: string
}) {
  const roomSnapshot = await getDoc(roomRef(params.roomId))

  if (!roomSnapshot.exists()) {
    return false
  }

  const room = roomSnapshot.data() as FirestoreRoomDocument
  return room.blockedClientKeys?.includes(params.clientKey) ?? false
}

export async function deleteRoom(params: {
  hostClientKey: string
  roomId: string
}) {
  const roomSnapshot = await getDoc(roomRef(params.roomId))

  if (!roomSnapshot.exists()) {
    return
  }

  const room = roomSnapshot.data() as FirestoreRoomDocument

  if (room.hostClientKey !== params.hostClientKey) {
    throw new Error('HOST_PERMISSION_REQUIRED')
  }

  const participantSnapshots = await getDocs(
    collection(db, 'rooms', params.roomId, 'participants'),
  )
  const batch = writeBatch(db)

  participantSnapshots.docs.forEach((participantSnapshot) => {
    batch.delete(participantSnapshot.ref)
  })
  batch.delete(inviteCodeRef(room.inviteCode))
  batch.delete(roomRef(params.roomId))

  await batch.commit()
}

export function subscribeToRoomChanges(params: {
  roomId: string
  onChange: () => void
  onStatusChange?: (status: string) => void
}) {
  const unsubscribers = [
    onSnapshot(
      roomRef(params.roomId),
      () => params.onChange(),
      () => params.onStatusChange?.('SNAPSHOT_ERROR'),
    ),
    onSnapshot(
      collection(db, 'rooms', params.roomId, 'participants'),
      () => params.onChange(),
      () => params.onStatusChange?.('SNAPSHOT_ERROR'),
    ),
  ]

  return () => {
    unsubscribers.forEach((unsubscribe) => unsubscribe())
  }
}

export async function unsubscribeFromRoomChanges(subscription: RoomChangeSubscription) {
  subscription()
}

export function mapRoomRowToDraftRoom(row: RoomRow) {
  return {
    id: row.id,
    inviteCode: row.inviteCode,
    maxParticipants: row.maxParticipants,
    dateRangeType: row.dateRangeType,
    startDate: row.startDate,
    endDate: row.endDate,
    createdAt: row.createdAt,
    expiresAt: row.expiresAt,
    hostClientKey: row.hostClientKey,
    participants: [],
  }
}

export function mapRoomSnapshotToDraftRoom(snapshot: RoomSnapshot): Room {
  return {
    ...mapRoomRowToDraftRoom(snapshot.room),
    participants: snapshot.participants.map(mapParticipantRow),
  }
}

export function mapParticipantRow(row: ParticipantRow) {
  return {
    id: row.id,
    nickname: row.nickname,
    colorIndex: row.colorIndex,
    selectionMode: row.selectionMode,
    weekdayRules: row.weekdayRules,
    overrides: row.overrides,
    updatedAt: row.updatedAt,
  }
}

function roomRef(roomId: string) {
  return doc(db, 'rooms', roomId)
}

function inviteCodeRef(inviteCode: string) {
  return doc(db, 'inviteCodes', inviteCode)
}

function participantRef(roomId: string, participantId: string) {
  return doc(db, 'rooms', roomId, 'participants', participantId)
}

function mapRoomSnapshot(id: string, data: FirestoreRoomDocument): RoomRow {
  return {
    id,
    ...data,
  }
}

function mapParticipantSnapshot(
  id: string,
  data: FirestoreParticipantDocument,
): ParticipantRow {
  return {
    id,
    ...data,
  }
}

async function createUniqueInviteCode() {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const inviteCode = createInviteCode()
    const existingInviteCode = await getDoc(inviteCodeRef(inviteCode))

    if (!existingInviteCode.exists()) {
      return inviteCode
    }
  }

  throw new Error('INVITE_CODE_COLLISION')
}

function createInviteCode() {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 6).toUpperCase()
}

function addOneMonth(isoDate: string) {
  const expiresAt = new Date(isoDate)
  expiresAt.setMonth(expiresAt.getMonth() + 1)
  return expiresAt.toISOString()
}

function assertParticipantOwnership(params: {
  clientKey: string
  participantId: string
}) {
  if (params.clientKey !== params.participantId) {
    throw new Error('PARTICIPANT_OWNERSHIP_MISMATCH')
  }
}
