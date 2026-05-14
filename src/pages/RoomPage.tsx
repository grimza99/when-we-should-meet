import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { CalendarGrid } from "../components/calendar/CalendarGrid";
import { NicknameModal } from "../components/room/NicknameModal";
import { RoomDashboard } from "../components/room/RoomDashboard";
import { Button } from "../components/ui/Button";
import { HomeBrandButton } from "../components/ui/HomeBrandButton";
import { SegmentedButtonGroup } from "../components/ui/SegmentedButtonGroup";
import { TextInput } from "../components/ui/TextInput";
import { ARIA_LABELS, getWeekdayRuleAriaLabel } from "../lib/ariaLabels";
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
  onShareRanking: () => Promise<void> | void;
  onResetSelection: () => Promise<void> | void;
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
  onShareRanking,
  onResetSelection,
  onSelectDate,
  onShareRoom,
  onToggleWeekday,
  room,
  roomSummary,
  selectedMode,
  weekdayOptions,
}: RoomPageProps) {
  const headerRef = useRef<HTMLElement | null>(null);
  const [nicknameInput, setNicknameInput] = useState(
    currentParticipant?.nickname ?? ""
  );
  const [isSavingNickname, setIsSavingNickname] = useState(false);
  const [isDeletingRoom, setIsDeletingRoom] = useState(false);
  const [isLeavingRoom, setIsLeavingRoom] = useState(false);
  const [isNicknameModalOpen, setIsNicknameModalOpen] = useState(true);
  const [dashboardStickyTop, setDashboardStickyTop] = useState(80);
  const [removingParticipantId, setRemovingParticipantId] = useState<
    string | null
  >(null);

  useEffect(() => {
    setNicknameInput(currentParticipant?.nickname ?? "");
  }, [currentParticipant?.nickname]);

  useEffect(() => {
    setIsNicknameModalOpen(true);
  }, [room?.id]);

  useEffect(() => {
    const headerElement = headerRef.current;

    if (!headerElement) {
      return;
    }

    const updateDashboardStickyTop = () => {
      setDashboardStickyTop(headerElement.offsetHeight + 8);
    };

    updateDashboardStickyTop();

    const resizeObserver = new ResizeObserver(() => {
      updateDashboardStickyTop();
    });

    resizeObserver.observe(headerElement);
    window.addEventListener("resize", updateDashboardStickyTop);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateDashboardStickyTop);
    };
  }, []);
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
      <main aria-label={ARIA_LABELS.room.page} className="page room-page">
        <HomeBrandButton
          ariaLabel={ARIA_LABELS.room.homeButton}
          onClick={onBackToLanding}
        />
        <section className="hero-card">
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
      <main aria-label={ARIA_LABELS.room.page} className="page room-page">
        <HomeBrandButton
          ariaLabel={ARIA_LABELS.room.homeButton}
          onClick={onBackToLanding}
        />
        <section className="hero-card">
          <h1>존재하지 않는 방입니다</h1>
          <p className="hero-copy">
            초대 코드를 다시 확인하거나 새 방을 만들어 주세요.
          </p>
        </section>
        <Button
          ariaLabel={ARIA_LABELS.room.homeButton}
          block
          onClick={onBackToLanding}
        >
          랜딩으로 돌아가기
        </Button>
      </main>
    );
  }

  const isRoomFull = room.participants.length >= room.maxParticipants;
  const shouldShowNicknameModal =
    !currentParticipant && !isRoomFull && isNicknameModalOpen;
  const trimmedNickname = nicknameInput.trim();
  const roomRangeLabel = formatRoomRange(room.startDate, room.endDate);
  const hasSelectionToReset = currentParticipant
    ? currentParticipant.weekdayRules.length > 0 ||
      Object.keys(currentParticipant.overrides).length > 0
    : false;

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
    <main
      aria-label={ARIA_LABELS.room.page}
      className="page room-page"
      style={
        {
          "--dashboard-sticky-top": `${dashboardStickyTop}px`,
        } as CSSProperties
      }
    >
      <header className="room-header" ref={headerRef}>
        <div className="room-header-top">
          <div className="brand-button-and-invite-code">
            <HomeBrandButton
              ariaLabel={ARIA_LABELS.room.homeButton}
              onClick={onBackToLanding}
            />
            <h1
              aria-label={ARIA_LABELS.room.inviteCodeHeading}
              className="room-title"
            >
              {room.inviteCode}
            </h1>
          </div>
          <div className="header-actions">
            <Button
              ariaLabel={ARIA_LABELS.room.copyInviteCodeButton}
              onClick={onCopyInviteCode}
              variant="chip"
            >
              입장 코드 복사
            </Button>
            <Button
              ariaLabel={ARIA_LABELS.room.shareRoomButton}
              onClick={onShareRoom}
              variant="chip"
            >
              공유
            </Button>
          </div>
        </div>
      </header>
      <RoomDashboard
        isCurrentUserHost={isCurrentUserHost}
        onRemoveParticipant={(participantId) =>
          void submitRemoveParticipant(participantId)
        }
        onShareRanking={() => void onShareRanking()}
        removingParticipantId={removingParticipantId}
        rankings={roomSummary.rankings}
        room={room}
        stickyTopOffset={dashboardStickyTop}
      />

      {currentParticipant && (
        <section className="controls-card">
          <div className="control-group">
            <p className="section-label">관리</p>
            <div className="nickname-edit-row">
              <TextInput
                ariaLabel={ARIA_LABELS.room.nicknameInput}
                label="닉네임"
                onChange={setNicknameInput}
                placeholder="새 닉네임"
                value={nicknameInput}
                inputStyle={{ minHeight: "40px" }}
              />
              <Button
                ariaLabel={ARIA_LABELS.room.nicknameSaveButton}
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
                ariaLabel={ARIA_LABELS.room.deleteRoomButton}
                block
                disabled={isDeletingRoom}
                onClick={() => void submitDeleteRoom()}
                variant="secondary"
              >
                {isDeletingRoom ? "삭제 중..." : "방 삭제"}
              </Button>
            ) : (
              <Button
                ariaLabel={ARIA_LABELS.room.leaveRoomButton}
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
            options={modeOptions.map((option) => ({
              ...option,
              ariaLabel:
                option.value === "available"
                  ? ARIA_LABELS.room.availableModeButton
                  : ARIA_LABELS.room.unavailableModeButton,
            }))}
            selectedValue={selectedMode}
          />
        </div>

        <div className="control-group weekday-control-group">
          <div className="weekday-row">
            {weekdayOptions.map((option) => (
              <button
                aria-label={getWeekdayRuleAriaLabel(option.label)}
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

      <section
        aria-label={ARIA_LABELS.room.calendarCard}
        className="calendar-card"
      >
        <p className="calendar-range-label">{roomRangeLabel}</p>
        <div className="calendar-header">
          <Button
            ariaLabel={ARIA_LABELS.room.previousMonthButton}
            onClick={() => onMoveMonth(-1)}
            variant="chip"
          >
            &lt;
          </Button>
          <strong>{roomSummary.monthLabel}</strong>
          <div className="calendar-header-actions">
            <button
              aria-label={ARIA_LABELS.room.resetSelectionButton}
              className="calendar-reset-button"
              disabled={!hasSelectionToReset}
              onClick={() => void onResetSelection()}
              type="button"
            >
              ↺
            </button>
            <Button
              ariaLabel={ARIA_LABELS.room.nextMonthButton}
              onClick={() => onMoveMonth(1)}
              variant="chip"
            >
              &gt;
            </Button>
          </div>
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
          <Button
            ariaLabel={ARIA_LABELS.room.homeButton}
            block
            onClick={onBackToLanding}
            variant="secondary"
          >
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

function formatRoomRange(startDate: string, endDate: string) {
  const start = parseDateOnly(startDate);
  const end = parseDateOnly(endDate);

  if (startDate === endDate) {
    return `${start.getMonth() + 1}월 ${start.getDate()}일`;
  }

  if (start.getFullYear() === end.getFullYear()) {
    return `${start.getMonth() + 1}월 ${start.getDate()}일 - ${end.getMonth() + 1}월 ${end.getDate()}일`;
  }

  return `${start.getFullYear()}년 ${start.getMonth() + 1}월 ${start.getDate()}일 - ${end.getFullYear()}년 ${end.getMonth() + 1}월 ${end.getDate()}일`;
}

function parseDateOnly(isoDate: string) {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(year, month - 1, day);
}
