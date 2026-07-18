import { isFirebaseConfigured } from "../../integrations/firebase/client";
import { getOrCreateClientKey } from "../session/clientIdentity";
import {
  removeParticipant as removeFirebaseParticipant,
  updateParticipantNickname,
} from "../../integrations/firebase/services/participant-service";
import {
  deleteRoom as deleteFirebaseRoom,
  leaveRoom as leaveFirebaseRoom,
} from "../../integrations/firebase/services/room-service";
import { updateMembership } from "../../util/participant";
import type { Participant, Room } from "../../types";
import {
  clearRoomSession,
  updateParticipantInStorage,
} from "./shared";
import type { RoomActionContext } from "./shared";

type CreateRoomManagementActionsParams = {
  context: RoomActionContext;
  isCurrentUserHost?: boolean;
  participant?: Participant | null;
  room?: Room | null;
};

export function createRoomManagementActions({
  context,
  isCurrentUserHost = false,
  participant,
  room,
}: CreateRoomManagementActionsParams) {
  const { navigate, setStorage, showToast } = context;

  const changeNickname = async (nickname: string) => {
    if (!room || !participant) {
      return false;
    }

    const trimmedNickname = nickname.trim();

    if (!trimmedNickname) {
      showToast({ msg: "닉네임을 입력해 주세요." });
      return false;
    }

    const previousParticipant = participant;
    const nextParticipant = {
      ...participant,
      nickname: trimmedNickname,
      updatedAt: new Date().toISOString(),
    };

    updateParticipantInStorage(setStorage, room.id, nextParticipant);
    showToast({ msg: "닉네임을 변경했어요." });

    if (!isFirebaseConfigured) {
      return true;
    }

    try {
      await updateParticipantNickname({
        clientKey: getOrCreateClientKey(),
        nickname: trimmedNickname,
        participantId: nextParticipant.id,
        roomId: room.id,
      });
      return true;
    } catch {
      updateParticipantInStorage(setStorage, room.id, previousParticipant);
      showToast({
        msg: "닉네임을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.",
      });
      return false;
    }
  };

  const leaveRoom = async () => {
    if (!room || !participant) {
      return false;
    }

    if (isCurrentUserHost) {
      showToast({
        msg: "방장은 방을 나갈 수 없어요. 방 삭제 기능을 사용해 주세요.",
      });
      return false;
    }

    if (isFirebaseConfigured) {
      try {
        await leaveFirebaseRoom({
          clientKey: getOrCreateClientKey(),
          participantId: participant.id,
          roomId: room.id,
        });
      } catch {
        showToast({ msg: "방을 나가지 못했어요. 잠시 후 다시 시도해 주세요." });
        return false;
      }
    }

    setStorage((previous) => {
      const nextRoom = previous.rooms[room.id]
        ? {
            ...previous.rooms[room.id],
            participants: previous.rooms[room.id].participants.filter(
              (storedParticipant) => storedParticipant.id !== participant.id
            ),
          }
        : undefined;
      const memberships = updateMembership(
        previous.memberships,
        room.id,
        undefined
      );
      const visibleMonthsByRoomId = { ...previous.visibleMonthsByRoomId };

      delete visibleMonthsByRoomId[room.id];

      return {
        ...previous,
        memberships,
        visibleMonthsByRoomId,
        rooms: nextRoom
          ? {
              ...previous.rooms,
              [room.id]: nextRoom,
            }
          : previous.rooms,
      };
    });
    showToast({ msg: "방에서 나갔어요." });
    navigate({ name: "landing" });

    return true;
  };

  const deleteRoom = async () => {
    if (!room || !isCurrentUserHost) {
      showToast({ msg: "방장만 방을 삭제할 수 있어요." });
      return false;
    }

    if (isFirebaseConfigured) {
      try {
        await deleteFirebaseRoom({
          hostClientKey: getOrCreateClientKey(),
          roomId: room.id,
        });
      } catch {
        showToast({
          msg: "방을 삭제하지 못했어요. 잠시 후 다시 시도해 주세요.",
        });
        return false;
      }
    }

    setStorage((previous) => clearRoomSession(previous, room.id));
    showToast({ msg: "방을 삭제했어요." });
    navigate({ name: "landing" });

    return true;
  };

  const removeParticipant = async (participantId: string) => {
    if (!room || !isCurrentUserHost) {
      showToast({ msg: "방장만 참가자를 관리할 수 있어요." });
      return false;
    }

    if (participantId === room.hostClientKey) {
      showToast({ msg: "방장은 참가자 목록에서 제거할 수 없어요." });
      return false;
    }

    const previousRoom = room;
    const nextRoom = {
      ...room,
      participants: room.participants.filter(
        (roomParticipant) => roomParticipant.id !== participantId
      ),
    };

    setStorage((previous) => ({
      ...previous,
      rooms: {
        ...previous.rooms,
        [room.id]: nextRoom,
      },
    }));
    showToast({ msg: "참가자를 내보냈어요." });

    if (!isFirebaseConfigured) {
      return true;
    }

    try {
      await removeFirebaseParticipant({
        hostClientKey: getOrCreateClientKey(),
        participantId,
        roomId: room.id,
      });
      return true;
    } catch {
      setStorage((previous) => ({
        ...previous,
        rooms: {
          ...previous.rooms,
          [previousRoom.id]: previousRoom,
        },
      }));
      showToast({
        msg: "참가자를 내보내지 못했어요. 잠시 후 다시 시도해 주세요.",
      });
      return false;
    }
  };

  return {
    changeNickname,
    deleteRoom,
    leaveRoom,
    removeParticipant,
  };
}
