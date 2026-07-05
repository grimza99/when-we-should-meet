import type {
  FirestoreRoomDocument,
  Room,
  RoomRow,
  RoomSnapshot,
} from "../../../types";
import { mapParticipantRow } from "./participant-snapshot";

export const mapRoomSnapshot = (
  id: string,
  data: FirestoreRoomDocument
): RoomRow => {
  return {
    id,
    ...data,
  };
};

export const mapRoomRowToDraftRoom = (row: RoomRow) => {
  return {
    id: row.id,
    inviteCode: row.inviteCode,
    maxParticipants: row.maxParticipants,
    dateRangeType: row.dateRangeType,
    startDate: row.startDate,
    endDate: row.endDate,
    createdAt: row.createdAt,
    expiresAt: row.expiresAt,
    hostClientKey: row.hostClientKey,
    participants: [],
  };
};

export const mapRoomSnapshotToDraftRoom = (snapshot: RoomSnapshot): Room => {
  return {
    ...mapRoomRowToDraftRoom(snapshot.room),
    participants: snapshot.participants.map(mapParticipantRow),
  };
};
