import { useEffect, useState } from "react";
import { useLocalStorageState } from "../hooks/useLocalStorageState";
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

  const hasCurrentRoom = Boolean(currentRoom);

  useEffect(() => {
    if (route.name !== "room" || isFirebaseConfigured || hasCurrentRoom) {
      return;
    }

    navigate({ name: "not-found-room" }, { replace: true });
  }, [hasCurrentRoom, navigate, route]);

  return {
    currentParticipant,
    currentRoom,
    visibleMonth,
    setVisibleMonth: (date: string) => setVisibleMonth(date),
  };
}
