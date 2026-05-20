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

describe('날짜 범위 계산', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 4, 1, 12))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('직접 지정 범위를 그대로 반환한다', () => {
    expect(resolveDateRange('custom', '2026-05-10', '2026-05-20')).toEqual({
      startDate: '2026-05-10',
      endDate: '2026-05-20',
    })
  })

  it('고정한 현재 날짜 기준으로 이번 달 범위를 계산한다', () => {
    expect(resolveDateRange('this_month', '', '')).toEqual({
      startDate: '2026-05-01',
      endDate: '2026-05-31',
    })
  })

  it('고정한 현재 날짜 기준으로 올해 범위를 계산한다', () => {
    expect(resolveDateRange('this_year', '', '')).toEqual({
      startDate: '2026-05-01',
      endDate: '2026-12-31',
    })
  })
})

describe('날짜 가능 여부 계산', () => {
  const room = createDateLogicRoom()
  const participantA = room.participants[0]
  const participantB = room.participants[1]

  it('가능 모드에서는 요일 규칙을 그대로 적용한다', () => {
    expect(isDateAvailable(participantA, '2026-05-11')).toBe(true)
    expect(isDateAvailable(participantA, '2026-05-12')).toBe(false)
  })

  it('불가능 모드에서는 요일 규칙을 제외 조건으로 적용한다', () => {
    expect(isDateAvailable(participantB, '2026-05-17')).toBe(false)
    expect(isDateAvailable(participantB, '2026-05-14')).toBe(true)
  })

  it('개별 날짜 오버라이드는 요일 규칙보다 우선한다', () => {
    expect(isDateAvailable(participantA, '2026-05-17')).toBe(true)
    expect(isDateAvailable(participantB, '2026-05-18')).toBe(false)
  })
})

describe('달력 셀 구성', () => {
  it('개수, 색상, 선택 상태를 포함한 6주 달력 그리드를 만든다', () => {
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

describe('랭킹 계산', () => {
  it('동점일 때도 순서가 고정된 상위 3개 날짜를 반환한다', () => {
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

describe('참가자 선택 모드 전환', () => {
  it('가능 모드에서 불가능 모드로 바꿔도 불가능한 날짜 집합을 유지한다', () => {
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

  it('불가능 모드에서 가능 모드로 바꿔도 가능한 날짜 집합을 유지한다', () => {
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

describe('월 이동 보조 함수', () => {
  it('보여줄 월을 방의 날짜 범위 안으로 고정한다', () => {
    const room = createRoom({
      startDate: '2026-05-10',
      endDate: '2026-07-20',
    })

    expect(clampVisibleMonth(room, '2026-04-01')).toBe('2026-05-01')
    expect(clampVisibleMonth(room, '2026-06-15')).toBe('2026-06-01')
    expect(clampVisibleMonth(room, '2026-08-01')).toBe('2026-07-01')
  })

  it('월 단위로 이동하고 매번 해당 월의 첫째 날로 정규화한다', () => {
    expect(addMonths('2026-01-15', 1)).toBe('2026-02-01')
    expect(addMonths('2026-12-20', 1)).toBe('2027-01-01')
    expect(addMonths('2026-05-10', -1)).toBe('2026-04-01')
  })

  it('월 헤더를 한국어 연월 형식으로 포맷한다', () => {
    expect(formatMonthLabel('2026-05-13')).toBe('2026년 5월')
    expect(formatMonthLabel('2027-01-01')).toBe('2027년 1월')
  })
})
