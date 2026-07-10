import { useEffect, useMemo, useState } from "react";
import { useLocalStorageState } from "../hooks/useLocalStorageState";
import {
  addMonths,
  buildCalendarDays,
  buildRankings,
  clampVisibleMonth,
  formatMonthLabel,
} from "../lib/date";
import { useRouteState } from "../lib/router";
import { isFirebaseConfigured } from "../integrations/firebase/client";

export function useAppState() {
  const { navigate, route } = useRouteState();
  const [storage] = useLocalStorageState();
  const [visibleMonth, setVisibleMonth] = useState("");

  const currentRoom =
    route.name === "room" ? storage.rooms[route.roomId] : undefined;
  const currentParticipantId =
    route.name === "room" ? storage.memberships[route.roomId] : undefined;
  const currentParticipant = currentRoom?.participants.find(
    (participant) => participant.id === currentParticipantId
  );

  const isCurrentUserHost =
    Boolean(currentParticipantId) &&
    currentParticipantId === currentRoom?.hostClientKey;
  const effectiveVisibleMonth = currentRoom
    ? clampVisibleMonth(currentRoom, visibleMonth || currentRoom.startDate)
    : "";
  const hasCurrentRoom = Boolean(currentRoom);

  const currentRoomSummary = useMemo(() => {
    if (!currentRoom) {
      return undefined;
    }

    return {
      monthLabel: formatMonthLabel(effectiveVisibleMonth),
      rankings: buildRankings(currentRoom),
      calendarDays: buildCalendarDays(
        currentRoom,
        currentParticipant?.id,
        effectiveVisibleMonth
      ),
    };
  }, [currentParticipant?.id, currentRoom, effectiveVisibleMonth]);

  useEffect(() => {
    if (route.name !== "room" || isFirebaseConfigured || hasCurrentRoom) {
      return;
    }

    navigate({ name: "not-found-room" }, { replace: true });
  }, [hasCurrentRoom, navigate, route]);

  const moveVisibleMonth = (offset: number) => {
    if (!currentRoom) {
      return;
    }

    setVisibleMonth((previous) =>
      clampVisibleMonth(
        currentRoom,
        addMonths(previous || currentRoom.startDate, offset)
      )
    );
  };

  return {
    currentParticipant,
    currentRoom,
    currentRoomSummary,
    isCurrentUserHost,
    moveVisibleMonth,
    setVisibleMonth: (date: string) => setVisibleMonth(date),
  };
}
