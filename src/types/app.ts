import type { Room } from "./room";

export type RouteState =
  | { name: "landing" }
  | { name: "report" }
  | { name: "not-found-room" }
  | { name: "room"; roomId: string }
  | { name: "room_access_restricted"; roomId: string };

export type AppStorage = {
  visibleMonthsByRoomId: Record<string, string>;
  rooms: Record<string, Room>;
  memberships: Record<string, string>;
};

export type FirebaseE2ETestHooks = {
  emitSnapshotError?: (() => void) | null;
  failAllSnapshots?: boolean;
  failNextSnapshot?: boolean;
};
