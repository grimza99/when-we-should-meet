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
import type { Participant, Room, RoomSummary } from "../types";
import { ControlSection } from "../components/roomPage/ControlSection";
import InviteSection from "../components/roomPage/InviteSection";
import { useRouteState } from "../lib/router";
import ControlGroupSection from "../components/roomPage/ControlGroupSection";
import { useLocalStorageState } from "../hooks/useLocalStorageState";
import { formatRoomRange } from "../util";
import RoomFullState from "../components/roomPage/RoomFullState";

type RoomPageProps = {
  currentParticipant?: Participant;
  isCurrentUserHost?: boolean;
  isHydratingRoom?: boolean;
  room?: Room;
  roomSummary?: RoomSummary;
  onMoveMonth: (offset: number) => void;
  onResetSelection: () => Promise<void> | void;
  onSelectDate: (isoDate: string) => void;
};

export function RoomPage({
  currentParticipant,
  isCurrentUserHost = false,
  isHydratingRoom = false,
  onMoveMonth,
  onResetSelection,
  onSelectDate,
  room,
  roomSummary,
}: RoomPageProps) {
  const headerRef = useRef<HTMLElement | null>(null);
  const { navigate, route } = useRouteState();
  const [storage] = useLocalStorageState();

  const [isNicknameModalOpen, setIsNicknameModalOpen] = useState(true);
  const [dashboardStickyTop, setDashboardStickyTop] = useState(80);

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
          onClick={() => navigate({ name: "landing" })}
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
              onClick={() => navigate({ name: "landing" })}
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
        rankings={roomSummary.rankings}
        room={effectiveRoom}
        stickyTopOffset={dashboardStickyTop}
        roomSummary={roomSummary}
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

      {!effectiveCurrentParticipant && isRoomFull && <RoomFullState />}

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
