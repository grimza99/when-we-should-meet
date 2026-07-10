import { useCallback, useEffect, useRef, useState } from "react";
import { isFirebaseConfigured } from "../integrations/firebase/client";
import type { Participant, Room, RoomChangeSubscription } from "../types";
import {
  getRoomSnapshot,
  isRoomAccessRestricted,
  subscribeToRoomChanges,
  unsubscribeFromRoomChanges,
} from "../integrations/firebase/services/room-service";
import { useToast } from "../components/shell/toast/toast-context";
import { useRouteState } from "../lib/router";
import { mapRoomSnapshotToDraftRoom } from "../integrations/firebase/mapper";
import { restoreParticipant } from "../integrations/firebase/services/participant-service";
import { getOrCreateClientKey } from "../lib/session/clientIdentity";
import { useLocalStorageState } from "./useLocalStorageState";
import { mergeRoomSnapshot } from "../util/room";
import { updateMembership } from "../util/participant";

export const useRoomRender = (room: Room, participant: Participant) => {
  const [isHydratingRoom, setIsHydratingRoom] = useState(false);
  const [, setStorage] = useLocalStorageState();
  const { showToast } = useToast();
  const { navigate } = useRouteState();
  const roomChangeSubscriptionRef = useRef<RoomChangeSubscription | null>(null);

  if (!room || !participant) {
    return;
  }
  const needsRoomSnapshot = Boolean(
    room.id && (!room || (participant.id !== undefined && !!participant))
  );

  const goToRoomAccessRestricted = useCallback(
    (roomId: string) => {
      setStorage((previous) => ({
        ...previous,
        memberships: updateMembership(previous.memberships, roomId, undefined),
      }));

      navigate({ name: "room_access_restricted", roomId }, { replace: true });
    },
    [navigate, setStorage]
  );

  useEffect(() => {
    if (!isFirebaseConfigured || !room.id) {
      setIsHydratingRoom(false);
      return;
    }

    if (!needsRoomSnapshot) {
      setIsHydratingRoom(false);
      return;
    }

    let isCancelled = false;
    setIsHydratingRoom(true);

    const hydrateRoom = async (roomId: string) => {
      try {
        const roomSnapshot = await getRoomSnapshot(roomId);

        if (!roomSnapshot) {
          if (!isCancelled) {
            showToast({
              msg: "존재하지 않는 방이거나 이미 접근할 수 없는 방입니다.",
            });
            navigate({ name: "not-found-room" }, { replace: true });
          }
          return;
        }

        const room = mapRoomSnapshotToDraftRoom(roomSnapshot);
        let restoredParticipant = null;

        try {
          restoredParticipant = await restoreParticipant({
            clientKey: getOrCreateClientKey(),
            roomId: room.id,
          });
        } catch (error) {
          if (String(error).includes("ROOM_ACCESS_RESTRICTED")) {
            if (!isCancelled) {
              goToRoomAccessRestricted(room.id);
            }
            return;
          }

          throw error;
        }

        if (isCancelled) {
          return;
        }

        const restoredParticipantId = restoredParticipant?.id;

        setStorage((previous) => ({
          ...previous,
          rooms: {
            ...previous.rooms,
            [room.id]: mergeRoomSnapshot(
              previous.rooms[room.id],
              room,
              restoredParticipantId
            ),
          },
          memberships: updateMembership(
            previous.memberships,
            room.id,
            restoredParticipantId
          ),
        }));
      } catch {
        if (!isCancelled) {
          showToast({
            msg: "방 정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.",
          });
        }
      } finally {
        if (!isCancelled) {
          setIsHydratingRoom(false);
        }
      }
    };

    void hydrateRoom(room.id);

    return () => {
      isCancelled = true;
    };
  }, [
    participant.id,
    goToRoomAccessRestricted,
    !!participant,
    room,
    navigate,
    needsRoomSnapshot,
    room.id,
    setStorage,
    showToast,
  ]);

  useEffect(() => {
    if (!isFirebaseConfigured || !room.id) {
      roomChangeSubscriptionRef.current = null;
      return;
    }

    let isCancelled = false;
    let refreshTimer: number | undefined;

    const refreshRoomSnapshot = (roomId: string) => {
      if (refreshTimer) {
        window.clearTimeout(refreshTimer);
      }

      refreshTimer = window.setTimeout(() => {
        const refresh = async () => {
          try {
            const roomSnapshot = await getRoomSnapshot(roomId);

            if (isCancelled) {
              return;
            }

            if (!roomSnapshot) {
              setStorage((previous) => {
                const rooms = { ...previous.rooms };
                const memberships = { ...previous.memberships };

                delete rooms[room.id];
                delete memberships[room.id];

                return {
                  ...previous,
                  memberships,
                  rooms,
                };
              });
              showToast({ msg: "방이 삭제되었거나 더 이상 접근할 수 없어요." });
              navigate({ name: "not-found-room" }, { replace: true });
              return;
            }

            const room = mapRoomSnapshotToDraftRoom(roomSnapshot);
            const shouldCheckRestrictedAccess =
              Boolean(participant.id) &&
              !room.participants.some(
                (participant) => participant.id === participant.id
              );

            if (shouldCheckRestrictedAccess) {
              const isRestricted = await isRoomAccessRestricted({
                clientKey: getOrCreateClientKey(),
                roomId: room.id,
              });

              if (isCancelled) {
                return;
              }

              if (isRestricted) {
                goToRoomAccessRestricted(room.id);
                return;
              }
            }

            setStorage((previous) => ({
              ...previous,
              rooms: {
                ...previous.rooms,
                [room.id]: mergeRoomSnapshot(
                  previous.rooms[room.id],
                  room,
                  previous.memberships[room.id]
                ),
              },
            }));
          } catch {
            if (!isCancelled) {
              showToast({ msg: "최신 방 정보를 동기화하지 못했어요." });
            }
          }
        };

        void refresh();
      }, 120);
    };

    const subscription = subscribeToRoomChanges({
      roomId: room.id,
      onChange: () => refreshRoomSnapshot(room.id),
      onStatusChange: (status) => {
        if (status === "SNAPSHOT_ERROR") {
          showToast({
            msg: "실시간 연결에 문제가 있어요. 새로고침하면 최신 상태를 볼 수 있어요.",
          });
        }
      },
    });

    roomChangeSubscriptionRef.current = subscription;

    return () => {
      isCancelled = true;

      if (refreshTimer) {
        window.clearTimeout(refreshTimer);
      }

      if (roomChangeSubscriptionRef.current === subscription) {
        roomChangeSubscriptionRef.current = null;
      }

      void unsubscribeFromRoomChanges(subscription);
    };
  }, [participant.id, navigate, room.id, setStorage, showToast]);

  return {
    isHydratingRoom,
  };
};
