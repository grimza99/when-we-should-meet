import { WEEKDAY_LABELS } from './constants'
import type { CalendarDay, DateMode, DateRangeType, Participant, RankingItem, Room } from '../types'

export function resolveDateRange(type: DateRangeType, start: string, end: string) {
  if (type === 'custom') {
    return { startDate: start, endDate: end }
  }

  const now = new Date()
  const today = formatDate(now)
  const year = now.getFullYear()
  const month = now.getMonth()

  if (type === 'this_year') {
    return {
      startDate: today,
      endDate: formatDate(new Date(year, 11, 31)),
    }
  }

  return {
    startDate: today,
    endDate: formatDate(new Date(year, month + 1, 0)),
  }
}

export function buildCalendarDays(
  room: Room,
  currentParticipantId?: string,
  visibleMonth?: string,
): CalendarDay[] {
  const start = visibleMonth
    ? startOfMonth(parseDateOnly(visibleMonth))
    : parseDateOnly(room.startDate)
  const end = visibleMonth
    ? endOfMonth(parseDateOnly(visibleMonth))
    : parseDateOnly(room.endDate)
  const roomStart = room.startDate
  const roomEnd = room.endDate
  const calendarStart = new Date(start)
  calendarStart.setDate(calendarStart.getDate() - calendarStart.getDay())

  const calendarEnd = new Date(end)
  calendarEnd.setDate(calendarEnd.getDate() + (6 - calendarEnd.getDay()))

  const days: CalendarDay[] = []
  const currentParticipant = currentParticipantId
    ? room.participants.find((participant) => participant.id === currentParticipantId)
    : undefined

  for (
    const cursor = new Date(calendarStart);
    cursor <= calendarEnd;
    cursor.setDate(cursor.getDate() + 1)
  ) {
    const isoDate = formatDate(cursor)
    const isSelectable = isoDate >= roomStart && isoDate <= roomEnd
    const availableParticipants = isSelectable
      ? room.participants.filter((participant) =>
          isDateAvailable(participant, isoDate),
        )
      : []

    days.push({
      key: `${isoDate}-${days.length}`,
      isoDate,
      dayNumber: String(cursor.getDate()),
      isCurrentMonth: cursor.getMonth() === start.getMonth(),
      isSelectable,
      availableCount: availableParticipants.length,
      participantColors: availableParticipants.map(
        (participant) => COLOR_FALLBACKS[participant.colorIndex] ?? COLOR_FALLBACKS[0],
      ),
      isSelectedByCurrentUser:
        currentParticipant && isSelectable
          ? isDateSelectedByParticipant(currentParticipant, isoDate)
          : false,
    })
  }

  return days
}

export function buildRankings(room: Room): RankingItem[] {
  const rankings: RankingItem[] = []
  const start = parseDateOnly(room.startDate)
  const end = parseDateOnly(room.endDate)

  for (const cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
    const isoDate = formatDate(cursor)
    const score = room.participants.filter((participant) =>
      isDateAvailable(participant, isoDate),
    ).length

    rankings.push({
      date: isoDate,
      label: formatReadableDate(cursor),
      score,
      rank: 0,
    })
  }

  return rankings
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score
      }

      return left.date.localeCompare(right.date)
    })
    .filter((item) => item.score > 0)
    .slice(0, 3)
    .map((item, index) => ({
      ...item,
      rank: index + 1,
    }))
}

export function clampVisibleMonth(room: Room, visibleMonth: string) {
  const month = startOfMonth(parseDateOnly(visibleMonth))
  const roomStart = startOfMonth(parseDateOnly(room.startDate))
  const roomEnd = startOfMonth(parseDateOnly(room.endDate))

  if (month < roomStart) {
    return formatDate(roomStart)
  }

  if (month > roomEnd) {
    return formatDate(roomEnd)
  }

  return formatDate(month)
}

export function addMonths(isoDate: string, amount: number) {
  const next = parseDateOnly(isoDate)
  next.setDate(1)
  next.setMonth(next.getMonth() + amount)
  return formatDate(next)
}

export function formatMonthLabel(isoDate: string) {
  const date = parseDateOnly(isoDate)
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월`
}

export function convertParticipantSelectionMode(
  room: Room,
  participant: Participant,
  nextMode: DateMode,
) {
  const overrides: Participant['overrides'] = {}

  for (const isoDate of enumerateDateRange(room.startDate, room.endDate)) {
    const isAvailable = isDateAvailable(participant, isoDate)

    if (nextMode === 'available' && isAvailable) {
      overrides[isoDate] = 'available'
    }

    if (nextMode === 'unavailable' && !isAvailable) {
      overrides[isoDate] = 'unavailable'
    }
  }

  return {
    overrides,
    selectionMode: nextMode,
    weekdayRules: [],
  }
}

export function isDateAvailable(
  participant: Room['participants'][number],
  isoDate: string,
) {
  const override = participant.overrides[isoDate]
  if (override) {
    return override === 'available'
  }

  const weekday = parseDateOnly(isoDate).getDay()
  const ruleMatched = participant.weekdayRules.includes(weekday)

  if (participant.selectionMode === 'available') {
    return ruleMatched
  }

  return !ruleMatched
}

function isDateSelectedByParticipant(
  participant: Room['participants'][number],
  isoDate: string,
) {
  const override = participant.overrides[isoDate]
  if (override) {
    return override === participant.selectionMode
  }

  const weekday = parseDateOnly(isoDate).getDay()
  return participant.weekdayRules.includes(weekday)
}

export function formatDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

export function formatReadableDate(date: Date) {
  return `${date.getMonth() + 1}월 ${date.getDate()}일 ${WEEKDAY_LABELS[date.getDay()]}요일`
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0)
}

export function getTodayDateString() {
  return formatDate(new Date())
}

function enumerateDateRange(startDate: string, endDate: string) {
  const dates: string[] = []
  const start = parseDateOnly(startDate)
  const end = parseDateOnly(endDate)

  for (const cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
    dates.push(formatDate(cursor))
  }

  return dates
}

function parseDateOnly(isoDate: string) {
  const [year, month, day] = isoDate.split('-').map(Number)

  if (!year || !month || !day) {
    return new Date(isoDate)
  }

  return new Date(year, month - 1, day)
}

const COLOR_FALLBACKS = [
  '#ee6c4d',
  '#2a9d8f',
  '#3d5a80',
  '#e9c46a',
  '#9c6644',
  '#7b2cbf',
  '#ff6b6b',
  '#4d908e',
  '#577590',
  '#f3722c',
]
