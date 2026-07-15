import {
  getDoc,
  increment,
  runTransaction,
  updateDoc,
} from "firebase/firestore";
import { participantRef, roomRef } from "../docs";
import type {
  FirestoreParticipantDocument,
  FirestoreRoomDocument,
  Participant,
} from "../../../types";
import { mapParticipantSnapshot } from "../mapper";
import { db } from "../client";

/**----------------------------------------------- 참가자 복구 -------------------------------------------------- */

export async function restoreParticipant(params: {
  clientKey: string;
  roomId: string;
}) {
  const roomSnapshot = await getDoc(roomRef(params.roomId));

  if (roomSnapshot.exists()) {
    const room = roomSnapshot.data() as FirestoreRoomDocument;

    if (room.blockedClientKeys?.includes(params.clientKey)) {
      throw new Error("ROOM_ACCESS_RESTRICTED");
    }
  }

  const participantSnapshot = await getDoc(
    participantRef(params.roomId, params.clientKey)
  );

  if (!participantSnapshot.exists()) {
    return null;
  }

  return mapParticipantSnapshot(
    participantSnapshot.id,
    participantSnapshot.data() as FirestoreParticipantDocument
  );
}

/**----------------------------------------------- 날짜 초기화 -------------------------------------------------- */
export async function resetParticipantSelections(params: {
  clientKey: string;
  participantId: string;
  roomId: string;
}) {
  assertParticipantOwnership(params);

  await updateDoc(participantRef(params.roomId, params.participantId), {
    overrides: {},
    updatedAt: new Date().toISOString(),
    weekdayRules: [],
  });
}

/**----------------------------------------------- 닉네임 수정 -------------------------------------------------- */
export async function updateParticipantNickname(params: {
  clientKey: string;
  nickname: string;
  participantId: string;
  roomId: string;
}) {
  assertParticipantOwnership(params);

  await updateDoc(participantRef(params.roomId, params.participantId), {
    nickname: params.nickname,
    updatedAt: new Date().toISOString(),
  });
}

/**----------------------------------------------- 참가자 삭제 -------------------------------------------------- */

export async function removeParticipant(params: {
  hostClientKey: string;
  participantId: string;
  roomId: string;
}) {
  if (params.participantId === params.hostClientKey) {
    throw new Error("HOST_PARTICIPANT_CANNOT_BE_REMOVED");
  }

  const now = new Date().toISOString();

  await runTransaction(db, async (transaction) => {
    const roomDocumentRef = roomRef(params.roomId);
    const participantDocumentRef = participantRef(
      params.roomId,
      params.participantId
    );
    const [roomSnapshot, participantSnapshot] = await Promise.all([
      transaction.get(roomDocumentRef),
      transaction.get(participantDocumentRef),
    ]);

    if (!roomSnapshot.exists()) {
      throw new Error("ROOM_NOT_FOUND");
    }

    const room = roomSnapshot.data() as FirestoreRoomDocument;

    if (room.hostClientKey !== params.hostClientKey) {
      throw new Error("HOST_PERMISSION_REQUIRED");
    }

    if (!participantSnapshot.exists()) {
      return;
    }

    const participant =
      participantSnapshot.data() as FirestoreParticipantDocument;
    const blockedClientKeys = Array.from(
      new Set([...(room.blockedClientKeys ?? []), participant.clientKey])
    );

    transaction.delete(participantDocumentRef);
    transaction.update(roomDocumentRef, {
      blockedClientKeys,
      participantCount: increment(-1),
      updatedAt: now,
    });
  });
}

/**----------------------------------------------- 참가자 확인 -------------------------------------------------- */

export function assertParticipantOwnership(params: {
  clientKey: string;
  participantId: string;
}) {
  if (params.clientKey !== params.participantId) {
    throw new Error("PARTICIPANT_OWNERSHIP_MISMATCH");
  }
}

/**----------------------------------------------- 날짜 모드 변경 -------------------------------------------------- */

export async function updateParticipantAvailability(params: {
  clientKey: string;
  overrides: Participant["overrides"];
  participantId: string;
  roomId: string;
  selectionMode: Participant["selectionMode"];
  weekdayRules: number[];
}) {
  assertParticipantOwnership(params);

  await updateDoc(participantRef(params.roomId, params.participantId), {
    overrides: params.overrides,
    selectionMode: params.selectionMode,
    weekdayRules: params.weekdayRules,
    updatedAt: new Date().toISOString(),
  });
}

/**----------------------------------------------- 선택 날짜(override) 적용 -------------------------------------------------- */

export async function setParticipantDateOverride(params: {
  clientKey: string;
  participantId: string;
  roomId: string;
  overrides: Participant["overrides"];
}) {
  assertParticipantOwnership(params);

  await updateDoc(participantRef(params.roomId, params.participantId), {
    overrides: params.overrides,
    updatedAt: new Date().toISOString(),
  });
}
