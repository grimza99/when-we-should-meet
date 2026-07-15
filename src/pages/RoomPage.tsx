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
import { useToast } from "../components/shell/toast/toast-context";
import { getOrCreateClientKey } from "../lib/session/clientIdentity";
import { useCurrentParticipantUpdater } from "../hooks/useParticipant";
import { isFirebaseConfigured } from "../integrations/firebase/client";
import {
  resetParticipantSelections as resetFirebaseParticipantSelections,
  setParticipantDateOverride,
} from "../integrations/firebase/services/participant-service";
import { useLocalStorageState } from "../hooks/useLocalStorageState";
import { useRoomRender } from "../hooks/useRoomRender";
import { addMonths, clampVisibleMonth } from "../lib/date";
import { useRoomSummary } from "../hooks/useRoomSummary";
import HeaderSection from "../components/roomPage/HeaderSection";

export function RoomPage() {
  const headerRef = useRef<HTMLElement | null>(null);
  const { navigate, route } = useRouteState();
  const [, setStorage] = useLocalStorageState();
  const [nicknameModalDismissedRoomId, setNicknameModalDismissedRoomId] =
    useState<string | null>(null);
  const [dashboardStickyTop, setDashboardStickyTop] = useState(80);
  const { showToast } = useToast();
  const updateCurrentParticipant = useCurrentParticipantUpdater();
  const { effectiveVisibleMonth, room, participant, roomSummary } =
    useRoomSummary({ route });

  const { isHydratingRoom } = useRoomRender({
    participant,
    room,
    roomId: room?.id ?? (route.name === "room" ? route.roomId : undefined),
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

  if (!room || !roomSummary) {
    return null;
  }

  const isRoomFull = room.participants.length >= room.maxParticipants;
  const shouldShowNicknameModal =
    !participant && !isRoomFull && nicknameModalDismissedRoomId !== room.id;
  const roomRangeLabel = formatRoomRange(room.startDate, room.endDate);
  const isCurrentUserHost = participant?.id === room.hostClientKey;

  const hasSelectionToReset = participant
    ? participant.weekdayRules.length > 0 ||
      Object.keys(participant.overrides).length > 0
    : false;

  const resetCurrentSelection = async () => {
    if (!participant) {
      return;
    }

    const previousParticipant = participant;
    const updatedAt = new Date().toISOString();
    const nextParticipant = {
      ...participant,
      overrides: {},
      updatedAt,
      weekdayRules: [],
    };

    updateCurrentParticipant(nextParticipant);
    showToast({ msg: "선택한 날짜와 요일 규칙을 초기화했어요." });

    if (!isFirebaseConfigured) {
      return;
    }

    try {
      await resetFirebaseParticipantSelections({
        clientKey: getOrCreateClientKey(),
        participantId: nextParticipant.id,
        roomId: room.id,
      });
    } catch {
      updateCurrentParticipant(previousParticipant);
      showToast({
        msg: "선택 내용을 초기화하지 못했어요. 잠시 후 다시 시도해 주세요.",
      });
    }
  };

  const toggleDate = async (isoDate: string) => {
    if (!participant) {
      return;
    }

    if (isoDate < room.startDate || isoDate > room.endDate) {
      showToast({ msg: "방에서 정한 날짜 범위 안에서만 선택할 수 있어요." });
      return;
    }

    const previousParticipant = participant;
    const updatedAt = new Date().toISOString();
    const nextOverrides = { ...participant.overrides };
    const currentOverride = nextOverrides[isoDate];
    const nextStatus =
      currentOverride === participant.selectionMode
        ? null
        : participant.selectionMode;

    if (nextStatus === null) {
      delete nextOverrides[isoDate];
    } else {
      nextOverrides[isoDate] = nextStatus;
    }

    const nextParticipant = {
      ...participant,
      overrides: nextOverrides,
      updatedAt,
    };

    updateCurrentParticipant(nextParticipant);

    if (!isFirebaseConfigured) {
      return;
    }

    try {
      await setParticipantDateOverride({
        clientKey: getOrCreateClientKey(),
        participantId: nextParticipant.id,
        roomId: room.id,
        overrides: nextParticipant.overrides,
      });
    } catch {
      updateCurrentParticipant(previousParticipant);
      showToast({
        msg: "날짜 선택을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.",
      });
    }
  };

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
        room={room}
        setDashboardStickyTop={setDashboardStickyTop}
      />
      <RoomDashboard
        isCurrentUserHost={isCurrentUserHost}
        rankings={roomSummary.rankings}
        room={room}
        stickyTopOffset={dashboardStickyTop}
        roomSummary={roomSummary}
      />

      {participant && (
        <ControlGroupSection
          currentNickname={participant.nickname}
          currentParticipant={participant}
          roomId={room.id}
          room={room}
        />
      )}
      {participant && <ControlSection room={room} participant={participant} />}
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
              onClick={() => void resetCurrentSelection()}
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
