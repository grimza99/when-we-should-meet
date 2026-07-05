import {
  collection,
  getDoc,
  getDocs,
  increment,
  onSnapshot,
  runTransaction,
  writeBatch,
} from "firebase/firestore";
import { COLOR_PALETTE } from "../../../lib/constants";
import { db } from "../client";
import type {
  CreateRoomPayload,
  FirebaseE2ETestHooks,
  FirestoreInviteCodeDocument,
  FirestoreParticipantDocument,
  FirestoreRoomDocument,
  RoomChangeSubscription,
  RoomSnapshot,
} from "../../../types";
import { mapParticipantSnapshot, mapRoomSnapshot } from "../mapper";
import { inviteCodeRef, participantRef, roomRef } from "../docs";
import { assertParticipantOwnership } from "./participant-service";
import { addOneMonth, createUniqueInviteCode } from "../../../util";

/**----------------------------------------------- 방 만들기 -------------------------------------------------- */

export async function createRoom(
  payload: CreateRoomPayload & { hostClientKey: string }
) {
  const now = new Date().toISOString();
  const roomId = crypto.randomUUID();
  const inviteCode = await createUniqueInviteCode();
  const room: FirestoreRoomDocument = {
    inviteCode,
    maxParticipants: payload.maxParticipants,
    participantCount: 0,
    dateRangeType: payload.dateRangeType,
    startDate: payload.startDate,
    endDate: payload.endDate,
    createdAt: now,
    expiresAt: addOneMonth(now),
    hostClientKey: payload.hostClientKey,
    updatedAt: now,
  };
  const inviteCodeRecord: FirestoreInviteCodeDocument = {
    roomId,
    createdAt: now,
  };
  const batch = writeBatch(db);

  batch.set(roomRef(roomId), room);
  batch.set(inviteCodeRef(inviteCode), inviteCodeRecord);
  await batch.commit();

  return {
    id: roomId,
    ...room,
  };
}

/**----------------------------------------------- 방 참가 코드 조회 -------------------------------------------------- */

export async function getRoomByInviteCode(inviteCode: string) {
  const inviteCodeSnapshot = await getDoc(inviteCodeRef(inviteCode));

  if (!inviteCodeSnapshot.exists()) {
    return null;
  }

  const { roomId } = inviteCodeSnapshot.data() as FirestoreInviteCodeDocument;
  const roomSnapshot = await getDoc(roomRef(roomId));

  if (!roomSnapshot.exists()) {
    return null;
  }

  return mapRoomSnapshot(
    roomSnapshot.id,
    roomSnapshot.data() as FirestoreRoomDocument
  );
}

/**----------------------------------------------- 방 참가 -------------------------------------------------- */

export async function joinRoom(params: {
  clientKey: string;
  nickname: string;
  roomId: string;
}) {
  const now = new Date().toISOString();

  return runTransaction(db, async (transaction) => {
    const roomDocumentRef = roomRef(params.roomId);
    const participantDocumentRef = participantRef(
      params.roomId,
      params.clientKey
    );
    const [roomSnapshot, existingParticipantSnapshot] = await Promise.all([
      transaction.get(roomDocumentRef),
      transaction.get(participantDocumentRef),
    ]);

    if (!roomSnapshot.exists()) {
      throw new Error("ROOM_NOT_FOUND");
    }

    if (existingParticipantSnapshot.exists()) {
      return mapParticipantSnapshot(
        existingParticipantSnapshot.id,
        existingParticipantSnapshot.data() as FirestoreParticipantDocument
      );
    }

    const room = roomSnapshot.data() as FirestoreRoomDocument;

    if (room.blockedClientKeys?.includes(params.clientKey)) {
      throw new Error("ROOM_ACCESS_RESTRICTED");
    }

    if (room.participantCount >= room.maxParticipants) {
      throw new Error("ROOM_CAPACITY_REACHED");
    }

    const participant: FirestoreParticipantDocument = {
      clientKey: params.clientKey,
      nickname: params.nickname,
      colorIndex: room.participantCount % COLOR_PALETTE.length,
      selectionMode: "available",
      weekdayRules: [],
      overrides: {},
      joinedAt: now,
      updatedAt: now,
    };

    transaction.set(participantDocumentRef, participant);
    transaction.update(roomDocumentRef, {
      participantCount: increment(1),
      updatedAt: now,
    });

    return mapParticipantSnapshot(params.clientKey, participant);
  });
}

/**----------------------------------------------- 방 스냅샷 조회 -------------------------------------------------- */

export async function getRoomSnapshot(roomId: string) {
  const [roomSnapshot, participantSnapshots] = await Promise.all([
    getDoc(roomRef(roomId)),
    getDocs(collection(db, "rooms", roomId, "participants")),
  ]);

  if (!roomSnapshot.exists()) {
    return null;
  }

  return {
    room: mapRoomSnapshot(
      roomSnapshot.id,
      roomSnapshot.data() as FirestoreRoomDocument
    ),
    participants: participantSnapshots.docs.map((snapshot) =>
      mapParticipantSnapshot(
        snapshot.id,
        snapshot.data() as FirestoreParticipantDocument
      )
    ),
  } satisfies RoomSnapshot;
}

/**----------------------------------------------- 방 떠나기 -------------------------------------------------- */

export async function leaveRoom(params: {
  clientKey: string;
  participantId: string;
  roomId: string;
}) {
  assertParticipantOwnership(params);

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

    if (room.hostClientKey === params.participantId) {
      throw new Error("HOST_PARTICIPANT_CANNOT_LEAVE");
    }

    if (!participantSnapshot.exists()) {
      return;
    }

    transaction.delete(participantDocumentRef);
    transaction.update(roomDocumentRef, {
      participantCount: increment(-1),
      updatedAt: now,
    });
  });
}

/**----------------------------------------------- 방에서 제외된 참가자인지 확인 -------------------------------------------------- */

export async function isRoomAccessRestricted(params: {
  clientKey: string;
  roomId: string;
}) {
  const roomSnapshot = await getDoc(roomRef(params.roomId));

  if (!roomSnapshot.exists()) {
    return false;
  }

  const room = roomSnapshot.data() as FirestoreRoomDocument;
  return room.blockedClientKeys?.includes(params.clientKey) ?? false;
}

/**----------------------------------------------- 방 삭제 -------------------------------------------------- */

export async function deleteRoom(params: {
  hostClientKey: string;
  roomId: string;
}) {
  const roomSnapshot = await getDoc(roomRef(params.roomId));

  if (!roomSnapshot.exists()) {
    return;
  }

  const room = roomSnapshot.data() as FirestoreRoomDocument;

  if (room.hostClientKey !== params.hostClientKey) {
    throw new Error("HOST_PERMISSION_REQUIRED");
  }

  const participantSnapshots = await getDocs(
    collection(db, "rooms", params.roomId, "participants")
  );
  const batch = writeBatch(db);

  participantSnapshots.docs.forEach((participantSnapshot) => {
    batch.delete(participantSnapshot.ref);
  });
  batch.delete(inviteCodeRef(room.inviteCode));
  batch.delete(roomRef(params.roomId));

  await batch.commit();
}

/**----------------------------------------------- 방 변경 구독 -------------------------------------------------- */

export function subscribeToRoomChanges(params: {
  roomId: string;
  onChange: () => void;
  onStatusChange?: (status: string) => void;
}) {
  registerSnapshotErrorEmitter(() => params.onStatusChange?.("SNAPSHOT_ERROR"));

  const handleSnapshotEvent = () => {
    if (consumeSnapshotFailureHook()) {
      params.onStatusChange?.("SNAPSHOT_ERROR");
      return;
    }

    params.onChange();
  };

  const unsubscribers = [
    onSnapshot(roomRef(params.roomId), handleSnapshotEvent, () =>
      params.onStatusChange?.("SNAPSHOT_ERROR")
    ),
    onSnapshot(
      collection(db, "rooms", params.roomId, "participants"),
      handleSnapshotEvent,
      () => params.onStatusChange?.("SNAPSHOT_ERROR")
    ),
  ];

  return () => {
    registerSnapshotErrorEmitter(null);
    unsubscribers.forEach((unsubscribe) => unsubscribe());
  };
}

/**----------------------------------------------- 방 구독 해지 -------------------------------------------------- */

export async function unsubscribeFromRoomChanges(
  subscription: RoomChangeSubscription
) {
  subscription();
}

function registerSnapshotErrorEmitter(emitSnapshotError: (() => void) | null) {
  if (typeof window === "undefined") {
    return;
  }

  const hooks = (
    window as Window & {
      __WSWM_FIREBASE_TEST_HOOKS__?: FirebaseE2ETestHooks;
    }
  ).__WSWM_FIREBASE_TEST_HOOKS__;

  if (!hooks) {
    return;
  }

  hooks.emitSnapshotError = emitSnapshotError;
}

function consumeSnapshotFailureHook() {
  if (typeof window === "undefined") {
    return false;
  }

  const hooks = (
    window as Window & {
      __WSWM_FIREBASE_TEST_HOOKS__?: FirebaseE2ETestHooks;
    }
  ).__WSWM_FIREBASE_TEST_HOOKS__;

  if (!hooks?.failNextSnapshot) {
    if (hooks?.failAllSnapshots) {
      return true;
    }

    return false;
  }

  hooks.failNextSnapshot = false;
  return true;
}
