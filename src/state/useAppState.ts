import { useMemo, useState } from 'react'
import { useLocalStorageState } from '../hooks/useLocalStorageState'
import { buildCalendarDays, buildRankings } from '../lib/date'
import { COLOR_PALETTE, DEFAULT_STORAGE, MODE_LABELS, WEEKDAY_LABELS } from '../lib/constants'
import { useRouteState } from '../lib/router'
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

  const currentRoom =
    route.name === 'room' ? storage.rooms[route.roomId] : undefined
  const currentParticipantId =
    route.name === 'room' ? storage.memberships[route.roomId] : undefined
  const currentParticipant = currentRoom?.participants.find(
    (participant) => participant.id === currentParticipantId,
  )

  const currentRoomSummary = useMemo(() => {
    if (!currentRoom) {
      return undefined
    }

    return {
      rankings: buildRankings(currentRoom),
      calendarDays: buildCalendarDays(currentRoom, currentParticipant?.id),
    }
  }, [currentParticipant?.id, currentRoom])

  const createRoom = (payload: CreateRoomPayload) => {
    const room = createRoomRecord(payload)

    setStorage((previous) => ({
      ...previous,
      rooms: {
        ...previous.rooms,
        [room.id]: room,
      },
    }))

    navigate({ name: 'room', roomId: room.id })
  }

  const joinRoomByInviteCode = () => {
    const inviteCode = joinInviteCode.trim().toUpperCase()
    const room = Object.values(storage.rooms).find(
      (candidate) => candidate.inviteCode === inviteCode,
    )

    if (!room) {
      return
    }

    navigate({ name: 'room', roomId: room.id })
  }

  const joinCurrentRoom = (nickname: string) => {
    if (!currentRoom || currentParticipant) {
      return
    }

    const nextParticipant = createParticipant(currentRoom)

    nextParticipant.nickname = nickname

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
  }

  const changeSelectionMode = (mode: DateMode) => {
    if (!currentRoom || !currentParticipant) {
      return
    }

    updateCurrentParticipant({
      ...currentParticipant,
      selectionMode: mode,
    })
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

  return {
    changeSelectionMode,
    createRoom,
    currentParticipant,
    currentRoom,
    currentRoomSummary,
    currentRoute: route,
    goToLanding: () => navigate({ name: 'landing' }),
    joinCurrentRoom,
    joinInviteCode,
    joinRoomByInviteCode,
    modeOptions: (Object.keys(MODE_LABELS) as DateMode[]).map((value) => ({
      label: MODE_LABELS[value],
      value,
    })),
    selectedMode: currentParticipant?.selectionMode ?? 'available',
    setJoinInviteCode,
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
