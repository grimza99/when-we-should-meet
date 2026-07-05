import type { Unsubscribe } from "firebase/firestore";
import type { CalendarDay, RankingItem } from "../types";
import type { DateRangeType } from "./date";
import type { Participant, ParticipantRow } from "./participant";

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

export type FirestoreRoomDocument = {
  inviteCode: string;
  blockedClientKeys?: string[];
  maxParticipants: number;
  participantCount: number;
  dateRangeType: Room["dateRangeType"];
  startDate: string;
  endDate: string;
  createdAt: string;
  expiresAt: string;
  hostClientKey: string;
  updatedAt: string;
};

export type RoomSnapshot = {
  room: RoomRow;
  participants: ParticipantRow[];
};

export type RoomRow = FirestoreRoomDocument & {
  id: string;
};

export type RoomChangeSubscription = Unsubscribe;

export type FirestoreInviteCodeDocument = {
  roomId: string;
  createdAt: string;
};
