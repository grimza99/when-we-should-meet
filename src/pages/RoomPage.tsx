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
import { useToast } from "../components/shell/toast/toast-context";
import { getOrCreateClientKey } from "../lib/session/clientIdentity";
import { useCurrentParticipantUpdater } from "../hooks/useParticipant";
import { isFirebaseConfigured } from "../integrations/firebase/client";
import {
  resetParticipantSelections as resetFirebaseParticipantSelections,
  setParticipantDateOverride,
} from "../integrations/firebase/services/participant-service";
import { useRoomRender } from "../hooks/useRoomRender";
type RoomPageProps = {
  currentParticipant?: Participant;
  isCurrentUserHost?: boolean;
  room?: Room;
  roomSummary?: RoomSummary;
  onMoveMonth: (offset: number) => void;
};

export function RoomPage({
  currentParticipant,
  isCurrentUserHost = false,
  onMoveMonth,
  room,
  roomSummary,
}: RoomPageProps) {
  const headerRef = useRef<HTMLElement | null>(null);
  const { navigate, route } = useRouteState();
  const [storage] = useLocalStorageState();
  const routeRoomId = route.name === "room" ? route.roomId : undefined;
  const { isHydratingRoom } = useRoomRender({
    participant: currentParticipant,
    room,
    roomId: routeRoomId,
  });
  const [nicknameModalDismissedRoomId, setNicknameModalDismissedRoomId] =
    useState<string | null>(null);
  const [dashboardStickyTop, setDashboardStickyTop] = useState(80);
  const { showToast } = useToast();
  const updateCurrentParticipant = useCurrentParticipantUpdater();

  const localRoom = routeRoomId ? storage.rooms[routeRoomId] : undefined;
  const localParticipantId = routeRoomId
    ? storage.memberships[routeRoomId]
    : undefined;
  const effectiveRoom = localRoom ?? room;
  const effectiveCurrentParticipant =
    localRoom?.participants.find(
      (participant) => participant.id === localParticipantId
    ) ?? currentParticipant;

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
    !effectiveCurrentParticipant &&
    !isRoomFull &&
    nicknameModalDismissedRoomId !== effectiveRoom.id;
  const roomRangeLabel = formatRoomRange(
    effectiveRoom.startDate,
    effectiveRoom.endDate
  );
  const hasSelectionToReset = effectiveCurrentParticipant
    ? effectiveCurrentParticipant.weekdayRules.length > 0 ||
      Object.keys(effectiveCurrentParticipant.overrides).length > 0
    : false;

  const resetCurrentSelection = async () => {
    if (!effectiveCurrentParticipant) {
      return;
    }

    const hasSelectionToReset =
      effectiveCurrentParticipant.weekdayRules.length > 0 ||
      Object.keys(effectiveCurrentParticipant.overrides).length > 0;

    if (!hasSelectionToReset) {
      return;
    }

    const previousParticipant = effectiveCurrentParticipant;
    const updatedAt = new Date().toISOString();
    const nextParticipant = {
      ...effectiveCurrentParticipant,
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
        roomId: effectiveRoom.id,
      });
    } catch {
      updateCurrentParticipant(previousParticipant);
      showToast({
        msg: "선택 내용을 초기화하지 못했어요. 잠시 후 다시 시도해 주세요.",
      });
    }
  };

  const toggleDate = async (isoDate: string) => {
    if (!effectiveCurrentParticipant) {
      return;
    }

    if (isoDate < effectiveRoom.startDate || isoDate > effectiveRoom.endDate) {
      showToast({ msg: "방에서 정한 날짜 범위 안에서만 선택할 수 있어요." });
      return;
    }

    const previousParticipant = effectiveCurrentParticipant;
    const updatedAt = new Date().toISOString();
    const nextOverrides = { ...effectiveCurrentParticipant.overrides };
    const currentOverride = nextOverrides[isoDate];
    const nextStatus =
      currentOverride === effectiveCurrentParticipant.selectionMode
        ? null
        : effectiveCurrentParticipant.selectionMode;

    if (nextStatus === null) {
      delete nextOverrides[isoDate];
    } else {
      nextOverrides[isoDate] = nextStatus;
    }

    const nextParticipant = {
      ...effectiveCurrentParticipant,
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
        roomId: effectiveRoom.id,
        overrides: nextParticipant.overrides,
      });
    } catch {
      updateCurrentParticipant(previousParticipant);
      showToast({
        msg: "날짜 선택을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.",
      });
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
          room={effectiveRoom}
        />
      )}
      {effectiveCurrentParticipant && (
        <ControlSection
          room={effectiveRoom}
          participant={effectiveCurrentParticipant}
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
              onClick={() => void resetCurrentSelection()}
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
          onSelectDate={toggleDate}
        />
      </section>

      {!effectiveCurrentParticipant && isRoomFull && <RoomFullState />}

      {shouldShowNicknameModal && (
        <NicknameModal
          currentParticipant={effectiveCurrentParticipant}
          onClose={() => setNicknameModalDismissedRoomId(effectiveRoom.id)}
          room={effectiveRoom}
        />
      )}
    </main>
  );
}
