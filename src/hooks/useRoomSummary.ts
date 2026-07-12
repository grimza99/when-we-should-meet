import { useEffect, useMemo } from "react";
import { useRouteState } from "../lib/router";
import { useLocalStorageState } from "./useLocalStorageState";
import { isFirebaseConfigured } from "../integrations/firebase/client";
import type { RoomSummary, RouteState } from "../types";
import {
  buildCalendarDays,
  buildRankings,
  clampVisibleMonth,
  formatMonthLabel,
} from "../lib/date";

interface IUseRoomSummary {
  route: RouteState;
  visibleMonth: string;
}
export const useRoomSummary = ({ route, visibleMonth }: IUseRoomSummary) => {
  const { navigate } = useRouteState();
  const [storage] = useLocalStorageState();

  const room = route.name === "room" ? storage.rooms[route.roomId] : undefined;
  const participantId =
    route.name === "room" ? storage.memberships[route.roomId] : undefined;
  const participant = room?.participants.find(
    (participant) => participant.id === participantId
  );

  useEffect(() => {
    if (route.name !== "room" || isFirebaseConfigured || room) {
      return;
    }

    navigate({ name: "not-found-room" }, { replace: true });
  }, [room, navigate, route]);

  const effectiveVisibleMonth = room
    ? clampVisibleMonth(room, visibleMonth || room.startDate)
    : "";

  const roomSummary = useMemo<RoomSummary | undefined>(() => {
    if (!room) {
      return undefined;
    }

    return {
      calendarDays: buildCalendarDays(
        room,
        participant?.id,
        effectiveVisibleMonth
      ),
      monthLabel: formatMonthLabel(effectiveVisibleMonth),
      rankings: buildRankings(room),
    };
  }, [participant?.id, room, effectiveVisibleMonth]);
  return {
    room,
    participant,
    roomSummary,
  };
};
