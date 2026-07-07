import type { CreateRoomPayload, Room } from "../types";
import { isLocalParticipantNewer, upsertParticipant } from "./participant";

/**
 * ----------------------------------------------------------------------------------------------------
 * @description Realtime snapshot과 로컬 optimistic participant 상태 병합.
 */
export function mergeRoomSnapshot(
  previousRoom: Room | undefined,
  nextRoom: Room,
  localParticipantId: string | undefined
) {
  if (!previousRoom || !localParticipantId) {
    return nextRoom;
  }

  const localParticipant = previousRoom.participants.find(
    (participant) => participant.id === localParticipantId
  );

  if (!localParticipant) {
    return nextRoom;
  }

  const mergedParticipants = nextRoom.participants.map((participant) => {
    if (participant.id !== localParticipant.id) {
      return participant;
    }

    return isLocalParticipantNewer(localParticipant, participant)
      ? localParticipant
      : participant;
  });

  return {
    ...nextRoom,
    participants: mergedParticipants.some(
      (participant) => participant.id === localParticipant.id
    )
      ? mergedParticipants
      : upsertParticipant(mergedParticipants, localParticipant),
  };
}

/**
 * ----------------------------------------------------------------------------------------------------
 * @description 로컬 스토리지 폴백 모드에서 사용할 초안 room 레코드 생성
 */
export function createRoomRecord(
  payload: CreateRoomPayload,
  hostClientKey: string
): Room {
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  return {
    id,
    inviteCode: id.slice(0, 6).toUpperCase(),
    maxParticipants: payload.maxParticipants,
    dateRangeType: payload.dateRangeType,
    startDate: payload.startDate,
    endDate: payload.endDate,
    createdAt,
    expiresAt: addOneMonth(createdAt),
    hostClientKey,
    participants: [],
  };
}

/**
 * ----------------------------------------------------------------------------------------------------
 * @description room 만료 시각(생성시점 기준 한달뒤)
 */
function addOneMonth(isoDate: string) {
  const expiresAt = new Date(isoDate);
  expiresAt.setMonth(expiresAt.getMonth() + 1);
  return expiresAt.toISOString();
}
