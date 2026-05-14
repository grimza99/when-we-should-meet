export const ARIA_LABELS = {
  toast: "전역 알림 토스트",
  landing: {
    page: "랜딩 페이지",
    heading: "랜딩 페이지 제목",
    logo: "서비스 로고 이미지",
    createOrJoinSection: "방 생성 및 참여 섹션",
    featureSection: "서비스 특징 섹션",
    createRoomButton: "방 만들기 버튼",
    inviteCodeInput: "초대 코드 입력 필드",
    joinRoomButton: "초대 코드 참여 버튼",
  },
  createRoom: {
    dialog: "방 생성 모달",
    participantCountInput: "참여 인원 입력 필드",
    thisMonthRangeButton: "이번 달 범위 버튼",
    thisYearRangeButton: "이번 년 범위 버튼",
    customRangeButton: "직접 지정 범위 버튼",
    startDateInput: "시작일 입력 필드",
    endDateInput: "종료일 입력 필드",
    submitButton: "방 생성 제출 버튼",
  },
  nickname: {
    dialog: "닉네임 입력 모달",
    input: "닉네임 입력 필드",
    submitButton: "닉네임 입장 버튼",
  },
  room: {
    page: "방 페이지",
    restrictedPage: "방 접근 제한 페이지",
    homeButton: "랜딩으로 돌아가기 버튼",
    inviteCodeHeading: "방 초대 코드 헤더",
    copyInviteCodeButton: "입장 코드 복사 버튼",
    shareRoomButton: "방 공유 버튼",
    shareRankingButton: "랭킹 공유 버튼",
    availableModeButton: "가능 날짜 모드 버튼",
    unavailableModeButton: "불가능 날짜 모드 버튼",
    previousMonthButton: "이전 달 이동 버튼",
    nextMonthButton: "다음 달 이동 버튼",
    resetSelectionButton: "선택 초기화 버튼",
    calendarCard: "달력 카드",
    nicknameInput: "닉네임 변경 입력 필드",
    nicknameSaveButton: "닉네임 변경 저장 버튼",
    deleteRoomButton: "방 삭제 버튼",
    leaveRoomButton: "방 나가기 버튼",
  },
} as const

export function getCalendarDayAriaLabel(isoDate: string) {
  return `${isoDate} 날짜 선택 버튼`
}

export function getWeekdayRuleAriaLabel(label: string) {
  return `${label}요일 규칙 버튼`
}

export function getParticipantRemoveAriaLabel(nickname: string) {
  return `${nickname} 참가자 삭제 버튼`
}
