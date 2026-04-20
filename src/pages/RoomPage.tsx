import { useMemo } from 'react'
import { CalendarGrid } from '../components/calendar/CalendarGrid'
import { NicknameModal } from '../components/room/NicknameModal'
import { RoomDashboard } from '../components/room/RoomDashboard'
import { Button } from '../components/ui/Button'
import { SegmentedButtonGroup } from '../components/ui/SegmentedButtonGroup'
import type { DateMode, Participant, Room, RoomSummary } from '../types'

type ModeOption = { label: string; value: DateMode }
type WeekdayOption = { label: string; value: number; selected: boolean }

type RoomPageProps = {
  currentParticipant?: Participant
  isHydratingRoom?: boolean
  modeOptions: ModeOption[]
  room?: Room
  roomSummary?: RoomSummary
  roomMessage: string
  selectedMode: DateMode
  weekdayOptions: WeekdayOption[]
  onBackToLanding: () => void
  onChangeMode: (mode: DateMode) => void
  onCopyInviteCode: () => void
  onJoinRoom: (nickname: string) => Promise<boolean>
  onMoveMonth: (offset: number) => void
  onSelectDate: (isoDate: string) => void
  onShareRoom: () => void
  onToggleWeekday: (weekday: number) => void
}

export function RoomPage({
  currentParticipant,
  isHydratingRoom = false,
  modeOptions,
  onBackToLanding,
  onChangeMode,
  onCopyInviteCode,
  onJoinRoom,
  onMoveMonth,
  onSelectDate,
  onShareRoom,
  onToggleWeekday,
  room,
  roomMessage,
  roomSummary,
  selectedMode,
  weekdayOptions,
}: RoomPageProps) {
  const rankByDate = useMemo(
    () =>
      Object.fromEntries(
        roomSummary?.rankings
          .filter((ranking) => ranking.score > 0)
          .map((ranking) => [ranking.date, ranking.rank]) ?? [],
      ),
    [roomSummary?.rankings],
  )

  if (isHydratingRoom) {
    return (
      <main className="page room-page">
        <section className="hero-card">
          <p className="eyebrow">loading room</p>
          <h1>방 정보를 불러오는 중입니다</h1>
          <p className="hero-copy">공유 링크와 참가자 정보를 확인하고 있어요.</p>
        </section>
      </main>
    )
  }

  if (!room || !roomSummary) {
    return (
      <main className="page room-page">
        <section className="hero-card">
          <p className="eyebrow">room not found</p>
          <h1>존재하지 않는 방입니다</h1>
          <p className="hero-copy">초대 코드를 다시 확인하거나 새 방을 만들어 주세요.</p>
        </section>
        <Button block onClick={onBackToLanding}>
          랜딩으로 돌아가기
        </Button>
      </main>
    )
  }

  const isRoomFull = room.participants.length >= room.maxParticipants
  const shouldShowNicknameModal = !currentParticipant && !isRoomFull

  return (
    <main className="page room-page">
      <header className="room-header">
        <div>
          <p className="eyebrow">room code</p>
          <h1 className="room-title">{room.inviteCode}</h1>
        </div>
        <div className="header-actions">
          <Button onClick={onCopyInviteCode} variant="chip">
            복사
          </Button>
          <Button onClick={onShareRoom} variant="chip">
            공유
          </Button>
        </div>
      </header>

      {roomMessage ? <p className="inline-feedback">{roomMessage}</p> : null}

      <RoomDashboard
        currentParticipant={currentParticipant}
        rankings={roomSummary.rankings}
        room={room}
      />

      <section className="controls-card">
        <div className="control-group">
          <p className="section-label">선택 방식</p>
          <SegmentedButtonGroup
            onChange={onChangeMode}
            options={modeOptions}
            selectedValue={selectedMode}
          />
        </div>

        <div className="control-group">
          <p className="section-label">요일 일괄 적용</p>
          <div className="weekday-row">
            {weekdayOptions.map((option) => (
              <button
                key={option.value}
                className={`day-chip${option.selected ? ' is-active' : ''}`}
                onClick={() => onToggleWeekday(option.value)}
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="calendar-card">
        <div className="calendar-header">
          <Button onClick={() => onMoveMonth(-1)} variant="chip">
            &lt;
          </Button>
          <strong>{roomSummary.monthLabel}</strong>
          <Button onClick={() => onMoveMonth(1)} variant="chip">
            &gt;
          </Button>
        </div>

        <CalendarGrid
          days={roomSummary.calendarDays}
          rankByDate={rankByDate}
          onSelectDate={onSelectDate}
        />
      </section>

      {!currentParticipant && isRoomFull ? (
        <section className="panel stack-gap">
          <p className="eyebrow">room is full</p>
          <h2>이 방은 정원이 모두 찼어요</h2>
          <p className="hero-copy">
            방 만든 사람에게 정원 추가를 요청하거나, 새 방을 만들어 일정을 다시
            조율해 주세요.
          </p>
          <Button block onClick={onBackToLanding} variant="secondary">
            랜딩으로 돌아가기
          </Button>
        </section>
      ) : null}

      {shouldShowNicknameModal ? <NicknameModal onJoinRoom={onJoinRoom} /> : null}
    </main>
  )
}
