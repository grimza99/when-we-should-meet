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
