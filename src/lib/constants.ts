import type { AppStorage, DateMode } from '../types'


export const COLOR_PALETTE = [
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

export const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']

export const MODE_LABELS: Record<DateMode, string> = {
  available: '가능 날짜',
  unavailable: '불가능 날짜',
}

export const DEFAULT_STORAGE: AppStorage = {
  rooms: {},
  memberships: {},
}
