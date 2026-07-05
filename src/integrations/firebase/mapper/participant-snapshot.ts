import type {
  FirestoreParticipantDocument,
  ParticipantRow,
} from "../../../types";

export const mapParticipantSnapshot = (
  id: string,
  data: FirestoreParticipantDocument
): ParticipantRow => {
  return {
    id,
    ...data,
  };
};

export const mapParticipantRow = (row: ParticipantRow) => {
  return {
    id: row.id,
    nickname: row.nickname,
    colorIndex: row.colorIndex,
    selectionMode: row.selectionMode,
    weekdayRules: row.weekdayRules,
    overrides: row.overrides,
    updatedAt: row.updatedAt,
  };
};
