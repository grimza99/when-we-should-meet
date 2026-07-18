import { useMemo, useRef, useState, type CSSProperties } from "react";
import { CalendarGrid } from "../components/calendar/CalendarGrid";
import { NicknameModal } from "../components/roomPage/NicknameModal";
import { RoomDashboard } from "../components/room/RoomDashboard";
import { Button } from "../components/ui/Button";
import { HomeBrandButton } from "../components/ui/HomeBrandButton";
import { ARIA_LABELS } from "../lib/ariaLabels";
import { ControlSection } from "../components/roomPage/ControlSection";
import { useRouteState } from "../lib/router";
import ControlGroupSection from "../components/roomPage/ControlGroupSection";
import { formatRoomRange } from "../util";
import RoomFullState from "../components/roomPage/RoomFullState";
import { useLocalStorageState } from "../hooks/useLocalStorageState";
import { useRoomRender } from "../hooks/useRoomRender";
import { addMonths, clampVisibleMonth } from "../lib/date";
import { useRoomSummary } from "../hooks/useRoomSummary";
import HeaderSection from "../components/roomPage/HeaderSection";
import { useToast } from "../components/shell/toast/toast-context";
import { createRoomManagementActions } from "../lib/roomActions/createRoomManagementActions";
import { createRoomSelectionActions } from "../lib/roomActions/createRoomSelectionActions";
import { createRoomShareActions } from "../lib/roomActions/createRoomShareActions";

export function RoomPage() {
  const headerRef = useRef<HTMLElement | null>(null);
  const { navigate, route } = useRouteState();
  const [, setStorage] = useLocalStorageState();
  const [nicknameModalDismissedRoomId, setNicknameModalDismissedRoomId] =
    useState<string | null>(null);
  const [dashboardStickyTop, setDashboardStickyTop] = useState(80);
  const { showToast } = useToast();
  const { effectiveVisibleMonth, room, participant, roomSummary } =
    useRoomSummary({ route });

  const { isHydratingRoom } = useRoomRender({
    participant,
    room,
    roomId: room?.id ?? (route.name === "room" ? route.roomId : undefined),
  });
  const isCurrentUserHost = participant?.id === room?.hostClientKey;
  const actionContext = { navigate, setStorage, showToast };
  const { changeSelectionMode, resetSelections, toggleDate, toggleWeekday } =
    createRoomSelectionActions({
      context: actionContext,
      participant,
      room,
    });
  const { changeNickname, deleteRoom, leaveRoom, removeParticipant } =
    createRoomManagementActions({
      context: actionContext,
      isCurrentUserHost,
      participant,
      room,
    });
  const { copyInviteCode, shareRanking, shareRoom } = createRoomShareActions({
    context: { showToast },
    room,
    roomSummary,
  });

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
        <HomeBrandButton />
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
    return null;
  }

  const isRoomFull = room.participants.length >= room.maxParticipants;
  const shouldShowNicknameModal =
    !participant && !isRoomFull && nicknameModalDismissedRoomId !== room.id;
  const roomRangeLabel = formatRoomRange(room.startDate, room.endDate);

  const hasSelectionToReset = participant
    ? participant.weekdayRules.length > 0 ||
      Object.keys(participant.overrides).length > 0
    : false;

  const moveVisibleMonth = (offset: number) => {
    const nextVisibleMonth = clampVisibleMonth(
      room,
      addMonths(effectiveVisibleMonth || room.startDate, offset)
    );

    setStorage((previous) => ({
      ...previous,
      visibleMonthsByRoomId: {
        ...previous.visibleMonthsByRoomId,
        [room.id]: nextVisibleMonth,
      },
    }));
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
      <HeaderSection
        headerRef={headerRef}
        onCopyInviteCode={copyInviteCode}
        onShareRoom={shareRoom}
        room={room}
        setDashboardStickyTop={setDashboardStickyTop}
      />
      <RoomDashboard
        isCurrentUserHost={isCurrentUserHost}
        onRemoveParticipant={removeParticipant}
        onShareRanking={shareRanking}
        rankings={roomSummary.rankings}
        room={room}
        stickyTopOffset={dashboardStickyTop}
      />

      {participant && (
        <ControlGroupSection
          currentNickname={participant.nickname}
          isCurrentUserHost={isCurrentUserHost}
          onChangeNickname={changeNickname}
          onDeleteRoom={deleteRoom}
          onLeaveRoom={leaveRoom}
          participant={participant}
        />
      )}
      {participant && (
        <ControlSection
          onChangeSelectionMode={changeSelectionMode}
          onToggleWeekday={toggleWeekday}
          participant={participant}
        />
      )}
      <section
        aria-label={ARIA_LABELS.room.calendarCard}
        className="calendar-card"
      >
        <p className="calendar-range-label">{roomRangeLabel}</p>
        <div className="calendar-header">
          <Button
            ariaLabel={ARIA_LABELS.room.previousMonthButton}
            onClick={() => moveVisibleMonth(-1)}
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
              onClick={() => void resetSelections()}
              type="button"
            >
              ↺
            </button>
            <Button
              ariaLabel={ARIA_LABELS.room.nextMonthButton}
              onClick={() => moveVisibleMonth(1)}
              variant="chip"
            >
              &gt;
            </Button>
          </div>
        </div>

        <CalendarGrid
          days={roomSummary.calendarDays}
          rankByDate={rankByDate}
          onSelectDate={toggleDate}
        />
      </section>

      {!participant && isRoomFull && <RoomFullState />}

      {shouldShowNicknameModal && (
        <NicknameModal
          currentParticipant={participant}
          onClose={() => setNicknameModalDismissedRoomId(room.id)}
          room={room}
        />
      )}
    </main>
  );
}
