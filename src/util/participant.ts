import type { AppStorage, Participant, Room } from "../types";
import { COLOR_PALETTE } from "../lib/constants";

/**
 * ----------------------------------------------------------------------------------------------------
 * @description 새로운 참가자에 비어 있는 participant 상태와 색상을 할당
 */
export function createParticipant(
  room: Room,
  participantId: string = crypto.randomUUID()
): Participant {
  const usedColorIndexes = new Set(
    room.participants.map((participant) => participant.colorIndex)
  );
  const colorIndex =
    COLOR_PALETTE.findIndex((_, index) => !usedColorIndexes.has(index)) === -1
      ? 0
      : COLOR_PALETTE.findIndex((_, index) => !usedColorIndexes.has(index));

  return {
    id: participantId,
    nickname: "",
    colorIndex,
    selectionMode: "available",
    weekdayRules: [],
    overrides: {},
    updatedAt: new Date().toISOString(),
  };
}

/**
 * ----------------------------------------------------------------------------------------------------
 * @description 로컬 participant가 원격 snapshot보다 최신인지 updatedAt 기준으로 비교
 */
export function isLocalParticipantNewer(
  localParticipant: Participant,
  remoteParticipant: Participant
) {
  if (!localParticipant.updatedAt) {
    return false;
  }

  if (!remoteParticipant.updatedAt) {
    return true;
  }

  return localParticipant.updatedAt > remoteParticipant.updatedAt;
}

/**
 * ----------------------------------------------------------------------------------------------------
 * @description participant 배열에 동일 id를 수정 or 새로 추가
 */
export function upsertParticipant(
  participants: Participant[],
  nextParticipant: Participant
) {
  const existing = participants.some(
    (participant) => participant.id === nextParticipant.id
  );

  if (!existing) {
    return [...participants, nextParticipant];
  }

  return participants.map((participant) =>
    participant.id === nextParticipant.id ? nextParticipant : participant
  );
}

/**
 * ----------------------------------------------------------------------------------------------------
 * @description room별 현재 참가자 membership 정보를 추가, 교체, 삭제한다.
 */
export function updateMembership(
  memberships: AppStorage["memberships"],
  roomId: string,
  participantId: string | undefined
) {
  const nextMemberships = { ...memberships };

  if (participantId) {
    nextMemberships[roomId] = participantId;
  } else {
    delete nextMemberships[roomId];
  }

  return nextMemberships;
}
