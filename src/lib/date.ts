import { WEEKDAY_LABELS } from './constants'
import type { CalendarDay, DateRangeType, RankingItem, Room } from '../types'

export function resolveDateRange(type: DateRangeType, start: string, end: string) {
  if (type === 'custom') {
    return { startDate: start, endDate: end }
  }

  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()

  if (type === 'this_year') {
    return {
      startDate: formatDate(new Date(year, 0, 1)),
      endDate: formatDate(new Date(year, 11, 31)),
    }
  }

  return {
    startDate: formatDate(new Date(year, month, 1)),
    endDate: formatDate(new Date(year, month + 1, 0)),
  }
}

export function buildCalendarDays(
  room: Room,
  currentParticipantId?: string,
  visibleMonth?: string,
): CalendarDay[] {
  const start = visibleMonth ? startOfMonth(new Date(visibleMonth)) : new Date(room.startDate)
  const end = visibleMonth ? endOfMonth(new Date(visibleMonth)) : new Date(room.endDate)
  const calendarStart = new Date(start)
  calendarStart.setDate(calendarStart.getDate() - calendarStart.getDay())

  const calendarEnd = new Date(end)
  calendarEnd.setDate(calendarEnd.getDate() + (6 - calendarEnd.getDay()))

  const days: CalendarDay[] = []

  for (
    const cursor = new Date(calendarStart);
    cursor <= calendarEnd;
    cursor.setDate(cursor.getDate() + 1)
  ) {
    const isoDate = formatDate(cursor)
    const availableParticipants = room.participants.filter((participant) =>
      isDateAvailable(participant, isoDate),
    )

    days.push({
      key: `${isoDate}-${days.length}`,
      isoDate,
      dayNumber: String(cursor.getDate()),
      isCurrentMonth: cursor.getMonth() === start.getMonth(),
      availableCount: availableParticipants.length,
      participantColors: availableParticipants.map(
        (participant) => COLOR_FALLBACKS[participant.colorIndex] ?? COLOR_FALLBACKS[0],
      ),
      isSelectedByCurrentUser: currentParticipantId
        ? availableParticipants.some(
            (participant) => participant.id === currentParticipantId,
          )
        : false,
    })
  }

  return days
}

export function buildRankings(room: Room): RankingItem[] {
  const rankings: RankingItem[] = []
  const start = new Date(room.startDate)
  const end = new Date(room.endDate)

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
    .slice(0, 3)
    .map((item, index) => ({
      ...item,
      rank: index + 1,
    }))
}

export function clampVisibleMonth(room: Room, visibleMonth: string) {
  const month = startOfMonth(new Date(visibleMonth))
  const roomStart = startOfMonth(new Date(room.startDate))
  const roomEnd = startOfMonth(new Date(room.endDate))

  if (month < roomStart) {
    return formatDate(roomStart)
  }

  if (month > roomEnd) {
    return formatDate(roomEnd)
  }

  return formatDate(month)
}

export function addMonths(isoDate: string, amount: number) {
  const next = new Date(isoDate)
  next.setDate(1)
  next.setMonth(next.getMonth() + amount)
  return formatDate(next)
}

export function formatMonthLabel(isoDate: string) {
  const date = new Date(isoDate)
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월`
}

export function isDateAvailable(
  participant: Room['participants'][number],
  isoDate: string,
) {
  const override = participant.overrides[isoDate]
  if (override) {
    return override === 'available'
  }

  const weekday = new Date(isoDate).getDay()
  const ruleMatched = participant.weekdayRules.includes(weekday)

  if (participant.selectionMode === 'available') {
    return ruleMatched
  }

  return !ruleMatched
}

export function formatDate(date: Date) {
  return date.toISOString().slice(0, 10)
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
