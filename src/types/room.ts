import type {
  CalendarDay,
  DateRangeType,
  Participant,
  RankingItem,
} from "../types";

export type Room = {
  id: string;
  inviteCode: string;
  maxParticipants: number;
  dateRangeType: DateRangeType;
  startDate: string;
  endDate: string;
  createdAt: string;
  expiresAt?: string;
  hostClientKey?: string;
  participants: Participant[];
};

export type RoomSummary = {
  monthLabel: string;
  rankings: RankingItem[];
  calendarDays: CalendarDay[];
};

export type CreateRoomPayload = {
  maxParticipants: number;
  dateRangeType: DateRangeType;
  startDate: string;
  endDate: string;
};
