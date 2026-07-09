import { useCallback } from "react";
import { useRouteState } from "../lib/router";
import type { Participant } from "../types";
import { useLocalStorageState } from "./useLocalStorageState";

export function useCurrentParticipantUpdater() {
  const { route } = useRouteState();
  const [storage, setStorage] = useLocalStorageState();

  const currentRoom =
    route.name === "room" ? storage.rooms[route.roomId] : undefined;

  return useCallback(
    (nextParticipant: Participant) => {
      if (!currentRoom) {
        return;
      }

      setStorage((previous) => {
        const previousRoom = previous.rooms[currentRoom.id];

        if (!previousRoom) {
          return previous;
        }

        return {
          ...previous,
          rooms: {
            ...previous.rooms,
            [currentRoom.id]: {
              ...previousRoom,
              participants: previousRoom.participants.map((participant) =>
                participant.id === nextParticipant.id
                  ? nextParticipant
                  : participant
              ),
            },
          },
        };
      });
    },
    [currentRoom, setStorage]
  );
}
