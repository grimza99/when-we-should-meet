import { useId } from "react";
import { COLOR_PALETTE } from "../../lib/constants";
import type { RankingItem, Room } from "../../types";

type RoomDashboardProps = {
  rankings: RankingItem[];
  room: Room;
  isCurrentUserHost?: boolean;
  onRemoveParticipant?: (participantId: string) => void;
  removingParticipantId?: string | null;
};

export function RoomDashboard({
  isCurrentUserHost = false,
  onRemoveParticipant,
  removingParticipantId = null,
  rankings,
  room,
}: RoomDashboardProps) {
  const dashboardContentId = useId();
  const participantCount = room.participants.length;
  const hasRankings = rankings.some((ranking) => ranking.score > 0);
  const topRanking = hasRankings ? rankings[0] : undefined;
  const participants = room.participants.map((participant) => ({
    ...participant,
    color: COLOR_PALETTE[participant.colorIndex] ?? COLOR_PALETTE[0],
  }));

  return (
    <section className="dashboard-card">
      <div className="dashboard-head">
        <div>
          <strong>선호 날짜 TOP3</strong>
          {!topRanking && (
            <p className="dashboard-summary">아직 모인 날짜 선택이 없어요.</p>
          )}
        </div>
      </div>

      <div className={`dashboard-content is-expanded`} id={dashboardContentId}>
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
              아직 모인 날짜 선택이 없어요. 먼저 참가자들이 닉네임을 입력하고
              달력에서 가능한 날짜를 골라보세요.
            </div>
          )}

          {participantCount > 0 ? (
            <div className="participant-list">
              {participants.map((participant) => (
                <div key={participant.id} className={`participant-pill`}>
                  <span className="participant-name-with-dot">
                    <span
                      aria-hidden="true"
                      className="participant-color-dot"
                      style={{ background: participant.color }}
                    />
                    <span style={{ color: participant.color }}>
                      {participant.nickname}
                    </span>
                    {participant.id === room.hostClientKey && (
                      <small className="host-badge">👑</small>
                    )}
                  </span>
                  {isCurrentUserHost &&
                    participant.id !== room.hostClientKey && (
                      <button
                        className="text-icon-button"
                        disabled={removingParticipantId === participant.id}
                        onClick={() => onRemoveParticipant?.(participant.id)}
                      >
                        {removingParticipantId !== participant.id && "삭제"}
                      </button>
                    )}
                </div>
              ))}
            </div>
          ) : (
            <p className="participant-empty-state">
              아직 참가자가 없어요. 초대 코드를 공유해 일정을 같이 맞춰보세요.
            </p>
          )}
          <p className="dashboard-meta">
            {participantCount} / {room.maxParticipants}명 참여 중
          </p>
        </div>
      </div>
    </section>
  );
}
