import { useCallback } from "react";
import { DEFAULT_STORAGE, STORAGE_KEY } from "../lib/constants";
import { useRouteState } from "../lib/router";
import type { AppStorage, Participant } from "../types";
import { useLocalStorageState } from "./useLocalStorageState";

export function useCurrentParticipantUpdater() {
  const { route } = useRouteState();
  const [storage, setStorage] = useLocalStorageState<AppStorage>(
    STORAGE_KEY,
    DEFAULT_STORAGE
  );

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
