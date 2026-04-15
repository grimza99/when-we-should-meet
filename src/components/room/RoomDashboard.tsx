import { COLOR_PALETTE } from '../../lib/constants'
import type { Participant, RankingItem, Room } from '../../types'
import { Button } from '../ui/Button'

type RoomDashboardProps = {
  rankings: RankingItem[]
  room: Room
  currentParticipant?: Participant
}

export function RoomDashboard({
  currentParticipant,
  rankings,
  room,
}: RoomDashboardProps) {
  return (
    <section className="dashboard-card">
      <div className="dashboard-head">
        <div>
          <p className="section-label">대시보드</p>
          <strong>가장 많이 가능한 날짜</strong>
        </div>
        <Button variant="chip">실시간 요약</Button>
      </div>

      <div className="ranking-list">
        {rankings.map((ranking) => (
          <div key={ranking.date} className="ranking-item">
            <span>#{ranking.rank}</span>
            <strong>{ranking.label}</strong>
            <small>{ranking.score}명 가능</small>
          </div>
        ))}
      </div>

      <div className="participant-row">
        {room.participants.map((participant) => (
          <span
            key={participant.id}
            className={`participant-pill${
              currentParticipant?.id === participant.id ? ' is-current-user' : ''
            }`}
            style={{ color: COLOR_PALETTE[participant.colorIndex] }}
          >
            {participant.nickname}
          </span>
        ))}
      </div>
    </section>
  )
}
