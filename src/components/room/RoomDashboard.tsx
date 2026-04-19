import { useState } from 'react'
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
  const [isExpanded, setIsExpanded] = useState(false)
  const participantCount = room.participants.length
  const hasRankings = rankings.some((ranking) => ranking.score > 0)
  const topRanking = hasRankings ? rankings[0] : undefined

  return (
    <section className="dashboard-card">
      <div className="dashboard-head">
        <div>
          <p className="section-label">대시보드</p>
          <strong>가장 많이 가능한 날짜</strong>
          {topRanking ? (
            <p className="dashboard-summary">
              1위 {topRanking.label} · {topRanking.score}명 가능
            </p>
          ) : (
            <p className="dashboard-summary">아직 모인 날짜 선택이 없어요.</p>
          )}
          <p className="dashboard-meta">
            {participantCount} / {room.maxParticipants}명 참여 중
          </p>
        </div>
        <Button onClick={() => setIsExpanded((value) => !value)} variant="chip">
          {isExpanded ? '접기' : '펼치기'}
        </Button>
      </div>

      <div className={`dashboard-content${isExpanded ? ' is-expanded' : ''}`}>
        <div className="dashboard-content-inner">
          {hasRankings ? (
            <div className="ranking-list">
              {rankings.map((ranking) => (
                <div key={ranking.date} className="ranking-item">
                  <span>#{ranking.rank}</span>
                  <strong>{ranking.label}</strong>
                  <small>{ranking.score}명 가능</small>
                </div>
              ))}
            </div>
          ) : (
            <div className="dashboard-empty-state">
              아직 모인 날짜 선택이 없어요. 먼저 참가자들이 닉네임을 입력하고 달력에서
              가능한 날짜를 골라보세요.
            </div>
          )}

          {participantCount > 0 ? (
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
          ) : (
            <p className="participant-empty-state">
              아직 참가자가 없어요. 초대 코드를 공유해 일정을 같이 맞춰보세요.
            </p>
          )}
        </div>
      </div>
    </section>
  )
}
