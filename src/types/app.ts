import type { Room } from "./room";

export type RouteState =
  | { name: "landing" }
  | { name: "report" }
  | { name: "room"; roomId: string }
  | { name: "room_access_restricted"; roomId: string };

export type AppStorage = {
  rooms: Record<string, Room>;
  memberships: Record<string, string>;
};

export type FirebaseE2ETestHooks = {
  emitSnapshotError?: (() => void) | null;
  failAllSnapshots?: boolean;
  failNextSnapshot?: boolean;
};
