import { useMemo, useState } from 'react'
import { useLocalStorageState } from '../hooks/useLocalStorageState'
import {
  addMonths,
  buildCalendarDays,
  buildRankings,
  clampVisibleMonth,
  formatMonthLabel,
} from '../lib/date'
import { COLOR_PALETTE, DEFAULT_STORAGE, MODE_LABELS, WEEKDAY_LABELS } from '../lib/constants'
import { useRouteState } from '../lib/router'
import { getOrCreateClientKey } from '../lib/session/clientIdentity'
import { isSupabaseConfigured } from '../integrations/supabase/client'
import {
  createRoom as createSupabaseRoom,
  getRoomByInviteCode,
  joinRoom as joinSupabaseRoom,
  mapParticipantRow,
  mapRoomRowToDraftRoom,
} from '../integrations/supabase/services/roomService'
import type {
  AppStorage,
  CreateRoomPayload,
  DateMode,
  Participant,
  Room,
} from '../types'

const STORAGE_KEY = 'when-should-we-meet-storage'

export function useAppState() {
  const { navigate, route } = useRouteState()
  const [storage, setStorage] = useLocalStorageState<AppStorage>(
    STORAGE_KEY,
    DEFAULT_STORAGE,
  )
  const [joinInviteCode, setJoinInviteCode] = useState('')
  const [landingMessage, setLandingMessage] = useState('')
  const [roomMessage, setRoomMessage] = useState('')
  const [visibleMonth, setVisibleMonth] = useState('')

  const currentRoom =
    route.name === 'room' ? storage.rooms[route.roomId] : undefined
  const currentParticipantId =
    route.name === 'room' ? storage.memberships[route.roomId] : undefined
  const currentParticipant = currentRoom?.participants.find(
    (participant) => participant.id === currentParticipantId,
  )
  const effectiveVisibleMonth = currentRoom
    ? clampVisibleMonth(currentRoom, visibleMonth || currentRoom.startDate)
    : ''

  const currentRoomSummary = useMemo(() => {
    if (!currentRoom) {
      return undefined
    }

    return {
      monthLabel: formatMonthLabel(effectiveVisibleMonth),
      rankings: buildRankings(currentRoom),
      calendarDays: buildCalendarDays(
        currentRoom,
        currentParticipant?.id,
        effectiveVisibleMonth,
      ),
    }
  }, [currentParticipant?.id, currentRoom, effectiveVisibleMonth])

  const createRoom = async (payload: CreateRoomPayload) => {
    if (!isSupabaseConfigured) {
      const room = createRoomRecord(payload)

      setStorage((previous) => ({
        ...previous,
        rooms: {
          ...previous.rooms,
          [room.id]: room,
        },
      }))

      setVisibleMonth(room.startDate)
      setLandingMessage('')
      navigate({ name: 'room', roomId: room.id })
      return
    }

    try {
      const roomRow = await createSupabaseRoom(payload)
      const room = mapRoomRowToDraftRoom(roomRow)

      setStorage((previous) => ({
        ...previous,
        rooms: {
          ...previous.rooms,
          [room.id]: room,
        },
      }))

      setVisibleMonth(room.startDate)
      setLandingMessage('')
      navigate({ name: 'room', roomId: room.id })
    } catch {
      setLandingMessage('방 생성에 실패했어요. 잠시 후 다시 시도해 주세요.')
    }
  }

  const joinRoomByInviteCode = async () => {
    const inviteCode = joinInviteCode.trim().toUpperCase()
    if (!inviteCode) {
      setLandingMessage('초대 코드를 입력해 주세요.')
      return
    }

    if (!isSupabaseConfigured) {
      const room = Object.values(storage.rooms).find(
        (candidate) => candidate.inviteCode === inviteCode,
      )

      if (!room) {
        setLandingMessage('일치하는 방을 찾지 못했어요. 코드를 다시 확인해 주세요.')
        return
      }

      setVisibleMonth(room.startDate)
      setLandingMessage('')
      navigate({ name: 'room', roomId: room.id })
      return
    }

    try {
      const roomRow = await getRoomByInviteCode(inviteCode)

      if (!roomRow) {
        setLandingMessage('일치하는 방을 찾지 못했어요. 코드를 다시 확인해 주세요.')
        return
      }

      const room = mapRoomRowToDraftRoom(roomRow)

      setStorage((previous) => ({
        ...previous,
        rooms: {
          ...previous.rooms,
          [room.id]: previous.rooms[room.id] ?? room,
        },
      }))

      setVisibleMonth(room.startDate)
      setLandingMessage('')
      navigate({ name: 'room', roomId: room.id })
    } catch {
      setLandingMessage('방 조회에 실패했어요. 네트워크 상태를 확인해 주세요.')
    }
  }

  const joinCurrentRoom = async (nickname: string) => {
    if (!currentRoom || currentParticipant) {
      return
    }

    if (!isSupabaseConfigured) {
      const nextParticipant = createParticipant(currentRoom)

      nextParticipant.nickname = nickname
      setRoomMessage(`${nickname} 님으로 방에 참여했어요.`)

      setStorage((previous) => ({
        rooms: {
          ...previous.rooms,
          [currentRoom.id]: {
            ...currentRoom,
            participants: [...currentRoom.participants, nextParticipant],
          },
        },
        memberships: {
          ...previous.memberships,
          [currentRoom.id]: nextParticipant.id,
        },
      }))
      return
    }

    try {
      const participantRow = await joinSupabaseRoom({
        clientKey: getOrCreateClientKey(),
        nickname,
        roomId: currentRoom.id,
      })

      const nextParticipant = mapParticipantRow(participantRow)

      setRoomMessage(`${nickname} 님으로 방에 참여했어요.`)
      setStorage((previous) => ({
        rooms: {
          ...previous.rooms,
          [currentRoom.id]: {
            ...currentRoom,
            participants: upsertParticipant(currentRoom.participants, nextParticipant),
          },
        },
        memberships: {
          ...previous.memberships,
          [currentRoom.id]: nextParticipant.id,
        },
      }))
    } catch {
      setRoomMessage('방 참여에 실패했어요. 잠시 후 다시 시도해 주세요.')
    }
  }

  const changeSelectionMode = (mode: DateMode) => {
    if (!currentRoom || !currentParticipant) {
      return
    }

    updateCurrentParticipant({
      ...currentParticipant,
      selectionMode: mode,
    })
    setRoomMessage(
      mode === 'available'
        ? '가능한 날짜를 고르는 모드로 바뀌었어요.'
        : '불가능한 날짜를 고르는 모드로 바뀌었어요.',
    )
  }

  const toggleWeekday = (weekday: number) => {
    if (!currentParticipant) {
      return
    }

    const weekdayRules = currentParticipant.weekdayRules.includes(weekday)
      ? currentParticipant.weekdayRules.filter((value) => value !== weekday)
      : [...currentParticipant.weekdayRules, weekday].sort((left, right) => left - right)

    updateCurrentParticipant({
      ...currentParticipant,
      weekdayRules,
    })
    setRoomMessage(`${WEEKDAY_LABELS[weekday]}요일 규칙을 업데이트했어요.`)
  }

  const toggleDate = (isoDate: string) => {
    if (!currentParticipant) {
      return
    }

    const nextOverrides = { ...currentParticipant.overrides }
    const currentOverride = nextOverrides[isoDate]

    if (currentOverride === currentParticipant.selectionMode) {
      delete nextOverrides[isoDate]
    } else {
      nextOverrides[isoDate] = currentParticipant.selectionMode
    }

    updateCurrentParticipant({
      ...currentParticipant,
      overrides: nextOverrides,
    })
    setRoomMessage(`${isoDate} 날짜 선택을 반영했어요.`)
  }

  const updateCurrentParticipant = (nextParticipant: Participant) => {
    if (!currentRoom) {
      return
    }

    setStorage((previous) => ({
      ...previous,
      rooms: {
        ...previous.rooms,
        [currentRoom.id]: {
          ...currentRoom,
          participants: currentRoom.participants.map((participant) =>
            participant.id === nextParticipant.id ? nextParticipant : participant,
          ),
        },
      },
    }))
  }

  const moveVisibleMonth = (offset: number) => {
    if (!currentRoom) {
      return
    }

    setVisibleMonth((previous) =>
      clampVisibleMonth(
        currentRoom,
        addMonths(previous || currentRoom.startDate, offset),
      ),
    )
  }

  const copyInviteCode = async () => {
    if (!currentRoom) {
      return
    }

    try {
      await navigator.clipboard.writeText(currentRoom.inviteCode)
      setRoomMessage('초대 코드가 복사되었어요.')
    } catch {
      setRoomMessage('복사에 실패했어요. 브라우저 권한을 확인해 주세요.')
    }
  }

  const shareRoom = async () => {
    if (!currentRoom) {
      return
    }

    const shareData = {
      title: 'when should we meet?',
      text: `초대 코드 ${currentRoom.inviteCode}로 방에 참여해 주세요.`,
      url: window.location.href,
    }

    try {
      if (navigator.share) {
        await navigator.share(shareData)
        setRoomMessage('공유 시트를 열었어요.')
        return
      }

      await navigator.clipboard.writeText(shareData.url)
      setRoomMessage('공유 링크를 복사했어요.')
    } catch {
      setRoomMessage('공유를 완료하지 못했어요.')
    }
  }

  return {
    changeSelectionMode,
    copyInviteCode,
    createRoom,
    currentParticipant,
    currentRoom,
    currentRoomSummary,
    currentRoute: route,
    goToLanding: () => navigate({ name: 'landing' }),
    joinCurrentRoom,
    joinInviteCode,
    joinRoomByInviteCode,
    landingMessage,
    modeOptions: (Object.keys(MODE_LABELS) as DateMode[]).map((value) => ({
      label: MODE_LABELS[value],
      value,
    })),
    moveVisibleMonth,
    roomMessage,
    selectedMode: currentParticipant?.selectionMode ?? 'available',
    setJoinInviteCode,
    shareRoom,
    toggleDate,
    toggleWeekday,
    weekdayOptions: WEEKDAY_LABELS.map((label, value) => ({
      label,
      value,
      selected: currentParticipant?.weekdayRules.includes(value) ?? false,
    })),
  }
}

function createRoomRecord(payload: CreateRoomPayload): Room {
  const id = crypto.randomUUID()

  return {
    id,
    inviteCode: id.slice(0, 6).toUpperCase(),
    maxParticipants: payload.maxParticipants,
    dateRangeType: payload.dateRangeType,
    startDate: payload.startDate,
    endDate: payload.endDate,
    createdAt: new Date().toISOString(),
    participants: [],
  }
}

function createParticipant(room: Room): Participant {
  const usedColorIndexes = new Set(room.participants.map((participant) => participant.colorIndex))
  const colorIndex =
    COLOR_PALETTE.findIndex((_, index) => !usedColorIndexes.has(index)) === -1
      ? 0
      : COLOR_PALETTE.findIndex((_, index) => !usedColorIndexes.has(index))

  return {
    id: crypto.randomUUID(),
    nickname: '',
    colorIndex,
    selectionMode: 'available',
    weekdayRules: [],
    overrides: {},
  }
}

function upsertParticipant(participants: Participant[], nextParticipant: Participant) {
  const existing = participants.some(
    (participant) => participant.id === nextParticipant.id,
  )

  if (!existing) {
    return [...participants, nextParticipant]
  }

  return participants.map((participant) =>
    participant.id === nextParticipant.id ? nextParticipant : participant,
  )
}
