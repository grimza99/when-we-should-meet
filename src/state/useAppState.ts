import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocalStorageState } from "../hooks/useLocalStorageState";
import { useToast } from "../components/shell/toast/toast-context";
import {
  addMonths,
  buildCalendarDays,
  buildRankings,
  clampVisibleMonth,
  formatMonthLabel,
} from "../lib/date";
import { useRouteState } from "../lib/router";
import { getOrCreateClientKey } from "../lib/session/clientIdentity";
import { isFirebaseConfigured } from "../integrations/firebase/client";
import {
  getRoomSnapshot,
  isRoomAccessRestricted,
  subscribeToRoomChanges,
  unsubscribeFromRoomChanges,
} from "../integrations/firebase/services/room-service";
import type { RoomChangeSubscription } from "../types";
import { mapRoomSnapshotToDraftRoom } from "../integrations/firebase/mapper";
import {
  restoreParticipant,
  setParticipantDateOverride,
} from "../integrations/firebase/services/participant-service";
import { updateMembership } from "../util/participant";
import { mergeRoomSnapshot } from "../util/room";
import { useCurrentParticipantUpdater } from "../hooks/useParticipant";

export function useAppState() {
  const { navigate, route } = useRouteState();
  const { showToast: emitToast } = useToast();
  const [storage, setStorage] = useLocalStorageState();
  const [visibleMonth, setVisibleMonth] = useState("");
  const [isHydratingRoom, setIsHydratingRoom] = useState(false);
  const updateCurrentParticipant = useCurrentParticipantUpdater();

  const roomChangeSubscriptionRef = useRef<RoomChangeSubscription | null>(null);

  const currentRoom =
    route.name === "room" ? storage.rooms[route.roomId] : undefined;
  const currentParticipantId =
    route.name === "room" ? storage.memberships[route.roomId] : undefined;
  const currentParticipant = currentRoom?.participants.find(
    (participant) => participant.id === currentParticipantId
  );

  const isCurrentUserHost =
    Boolean(currentParticipantId) &&
    currentParticipantId === currentRoom?.hostClientKey;
  const routeRoomId = route.name === "room" ? route.roomId : undefined;
  const effectiveVisibleMonth = currentRoom
    ? clampVisibleMonth(currentRoom, visibleMonth || currentRoom.startDate)
    : "";
  const hasCurrentRoom = Boolean(currentRoom);
  const hasCurrentParticipant = Boolean(currentParticipant);
  const needsRoomSnapshot = Boolean(
    routeRoomId &&
      (!hasCurrentRoom ||
        (currentParticipantId !== undefined && !hasCurrentParticipant))
  );

  const currentRoomSummary = useMemo(() => {
    if (!currentRoom) {
      return undefined;
    }

    return {
      monthLabel: formatMonthLabel(effectiveVisibleMonth),
      rankings: buildRankings(currentRoom),
      calendarDays: buildCalendarDays(
        currentRoom,
        currentParticipant?.id,
        effectiveVisibleMonth
      ),
    };
  }, [currentParticipant?.id, currentRoom, effectiveVisibleMonth]);

  const showToast = useCallback(
    (message: string) => {
      emitToast({ msg: message });
    },
    [emitToast]
  );

  const goToRoomAccessRestricted = useCallback(
    (roomId: string) => {
      setStorage((previous) => ({
        ...previous,
        memberships: updateMembership(previous.memberships, roomId, undefined),
      }));
      emitToast({
        msg: "이 방은 다시 입장할 수 없도록 제한되었어요.",
      });
      navigate({ name: "room_access_restricted", roomId }, { replace: true });
    },
    [emitToast, navigate, setStorage]
  );

  useEffect(() => {
    if (route.name !== "room" || isFirebaseConfigured || hasCurrentRoom) {
      return;
    }

    navigate({ name: "not-found-room" }, { replace: true });
  }, [hasCurrentRoom, navigate, route]);

  useEffect(() => {
    if (!isFirebaseConfigured || !routeRoomId) {
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
        const roomSnapshot = await getRoomSnapshot(routeRoomId);

        if (!roomSnapshot) {
          if (!isCancelled) {
            showToast("존재하지 않는 방이거나 이미 접근할 수 없는 방입니다.");
            navigate({ name: "not-found-room" }, { replace: true });
          }
          return;
        }

        const room = mapRoomSnapshotToDraftRoom(roomSnapshot);
        let restoredParticipant = null;

        try {
          restoredParticipant = await restoreParticipant({
            clientKey: getOrCreateClientKey(),
            roomId: routeRoomId,
          });
        } catch (error) {
          if (String(error).includes("ROOM_ACCESS_RESTRICTED")) {
            if (!isCancelled) {
              goToRoomAccessRestricted(routeRoomId);
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
          showToast("방 정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.");
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
    currentParticipantId,
    goToRoomAccessRestricted,
    hasCurrentParticipant,
    hasCurrentRoom,
    navigate,
    needsRoomSnapshot,
    routeRoomId,
    setStorage,
    showToast,
  ]);

  useEffect(() => {
    if (!isFirebaseConfigured || !routeRoomId) {
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
            const roomSnapshot = await getRoomSnapshot(routeRoomId);

            if (isCancelled) {
              return;
            }

            if (!roomSnapshot) {
              setStorage((previous) => {
                const rooms = { ...previous.rooms };
                const memberships = { ...previous.memberships };

                delete rooms[routeRoomId];
                delete memberships[routeRoomId];

                return {
                  ...previous,
                  memberships,
                  rooms,
                };
              });
              showToast("방이 삭제되었거나 더 이상 접근할 수 없어요.");
              navigate({ name: "not-found-room" }, { replace: true });
              return;
            }

            const room = mapRoomSnapshotToDraftRoom(roomSnapshot);
            const shouldCheckRestrictedAccess =
              Boolean(currentParticipantId) &&
              !room.participants.some(
                (participant) => participant.id === currentParticipantId
              );

            if (shouldCheckRestrictedAccess) {
              const isRestricted = await isRoomAccessRestricted({
                clientKey: getOrCreateClientKey(),
                roomId: routeRoomId,
              });

              if (isCancelled) {
                return;
              }

              if (isRestricted) {
                goToRoomAccessRestricted(routeRoomId);
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
              showToast("최신 방 정보를 동기화하지 못했어요.");
            }
          }
        };

        void refresh();
      }, 120);
    };

    const subscription = subscribeToRoomChanges({
      roomId: routeRoomId,
      onChange: refreshRoomSnapshot,
      onStatusChange: (status) => {
        if (status === "SNAPSHOT_ERROR") {
          showToast(
            "실시간 연결에 문제가 있어요. 새로고침하면 최신 상태를 볼 수 있어요."
          );
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
    currentParticipantId,
    goToRoomAccessRestricted,
    navigate,
    routeRoomId,
    setStorage,
    showToast,
  ]);

  const toggleDate = async (isoDate: string) => {
    if (!currentRoom || !currentParticipant) {
      return;
    }

    if (isoDate < currentRoom.startDate || isoDate > currentRoom.endDate) {
      showToast("방에서 정한 날짜 범위 안에서만 선택할 수 있어요.");
      return;
    }

    const previousParticipant = currentParticipant;
    const updatedAt = new Date().toISOString();
    const nextOverrides = { ...currentParticipant.overrides };
    const currentOverride = nextOverrides[isoDate];
    const nextStatus =
      currentOverride === currentParticipant.selectionMode
        ? null
        : currentParticipant.selectionMode;

    if (nextStatus === null) {
      delete nextOverrides[isoDate];
    } else {
      nextOverrides[isoDate] = nextStatus;
    }

    const nextParticipant = {
      ...currentParticipant,
      overrides: nextOverrides,
      updatedAt,
    };

    updateCurrentParticipant(nextParticipant);

    if (!isFirebaseConfigured) {
      return;
    }

    try {
      await setParticipantDateOverride({
        clientKey: getOrCreateClientKey(),
        participantId: nextParticipant.id,
        roomId: currentRoom.id,
        overrides: nextParticipant.overrides,
      });
    } catch {
      updateCurrentParticipant(previousParticipant);
      showToast("날짜 선택을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.");
    }
  };

  const moveVisibleMonth = (offset: number) => {
    if (!currentRoom) {
      return;
    }

    setVisibleMonth((previous) =>
      clampVisibleMonth(
        currentRoom,
        addMonths(previous || currentRoom.startDate, offset)
      )
    );
  };

  return {
    currentParticipant,
    currentRoom,
    currentRoomSummary,
    currentRoute: route,
    isHydratingRoom,
    isCurrentUserHost,
    moveVisibleMonth,
    toggleDate,
    setVisibleMonth: (date: string) => setVisibleMonth(date),
  };
}
