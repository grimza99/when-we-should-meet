export type DateRangeType = 'this_month' | 'this_year' | 'custom'
export type DateMode = 'available' | 'unavailable'
export type RouteState =
  | { name: 'landing' }
  | { name: 'room'; roomId: string }
  | { name: 'room_access_restricted'; roomId: string }

export type CreateRoomPayload = {
  maxParticipants: number
  dateRangeType: DateRangeType
  startDate: string
  endDate: string
}

export type Participant = {
  id: string
  nickname: string
  colorIndex: number
  selectionMode: DateMode
  weekdayRules: number[]
  overrides: Record<string, DateMode>
  updatedAt?: string
}

export type Room = {
  id: string
  inviteCode: string
  maxParticipants: number
  dateRangeType: DateRangeType
  startDate: string
  endDate: string
  createdAt: string
  expiresAt?: string
  hostClientKey?: string
  participants: Participant[]
}

export type AppStorage = {
  rooms: Record<string, Room>
  memberships: Record<string, string>
}

export type RankingItem = {
  date: string
  label: string
  score: number
  rank: number
}

export type CalendarDay = {
  key: string
  isoDate: string | null
  dayNumber: string
  isCurrentMonth: boolean
  isSelectable: boolean
  availableCount: number
  participantColors: string[]
  isSelectedByCurrentUser: boolean
}

export type RoomSummary = {
  monthLabel: string
  rankings: RankingItem[]
  calendarDays: CalendarDay[]
}
