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
import { DEFAULT_STORAGE, STORAGE_KEY } from "../lib/constants";
import { useRouteState } from "../lib/router";
import { getOrCreateClientKey } from "../lib/session/clientIdentity";
import { isFirebaseConfigured } from "../integrations/firebase/client";
import {
  isKakaoConfigured,
  shareRankingWithKakao,
} from "../integrations/kakao/client";
import { trackShareEvent } from "../integrations/firebase/analytics";
import {
  deleteRoom as deleteFirebaseRoom,
  getRoomSnapshot,
  isRoomAccessRestricted,
  leaveRoom as leaveFirebaseRoom,
  subscribeToRoomChanges,
  unsubscribeFromRoomChanges,
} from "../integrations/firebase/services/room-service";
import type { AppStorage, RoomChangeSubscription } from "../types";
import { mapRoomSnapshotToDraftRoom } from "../integrations/firebase/mapper";
import {
  restoreParticipant,
  resetParticipantSelections as resetFirebaseParticipantSelections,
  removeParticipant as removeFirebaseParticipant,
  updateParticipantNickname,
  setParticipantDateOverride,
} from "../integrations/firebase/services/participant-service";
import { updateMembership } from "../util/participant";
import { mergeRoomSnapshot } from "../util/room";
import { useCurrentParticipantUpdater } from "../hooks/useParticipant";

export function useAppState() {
  const { navigate, route } = useRouteState();
  const { showToast: emitToast } = useToast();
  const updateCurrentParticipant = useCurrentParticipantUpdater();
  const [storage, setStorage] = useLocalStorageState<AppStorage>(
    STORAGE_KEY,
    DEFAULT_STORAGE
  );
  const [visibleMonth, setVisibleMonth] = useState("");
  const [isHydratingRoom, setIsHydratingRoom] = useState(false);
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
              memberships:
                previous.memberships[room.id] &&
                !room.participants.some(
                  (participant) =>
                    participant.id === previous.memberships[room.id]
                )
                  ? updateMembership(previous.memberships, room.id, undefined)
                  : previous.memberships,
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

  const resetCurrentSelection = async () => {
    if (!currentRoom || !currentParticipant) {
      return;
    }

    const hasSelectionToReset =
      currentParticipant.weekdayRules.length > 0 ||
      Object.keys(currentParticipant.overrides).length > 0;

    if (!hasSelectionToReset) {
      return;
    }

    const previousParticipant = currentParticipant;
    const updatedAt = new Date().toISOString();
    const nextParticipant = {
      ...currentParticipant,
      overrides: {},
      updatedAt,
      weekdayRules: [],
    };

    updateCurrentParticipant(nextParticipant);
    showToast("선택한 날짜와 요일 규칙을 초기화했어요.");

    if (!isFirebaseConfigured) {
      return;
    }

    try {
      await resetFirebaseParticipantSelections({
        clientKey: getOrCreateClientKey(),
        participantId: nextParticipant.id,
        roomId: currentRoom.id,
      });
    } catch {
      updateCurrentParticipant(previousParticipant);
      showToast("선택 내용을 초기화하지 못했어요. 잠시 후 다시 시도해 주세요.");
    }
  };

  const changeNickname = async (nickname: string) => {
    if (!currentRoom || !currentParticipant) {
      return false;
    }

    const trimmedNickname = nickname.trim();

    if (!trimmedNickname) {
      showToast("닉네임을 입력해 주세요.");
      return false;
    }

    const previousParticipant = currentParticipant;
    const updatedAt = new Date().toISOString();
    const nextParticipant = {
      ...currentParticipant,
      nickname: trimmedNickname,
      updatedAt,
    };

    updateCurrentParticipant(nextParticipant);
    showToast("닉네임을 변경했어요.");

    if (!isFirebaseConfigured) {
      return true;
    }

    try {
      await updateParticipantNickname({
        clientKey: getOrCreateClientKey(),
        nickname: trimmedNickname,
        participantId: nextParticipant.id,
        roomId: currentRoom.id,
      });
      return true;
    } catch {
      updateCurrentParticipant(previousParticipant);
      showToast("닉네임을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.");
      return false;
    }
  };

  const removeParticipant = async (participantId: string) => {
    if (!currentRoom || !isCurrentUserHost) {
      showToast("방장만 참가자를 관리할 수 있어요.");
      return false;
    }

    if (participantId === currentRoom.hostClientKey) {
      showToast("방장은 참가자 목록에서 제거할 수 없어요.");
      return false;
    }

    const previousRoom = currentRoom;
    const nextRoom = {
      ...currentRoom,
      participants: currentRoom.participants.filter(
        (participant) => participant.id !== participantId
      ),
    };

    setStorage((previous) => ({
      ...previous,
      rooms: {
        ...previous.rooms,
        [currentRoom.id]: nextRoom,
      },
    }));
    showToast("참가자를 내보냈어요.");

    if (!isFirebaseConfigured) {
      return true;
    }

    try {
      await removeFirebaseParticipant({
        hostClientKey: getOrCreateClientKey(),
        participantId,
        roomId: currentRoom.id,
      });
      return true;
    } catch {
      setStorage((previous) => ({
        ...previous,
        rooms: {
          ...previous.rooms,
          [previousRoom.id]: previousRoom,
        },
      }));
      showToast("참가자를 내보내지 못했어요. 잠시 후 다시 시도해 주세요.");
      return false;
    }
  };

  const leaveCurrentRoom = async () => {
    if (!currentRoom || !currentParticipant) {
      return false;
    }

    if (isCurrentUserHost) {
      showToast("방장은 방을 나갈 수 없어요. 방 삭제 기능을 사용해 주세요.");
      return false;
    }

    const roomId = currentRoom.id;
    const participantId = currentParticipant.id;

    if (isFirebaseConfigured) {
      try {
        await leaveFirebaseRoom({
          clientKey: getOrCreateClientKey(),
          participantId,
          roomId,
        });
      } catch {
        showToast("방을 나가지 못했어요. 잠시 후 다시 시도해 주세요.");
        return false;
      }
    }

    setStorage((previous) => {
      const nextRoom = previous.rooms[roomId]
        ? {
            ...previous.rooms[roomId],
            participants: previous.rooms[roomId].participants.filter(
              (participant) => participant.id !== participantId
            ),
          }
        : undefined;
      const memberships = updateMembership(
        previous.memberships,
        roomId,
        undefined
      );

      return {
        ...previous,
        memberships,
        rooms: nextRoom
          ? {
              ...previous.rooms,
              [roomId]: nextRoom,
            }
          : previous.rooms,
      };
    });
    showToast("방에서 나갔어요.");
    navigate({ name: "landing" });

    return true;
  };

  const deleteCurrentRoom = async () => {
    if (!currentRoom || !isCurrentUserHost) {
      showToast("방장만 방을 삭제할 수 있어요.");
      return false;
    }

    const roomId = currentRoom.id;
    if (isFirebaseConfigured) {
      try {
        await deleteFirebaseRoom({
          hostClientKey: getOrCreateClientKey(),
          roomId,
        });
      } catch {
        showToast("방을 삭제하지 못했어요. 잠시 후 다시 시도해 주세요.");
        return false;
      }
    }

    setStorage((previous) => {
      const rooms = { ...previous.rooms };
      const memberships = { ...previous.memberships };

      delete rooms[roomId];
      delete memberships[roomId];

      return {
        ...previous,
        memberships,
        rooms,
      };
    });
    showToast("방을 삭제했어요.");
    navigate({ name: "landing" });

    return true;
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

  const shareRanking = async () => {
    if (!currentRoom || !currentRoomSummary) {
      return;
    }

    const roomUrl = new URL(
      `/room/${currentRoom.id}`,
      window.location.origin
    ).toString();
    const topRankings = currentRoomSummary.rankings.slice(0, 3);
    const rankingText =
      topRankings.length > 0
        ? topRankings
            .map(
              (ranking) =>
                `${ranking.rank}위 ${ranking.label} · ${ranking.score}명 가능`
            )
            .join("\n")
        : "아직 공유할 랭킹이 없어요.";
    const shareText = `우리 언제 볼까? 일정 랭킹이에요.\n${rankingText}`;

    try {
      if (isKakaoConfigured) {
        void trackShareEvent({
          eventName: "share_ranking_click",
          method: "kakao",
        });
        await shareRankingWithKakao({
          roomId: currentRoom.id,
          text: shareText,
        });
        showToast("카카오톡 공유 창을 열었어요.");
        return;
      }

      if (navigator.share) {
        void trackShareEvent({
          eventName: "share_ranking_click",
          method: "web_share",
        });
        await navigator.share({
          text: shareText,
          title: "when should we meet?",
          url: roomUrl,
        });
        showToast("공유 시트를 열었어요.");
        return;
      }

      void trackShareEvent({
        eventName: "share_ranking_click",
        method: "clipboard",
      });
      await navigator.clipboard.writeText(`${shareText}\n${roomUrl}`);
      showToast("랭킹 공유 문구를 복사했어요.");
    } catch {
      showToast("랭킹을 공유하지 못했어요.");
    }
  };

  return {
    currentParticipant,
    currentRoom,
    currentRoomSummary,
    currentRoute: route,
    deleteCurrentRoom,
    goToLanding: () => navigate({ name: "landing" }),
    goToReport: () => navigate({ name: "report" }),
    isHydratingRoom,
    isCurrentUserHost,
    leaveCurrentRoom,
    moveVisibleMonth,
    shareRanking,
    changeNickname,
    removeParticipant,
    resetCurrentSelection,
    toggleDate,
    setVisibleMonth: (date: string) => setVisibleMonth(date),
  };
}
