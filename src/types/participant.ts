import type { DateMode } from "../types";

export type Participant = {
  id: string;
  nickname: string;
  colorIndex: number;
  selectionMode: DateMode;
  weekdayRules: number[];
  overrides: Record<string, DateMode>;
  updatedAt?: string;
};
