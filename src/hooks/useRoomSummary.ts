import { useEffect, useMemo } from "react";
import { useRouteState } from "../lib/router";
import { useLocalStorageState } from "./useLocalStorageState";
import { isFirebaseConfigured } from "../integrations/firebase/client";
import type { RoomSummary, RouteState } from "../types";
import {
  buildCalendarDays,
  buildRankings,
  formatMonthLabel,
} from "../lib/date";

interface IUseRoomSummary {
  route: RouteState;
  visibleMonth: string;
}
export const useRoomSummary = ({ route, visibleMonth }: IUseRoomSummary) => {
  const { navigate } = useRouteState();
  const [storage] = useLocalStorageState();

  if (route.name !== "room") return;
  const room = storage.rooms[route.roomId] ?? undefined;
  const participantId = storage.memberships[route.roomId] ?? undefined;
  const participant = room?.participants.find(
    (participant) => participant.id === participantId
  );

  useEffect(() => {
    if (route.name !== "room" || isFirebaseConfigured || !!room) {
      return;
    }

    navigate({ name: "not-found-room" }, { replace: true });
  }, [room, navigate, route]);

  const roomSummary = useMemo<RoomSummary | undefined>(() => {
    if (!room) {
      return undefined;
    }

    return {
      calendarDays: buildCalendarDays(room, participant?.id, visibleMonth),
      monthLabel: formatMonthLabel(visibleMonth),
      rankings: buildRankings(room),
    };
  }, [participant?.id, room, visibleMonth]);
  return {
    room,
    participant,
    roomSummary,
  };
};
