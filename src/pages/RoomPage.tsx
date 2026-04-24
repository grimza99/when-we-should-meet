import { useEffect, useMemo, useState } from "react";
import { CalendarGrid } from "../components/calendar/CalendarGrid";
import { NicknameModal } from "../components/room/NicknameModal";
import { RoomDashboard } from "../components/room/RoomDashboard";
import { Button } from "../components/ui/Button";
import { SegmentedButtonGroup } from "../components/ui/SegmentedButtonGroup";
import { TextInput } from "../components/ui/TextInput";
import type { DateMode, Participant, Room, RoomSummary } from "../types";

type ModeOption = { label: string; value: DateMode };
type WeekdayOption = { label: string; value: number; selected: boolean };

type RoomPageProps = {
  currentParticipant?: Participant;
  isCurrentUserHost?: boolean;
  isHydratingRoom?: boolean;
  modeOptions: ModeOption[];
  room?: Room;
  roomSummary?: RoomSummary;
  roomMessage: string;
  selectedMode: DateMode;
  weekdayOptions: WeekdayOption[];
  onBackToLanding: () => void;
  onChangeMode: (mode: DateMode) => void;
  onChangeNickname: (nickname: string) => Promise<boolean>;
  onCopyInviteCode: () => void;
  onDeleteRoom: () => Promise<boolean>;
  onJoinRoom: (nickname: string) => Promise<boolean>;
  onLeaveRoom: () => Promise<boolean>;
  onMoveMonth: (offset: number) => void;
  onRemoveParticipant: (participantId: string) => Promise<boolean>;
  onSelectDate: (isoDate: string) => void;
  onShareRoom: () => void;
  onToggleWeekday: (weekday: number) => void;
};

export function RoomPage({
  currentParticipant,
  isCurrentUserHost = false,
  isHydratingRoom = false,
  modeOptions,
  onBackToLanding,
  onChangeMode,
  onChangeNickname,
  onCopyInviteCode,
  onDeleteRoom,
  onJoinRoom,
  onLeaveRoom,
  onMoveMonth,
  onRemoveParticipant,
  onSelectDate,
  onShareRoom,
  onToggleWeekday,
  room,
  roomMessage,
  roomSummary,
  selectedMode,
  weekdayOptions,
}: RoomPageProps) {
  const [nicknameInput, setNicknameInput] = useState(
    currentParticipant?.nickname ?? ""
  );
  const [isSavingNickname, setIsSavingNickname] = useState(false);
  const [isDeletingRoom, setIsDeletingRoom] = useState(false);
  const [isLeavingRoom, setIsLeavingRoom] = useState(false);
  const [isNicknameModalOpen, setIsNicknameModalOpen] = useState(true);
  const [removingParticipantId, setRemovingParticipantId] = useState<
    string | null
  >(null);

  useEffect(() => {
    setNicknameInput(currentParticipant?.nickname ?? "");
  }, [currentParticipant?.nickname]);

  useEffect(() => {
    setIsNicknameModalOpen(true);
  }, [room?.id]);
  const rankByDate = useMemo(
    () =>
      Object.fromEntries(
        roomSummary?.rankings
          .filter((ranking) => ranking.score > 0)
          .map((ranking) => [ranking.date, ranking.rank]) ?? []
      ),
    [roomSummary?.rankings]
  );

  if (isHydratingRoom) {
    return (
      <main className="page room-page">
        <section className="hero-card">
          <p className="eyebrow">loading room</p>
          <h1>방 정보를 불러오는 중입니다</h1>
          <p className="hero-copy">
            공유 링크와 참가자 정보를 확인하고 있어요.
          </p>
        </section>
      </main>
    );
  }

  if (!room || !roomSummary) {
    return (
      <main className="page room-page">
        <section className="hero-card">
          <p className="eyebrow">room not found</p>
          <h1>존재하지 않는 방입니다</h1>
          <p className="hero-copy">
            초대 코드를 다시 확인하거나 새 방을 만들어 주세요.
          </p>
        </section>
        <Button block onClick={onBackToLanding}>
          랜딩으로 돌아가기
        </Button>
      </main>
    );
  }

  const isRoomFull = room.participants.length >= room.maxParticipants;
  const shouldShowNicknameModal =
    !currentParticipant && !isRoomFull && isNicknameModalOpen;
  const trimmedNickname = nicknameInput.trim();

  const submitNicknameChange = async () => {
    if (!trimmedNickname || isSavingNickname) {
      return;
    }

    setIsSavingNickname(true);

    try {
      await onChangeNickname(trimmedNickname);
    } finally {
      setIsSavingNickname(false);
    }
  };

  const submitRemoveParticipant = async (participantId: string) => {
    if (removingParticipantId) {
      return;
    }

    setRemovingParticipantId(participantId);

    try {
      await onRemoveParticipant(participantId);
    } finally {
      setRemovingParticipantId(null);
    }
  };

  const submitDeleteRoom = async () => {
    if (
      isDeletingRoom ||
      !window.confirm("이 방과 참가자 정보를 모두 삭제할까요?")
    ) {
      return;
    }

    setIsDeletingRoom(true);

    try {
      await onDeleteRoom();
    } finally {
      setIsDeletingRoom(false);
    }
  };

  const submitLeaveRoom = async () => {
    if (
      isLeavingRoom ||
      !window.confirm(
        "이 방에서 나가면 선택한 날짜도 함께 사라집니다. 나갈까요?"
      )
    ) {
      return;
    }

    setIsLeavingRoom(true);

    try {
      await onLeaveRoom();
    } finally {
      setIsLeavingRoom(false);
    }
  };

  return (
    <main className="page room-page">
      <header className="room-header">
        <h1 className="room-title">{room.inviteCode}</h1>
        <div className="header-actions">
          <Button onClick={onCopyInviteCode} variant="chip">
            입장 코드 복사
          </Button>
          <Button onClick={onShareRoom} variant="chip">
            공유
          </Button>
        </div>
      </header>

      {roomMessage && <p className="inline-feedback">{roomMessage}</p>}

      <RoomDashboard
        isCurrentUserHost={isCurrentUserHost}
        onRemoveParticipant={(participantId) =>
          void submitRemoveParticipant(participantId)
        }
        removingParticipantId={removingParticipantId}
        rankings={roomSummary.rankings}
        room={room}
      />

      {currentParticipant && (
        <section className="controls-card">
          <div className="control-group">
            <p className="section-label">관리</p>
            <div className="nickname-edit-row">
              <TextInput
                label="닉네임"
                onChange={setNicknameInput}
                placeholder="새 닉네임"
                value={nicknameInput}
                inputStyle={{ minHeight: "40px" }}
              />
              <Button
                disabled={
                  !trimmedNickname ||
                  trimmedNickname === currentParticipant.nickname ||
                  isSavingNickname
                }
                onClick={() => void submitNicknameChange()}
                variant="secondary"
                style={{ minHeight: "40px" }}
              >
                {isSavingNickname ? "저장 중..." : "변경"}
              </Button>
            </div>
          </div>

          <div className="control-group danger-zone">
            {isCurrentUserHost ? (
              <Button
                block
                disabled={isDeletingRoom}
                onClick={() => void submitDeleteRoom()}
                variant="secondary"
              >
                {isDeletingRoom ? "삭제 중..." : "방 삭제"}
              </Button>
            ) : (
              <Button
                block
                disabled={isLeavingRoom}
                onClick={() => void submitLeaveRoom()}
                variant="secondary"
              >
                {isLeavingRoom ? "나가는 중..." : "방 나가기"}
              </Button>
            )}
          </div>
        </section>
      )}

      <section className="controls-card">
        <div className="control-group">
          <p className="section-label">선택 필터</p>
          <SegmentedButtonGroup
            onChange={onChangeMode}
            options={modeOptions}
            selectedValue={selectedMode}
          />
        </div>

        <div className="control-group weekday-control-group">
          <div className="weekday-row">
            {weekdayOptions.map((option) => (
              <button
                key={option.value}
                className={`day-chip${option.selected ? " is-active" : ""}`}
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

      {!currentParticipant && isRoomFull && (
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
      )}

      {shouldShowNicknameModal && (
        <NicknameModal
          onClose={() => setIsNicknameModalOpen(false)}
          onJoinRoom={onJoinRoom}
        />
      )}
    </main>
  );
}
