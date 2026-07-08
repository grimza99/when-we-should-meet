import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { CalendarGrid } from "../components/calendar/CalendarGrid";
import { NicknameModal } from "../components/roomPage/NicknameModal";
import { RoomDashboard } from "../components/room/RoomDashboard";
import { Button } from "../components/ui/Button";
import { HomeBrandButton } from "../components/ui/HomeBrandButton";
import { ARIA_LABELS } from "../lib/ariaLabels";
import type { AppStorage, Participant, Room, RoomSummary } from "../types";
import { ControlSection } from "../components/roomPage/ControlSection";
import InviteSection from "../components/roomPage/InviteSection";
import { useRouteState } from "../lib/router";
import ControlGroupSection from "../components/roomPage/ControlGroupSection";
import { useLocalStorageState } from "../hooks/useLocalStorageState";
import { DEFAULT_STORAGE, STORAGE_KEY } from "../lib/constants";

type RoomPageProps = {
  currentParticipant?: Participant;
  isCurrentUserHost?: boolean;
  isHydratingRoom?: boolean;
  room?: Room;
  roomSummary?: RoomSummary;
  onBackToLanding: () => void;
  onMoveMonth: (offset: number) => void;
  onRemoveParticipant: (participantId: string) => Promise<boolean>;
  onShareRanking: () => Promise<void> | void;
  onResetSelection: () => Promise<void> | void;
  onSelectDate: (isoDate: string) => void;
};

export function RoomPage({
  currentParticipant,
  isCurrentUserHost = false,
  isHydratingRoom = false,
  onBackToLanding,
  onMoveMonth,
  onRemoveParticipant,
  onShareRanking,
  onResetSelection,
  onSelectDate,
  room,
  roomSummary,
}: RoomPageProps) {
  const headerRef = useRef<HTMLElement | null>(null);
  const { route } = useRouteState();
  const [storage] = useLocalStorageState<AppStorage>(
    STORAGE_KEY,
    DEFAULT_STORAGE
  );

  const [isNicknameModalOpen, setIsNicknameModalOpen] = useState(true);
  const [dashboardStickyTop, setDashboardStickyTop] = useState(80);
  const [removingParticipantId, setRemovingParticipantId] = useState<
    string | null
  >(null);
  const localRoom =
    route.name === "room" ? storage.rooms[route.roomId] : undefined;
  const localParticipantId =
    route.name === "room" ? storage.memberships[route.roomId] : undefined;
  const effectiveRoom = localRoom ?? room;
  const effectiveCurrentParticipant =
    localRoom?.participants.find(
      (participant) => participant.id === localParticipantId
    ) ?? currentParticipant;

  useEffect(() => {
    setIsNicknameModalOpen(true);
  }, [effectiveRoom?.id]);

  useEffect(() => {
    if (effectiveCurrentParticipant) {
      setIsNicknameModalOpen(false);
    }
  }, [effectiveCurrentParticipant]);

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

  if (!effectiveRoom || !roomSummary) {
    return null;
  }

  const isRoomFull =
    effectiveRoom.participants.length >= effectiveRoom.maxParticipants;
  const shouldShowNicknameModal =
    !effectiveCurrentParticipant && !isRoomFull && isNicknameModalOpen;
  const roomRangeLabel = formatRoomRange(
    effectiveRoom.startDate,
    effectiveRoom.endDate
  );
  const hasSelectionToReset = effectiveCurrentParticipant
    ? effectiveCurrentParticipant.weekdayRules.length > 0 ||
      Object.keys(effectiveCurrentParticipant.overrides).length > 0
    : false;

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
              {effectiveRoom.inviteCode}
            </h1>
          </div>
          <InviteSection
            inviteCode={effectiveRoom.inviteCode}
            roomId={effectiveRoom.id}
          />
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
        room={effectiveRoom}
        stickyTopOffset={dashboardStickyTop}
      />

      {effectiveCurrentParticipant && (
        <ControlGroupSection
          currentNickname={effectiveCurrentParticipant.nickname}
          currentParticipant={effectiveCurrentParticipant}
          roomId={effectiveRoom.id}
        />
      )}
      <ControlSection />
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
          <strong aria-label={ARIA_LABELS.room.monthHeading}>
            {roomSummary.monthLabel}
          </strong>
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

      {!effectiveCurrentParticipant && isRoomFull && (
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
          currentParticipant={effectiveCurrentParticipant}
          onClose={() => setIsNicknameModalOpen(false)}
          room={effectiveRoom}
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
    return `${start.getMonth() + 1}월 ${start.getDate()}일 - ${
      end.getMonth() + 1
    }월 ${end.getDate()}일`;
  }

  return `${start.getFullYear()}년 ${
    start.getMonth() + 1
  }월 ${start.getDate()}일 - ${end.getFullYear()}년 ${
    end.getMonth() + 1
  }월 ${end.getDate()}일`;
}

function parseDateOnly(isoDate: string) {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(year, month - 1, day);
}
