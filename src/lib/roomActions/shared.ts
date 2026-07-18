import type {
  AppStorage,
  Participant,
  RouteState,
} from "../../types";

export type SetStorage = (
  value: AppStorage | ((previousState: AppStorage) => AppStorage)
) => void;

export type Navigate = (
  nextRoute: RouteState,
  options?: { replace?: boolean }
) => void;

export type ShowToast = (params: { msg: string }) => void;

export type RoomActionContext = {
  navigate: Navigate;
  setStorage: SetStorage;
  showToast: ShowToast;
};

export function updateParticipantInStorage(
  setStorage: SetStorage,
  roomId: string,
  nextParticipant: Participant
) {
  setStorage((previous) => {
    const previousRoom = previous.rooms[roomId];

    if (!previousRoom) {
      return previous;
    }

    return {
      ...previous,
      rooms: {
        ...previous.rooms,
        [roomId]: {
          ...previousRoom,
          participants: previousRoom.participants.map((participant) =>
            participant.id === nextParticipant.id ? nextParticipant : participant
          ),
        },
      },
    };
  });
}

export function clearRoomSession(storage: AppStorage, roomId: string) {
  const rooms = { ...storage.rooms };
  const memberships = { ...storage.memberships };
  const visibleMonthsByRoomId = { ...storage.visibleMonthsByRoomId };

  delete rooms[roomId];
  delete memberships[roomId];
  delete visibleMonthsByRoomId[roomId];

  return {
    ...storage,
    memberships,
    rooms,
    visibleMonthsByRoomId,
  };
}
