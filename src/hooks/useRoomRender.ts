import { useCallback, useEffect, useRef, useState } from "react";
import { useToast } from "../components/shell/toast/toast-context";
import { useLocalStorageState } from "./useLocalStorageState";
import { useRouteState } from "../lib/router";
import { getOrCreateClientKey } from "../lib/session/clientIdentity";
import { isFirebaseConfigured } from "../integrations/firebase/client";
import { mapRoomSnapshotToDraftRoom } from "../integrations/firebase/mapper";
import { restoreParticipant } from "../integrations/firebase/services/participant-service";
import {
  getRoomSnapshot,
  isRoomAccessRestricted,
  subscribeToRoomChanges,
  unsubscribeFromRoomChanges,
} from "../integrations/firebase/services/room-service";
import type { Participant, Room, RoomChangeSubscription } from "../types";
import { updateMembership } from "../util/participant";
import { mergeRoomSnapshot } from "../util/room";

type UseRoomRenderParams = {
  participant?: Participant;
  room?: Room;
  roomId?: string;
};

export function useRoomRender({
  participant,
  room,
  roomId,
}: UseRoomRenderParams) {
  const [isHydratingRoom, setIsHydratingRoom] = useState(false);
  const [, setStorage] = useLocalStorageState();
  const { showToast } = useToast();
  const { navigate } = useRouteState();
  const roomChangeSubscriptionRef = useRef<RoomChangeSubscription | null>(null);

  const participantId = participant?.id;
  const needsRoomSnapshot = Boolean(roomId && (!room || !participantId));

  const goToRoomAccessRestricted = useCallback(
    (nextRoomId: string) => {
      setStorage((previous) => {
        const visibleMonthsByRoomId = { ...previous.visibleMonthsByRoomId };

        delete visibleMonthsByRoomId[nextRoomId];

        return {
          ...previous,
          memberships: updateMembership(
            previous.memberships,
            nextRoomId,
            undefined
          ),
          visibleMonthsByRoomId,
        };
      });
      navigate(
        {
          name: "room_access_restricted",
          roomId: nextRoomId,
        },
        { replace: true }
      );
    },
    [navigate, setStorage]
  );

  useEffect(() => {
    if (!isFirebaseConfigured || !roomId) {
      setIsHydratingRoom(false);
      return;
    }

    if (!needsRoomSnapshot) {
      setIsHydratingRoom(false);
      return;
    }

    let isCancelled = false;
    setIsHydratingRoom(true);

    const hydrateRoom = async () => {
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

        const nextRoom = mapRoomSnapshotToDraftRoom(roomSnapshot);
        let restoredParticipant = null;

        try {
          restoredParticipant = await restoreParticipant({
            clientKey: getOrCreateClientKey(),
            roomId: roomId,
          });
        } catch (error) {
          if (String(error).includes("ROOM_ACCESS_RESTRICTED")) {
            if (!isCancelled) {
              goToRoomAccessRestricted(roomId);
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
            [nextRoom.id]: mergeRoomSnapshot(
              previous.rooms[nextRoom.id],
              nextRoom,
              restoredParticipantId
            ),
          },
          memberships: updateMembership(
            previous.memberships,
            nextRoom.id,
            restoredParticipantId
          ),
          visibleMonthsByRoomId: {
            ...previous.visibleMonthsByRoomId,
            [nextRoom.id]:
              previous.visibleMonthsByRoomId[nextRoom.id] || nextRoom.startDate,
          },
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

    void hydrateRoom();

    return () => {
      isCancelled = true;
    };
  }, [
    goToRoomAccessRestricted,
    needsRoomSnapshot,
    navigate,
    setStorage,
    showToast,
    roomId,
  ]);

  useEffect(() => {
    if (!isFirebaseConfigured || !roomId) {
      roomChangeSubscriptionRef.current = null;
      return;
    }

    let isCancelled = false;
    let refreshTimer: number | undefined;

    const refreshRoomSnapshot = () => {
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
                const visibleMonthsByRoomId = {
                  ...previous.visibleMonthsByRoomId,
                };

                delete rooms[roomId];
                delete memberships[roomId];
                delete visibleMonthsByRoomId[roomId];

                return {
                  ...previous,
                  memberships,
                  rooms,
                  visibleMonthsByRoomId,
                };
              });
              showToast({ msg: "방이 삭제되었거나 더 이상 접근할 수 없어요." });
              navigate({ name: "not-found-room" }, { replace: true });
              return;
            }

            const nextRoom = mapRoomSnapshotToDraftRoom(roomSnapshot);
            const shouldCheckRestrictedAccess =
              Boolean(participantId) &&
              !nextRoom.participants.some(
                (nextParticipant) => nextParticipant.id === participantId
              );

            if (shouldCheckRestrictedAccess) {
              const isRestricted = await isRoomAccessRestricted({
                clientKey: getOrCreateClientKey(),
                roomId: roomId,
              });

              if (isCancelled) {
                return;
              }

              if (isRestricted) {
                goToRoomAccessRestricted(roomId);
                return;
              }
            }

            setStorage((previous) => ({
              ...previous,
              rooms: {
                ...previous.rooms,
                [nextRoom.id]: mergeRoomSnapshot(
                  previous.rooms[nextRoom.id],
                  nextRoom,
                  previous.memberships[nextRoom.id]
                ),
              },
              visibleMonthsByRoomId: {
                ...previous.visibleMonthsByRoomId,
                [nextRoom.id]:
                  previous.visibleMonthsByRoomId[nextRoom.id] ||
                  nextRoom.startDate,
              },
            }));
          } catch {
            if (!isCancelled) {
              showToast({
                msg: "최신 방 정보를 동기화하지 못했어요.",
              });
            }
          }
        };

        void refresh();
      }, 120);
    };

    const subscription = subscribeToRoomChanges({
      roomId: roomId,
      onChange: refreshRoomSnapshot,
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
  }, [
    goToRoomAccessRestricted,
    navigate,
    participantId,
    setStorage,
    showToast,
    roomId,
  ]);

  return { isHydratingRoom };
}
