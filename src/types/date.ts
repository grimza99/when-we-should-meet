export type DateRangeType = "this_month" | "this_year" | "custom";
export type DateMode = "available" | "unavailable";

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
