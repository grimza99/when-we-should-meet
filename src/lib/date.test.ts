import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  addMonths,
  buildCalendarDays,
  buildRankings,
  clampVisibleMonth,
  convertParticipantSelectionMode,
  formatMonthLabel,
  isDateAvailable,
  resolveDateRange,
} from './date'
import type { Participant, Room } from '../types'

function createParticipant(overrides?: Partial<Participant>): Participant {
  return {
    id: 'participant',
    nickname: 'Participant',
    colorIndex: 0,
    selectionMode: 'available',
    weekdayRules: [],
    overrides: {},
    ...overrides,
  }
}

function createRoom(overrides?: Partial<Room>): Room {
  return {
    id: 'room-1',
    inviteCode: 'ABC123',
    maxParticipants: 5,
    dateRangeType: 'custom',
    startDate: '2026-05-10',
    endDate: '2026-05-20',
    createdAt: '2026-05-01T00:00:00.000Z',
    participants: [],
    ...overrides,
  }
}

function createDateLogicRoom(): Room {
  return createRoom({
    participants: [
      createParticipant({
        id: 'p1',
        nickname: 'Participant A',
        colorIndex: 0,
        selectionMode: 'available',
        weekdayRules: [1, 3],
        overrides: {
          '2026-05-17': 'available',
        },
      }),
      createParticipant({
        id: 'p2',
        nickname: 'Participant B',
        colorIndex: 1,
        selectionMode: 'unavailable',
        weekdayRules: [0, 6],
        overrides: {
          '2026-05-18': 'unavailable',
        },
      }),
    ],
  })
}

describe('resolveDateRange', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 4, 1, 12))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns the provided custom range unchanged', () => {
    expect(resolveDateRange('custom', '2026-05-10', '2026-05-20')).toEqual({
      startDate: '2026-05-10',
      endDate: '2026-05-20',
    })
  })

  it('resolves this month from the mocked current date', () => {
    expect(resolveDateRange('this_month', '', '')).toEqual({
      startDate: '2026-05-01',
      endDate: '2026-05-31',
    })
  })

  it('resolves this year from the mocked current date', () => {
    expect(resolveDateRange('this_year', '', '')).toEqual({
      startDate: '2026-05-01',
      endDate: '2026-12-31',
    })
  })
})

describe('isDateAvailable', () => {
  const room = createDateLogicRoom()
  const participantA = room.participants[0]
  const participantB = room.participants[1]

  it('applies available weekday rules', () => {
    expect(isDateAvailable(participantA, '2026-05-11')).toBe(true)
    expect(isDateAvailable(participantA, '2026-05-12')).toBe(false)
  })

  it('applies unavailable weekday rules as exclusions', () => {
    expect(isDateAvailable(participantB, '2026-05-17')).toBe(false)
    expect(isDateAvailable(participantB, '2026-05-14')).toBe(true)
  })

  it('lets explicit overrides win over weekday rules', () => {
    expect(isDateAvailable(participantA, '2026-05-17')).toBe(true)
    expect(isDateAvailable(participantB, '2026-05-18')).toBe(false)
  })
})

describe('buildCalendarDays', () => {
  it('builds a padded visible month grid with counts, colors, and selection state', () => {
    const room = createDateLogicRoom()
    const days = buildCalendarDays(room, 'p1', '2026-05-01')

    expect(days).toHaveLength(42)
    expect(days[0]?.isoDate).toBe('2026-04-26')
    expect(days.at(-1)?.isoDate).toBe('2026-06-06')
    expect(days.find((day) => day.isoDate === '2026-05-09')).toMatchObject({
      isSelectable: false,
      availableCount: 0,
    })
    expect(days.find((day) => day.isoDate === '2026-05-13')).toMatchObject({
      isSelectable: true,
      availableCount: 2,
      participantColors: ['#ee6c4d', '#2a9d8f'],
      isSelectedByCurrentUser: true,
    })
    expect(days.find((day) => day.isoDate === '2026-05-12')).toMatchObject({
      isSelectedByCurrentUser: false,
    })
  })
})

describe('buildRankings', () => {
  it('returns the top three ranked dates with deterministic tie ordering', () => {
    expect(buildRankings(createDateLogicRoom())).toEqual([
      {
        date: '2026-05-11',
        label: '5월 11일 월요일',
        score: 2,
        rank: 1,
      },
      {
        date: '2026-05-13',
        label: '5월 13일 수요일',
        score: 2,
        rank: 2,
      },
      {
        date: '2026-05-20',
        label: '5월 20일 수요일',
        score: 2,
        rank: 3,
      },
    ])
  })
})

describe('convertParticipantSelectionMode', () => {
  it('preserves unavailable dates when switching an available participant to unavailable mode', () => {
    const room = createDateLogicRoom()

    expect(
      convertParticipantSelectionMode(room, room.participants[0], 'unavailable'),
    ).toEqual({
      selectionMode: 'unavailable',
      weekdayRules: [],
      overrides: {
        '2026-05-10': 'unavailable',
        '2026-05-12': 'unavailable',
        '2026-05-14': 'unavailable',
        '2026-05-15': 'unavailable',
        '2026-05-16': 'unavailable',
        '2026-05-19': 'unavailable',
      },
    })
  })

  it('preserves available dates when switching an unavailable participant to available mode', () => {
    const room = createDateLogicRoom()

    expect(
      convertParticipantSelectionMode(room, room.participants[1], 'available'),
    ).toEqual({
      selectionMode: 'available',
      weekdayRules: [],
      overrides: {
        '2026-05-11': 'available',
        '2026-05-12': 'available',
        '2026-05-13': 'available',
        '2026-05-14': 'available',
        '2026-05-15': 'available',
        '2026-05-19': 'available',
        '2026-05-20': 'available',
      },
    })
  })
})

describe('month helpers', () => {
  it('clamps the visible month to the room range', () => {
    const room = createRoom({
      startDate: '2026-05-10',
      endDate: '2026-07-20',
    })

    expect(clampVisibleMonth(room, '2026-04-01')).toBe('2026-05-01')
    expect(clampVisibleMonth(room, '2026-06-15')).toBe('2026-06-01')
    expect(clampVisibleMonth(room, '2026-08-01')).toBe('2026-07-01')
  })

  it('moves dates by whole months and normalizes to the first day', () => {
    expect(addMonths('2026-01-15', 1)).toBe('2026-02-01')
    expect(addMonths('2026-12-20', 1)).toBe('2027-01-01')
    expect(addMonths('2026-05-10', -1)).toBe('2026-04-01')
  })

  it('formats month labels in Korean year-month format', () => {
    expect(formatMonthLabel('2026-05-13')).toBe('2026년 5월')
    expect(formatMonthLabel('2027-01-01')).toBe('2027년 1월')
  })
})
