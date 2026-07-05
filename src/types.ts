import type { Room } from "./types/room";

export type DateRangeType = "this_month" | "this_year" | "custom";
export type DateMode = "available" | "unavailable";
export type RouteState =
  | { name: "landing" }
  | { name: "report" }
  | { name: "room"; roomId: string }
  | { name: "room_access_restricted"; roomId: string };

export type AppStorage = {
  rooms: Record<string, Room>;
  memberships: Record<string, string>;
};

export type RankingItem = {
  date: string;
  label: string;
  score: number;
  rank: number;
};

export type CalendarDay = {
  key: string;
  isoDate: string | null;
  dayNumber: string;
  isCurrentMonth: boolean;
  isSelectable: boolean;
  availableCount: number;
  participantColors: string[];
  isSelectedByCurrentUser: boolean;
};
