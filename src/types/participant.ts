import type { DateMode } from "./date";

export type Participant = {
  id: string;
  nickname: string;
  colorIndex: number;
  selectionMode: DateMode;
  weekdayRules: number[];
  overrides: Record<string, DateMode>;
  updatedAt?: string;
};

export type FirestoreParticipantDocument = {
  clientKey: string;
  nickname: string;
  colorIndex: number;
  selectionMode: Participant["selectionMode"];
  weekdayRules: number[];
  overrides: Participant["overrides"];
  joinedAt: string;
  updatedAt: string;
};
export type ParticipantRow = FirestoreParticipantDocument & {
  id: string;
};
