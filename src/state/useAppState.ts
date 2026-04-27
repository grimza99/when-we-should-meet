import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocalStorageState } from "../hooks/useLocalStorageState";
import {
  addMonths,
  buildCalendarDays,
  buildRankings,
  clampVisibleMonth,
  formatMonthLabel,
} from "../lib/date";
import {
  COLOR_PALETTE,
  DEFAULT_STORAGE,
  MODE_LABELS,
  WEEKDAY_LABELS,
} from "../lib/constants";
import { useRouteState } from "../lib/router";
import { getOrCreateClientKey } from "../lib/session/clientIdentity";
import { isFirebaseConfigured } from "../integrations/firebase/client";
import {
  isKakaoConfigured,
  shareRoomWithKakao,
} from "../integrations/kakao/client";
import {
  createRoom as createFirebaseRoom,
  deleteRoom as deleteFirebaseRoom,
  getRoomByInviteCode,
  getRoomSnapshot,
  joinRoom as joinFirebaseRoom,
  isRoomAccessRestricted,
  leaveRoom as leaveFirebaseRoom,
  mapParticipantRow,
  mapRoomRowToDraftRoom,
  mapRoomSnapshotToDraftRoom,
  removeParticipant as removeFirebaseParticipant,
  restoreParticipant,
  setParticipantDateOverride,
  subscribeToRoomChanges,
  unsubscribeFromRoomChanges,
  updateParticipantAvailability,
  updateParticipantNickname,
  type RoomChangeSubscription,
} from "../integrations/firebase/services/roomService";
import type {
  AppStorage,
  CreateRoomPayload,
  DateMode,
  Participant,
  Room,
} from "../types";

const STORAGE_KEY = "when-should-we-meet-storage";

export function useAppState() {
  const { navigate, route } = useRouteState();
  const [storage, setStorage] = useLocalStorageState<AppStorage>(
    STORAGE_KEY,
    DEFAULT_STORAGE
  );
  const [joinInviteCode, setJoinInviteCode] = useState("");
  const [toastMessage, setToastMessage] = useState("");
  const [visibleMonth, setVisibleMonth] = useState("");
  const [isHydratingRoom, setIsHydratingRoom] = useState(false);
  const roomChangeSubscriptionRef = useRef<RoomChangeSubscription | null>(null);
  const toastTimerRef = useRef<number | null>(null);

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

  const goToRoomAccessRestricted = useCallback((roomId: string) => {
    setStorage((previous) => ({
      ...previous,
      memberships: updateMembership(previous.memberships, roomId, undefined),
    }))
    setRoomMessage("이 방은 다시 입장할 수 없도록 제한되었어요.")
    navigate({ name: "room_access_restricted", roomId }, { replace: true })
  }, [navigate, setStorage])

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

  const showToast = (message: string) => {
    setToastMessage(message);

    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }

    toastTimerRef.current = window.setTimeout(() => {
      setToastMessage("");
      toastTimerRef.current = null;
    }, 3000);
  };

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

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
        let restoredParticipant = null

        try {
          restoredParticipant = await restoreParticipant({
            clientKey: getOrCreateClientKey(),
            roomId: routeRoomId,
          })
        } catch (error) {
          if (String(error).includes("ROOM_ACCESS_RESTRICTED")) {
            if (!isCancelled) {
              goToRoomAccessRestricted(routeRoomId)
            }
            return
          }

          throw error
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
              )

            if (shouldCheckRestrictedAccess) {
              const isRestricted = await isRoomAccessRestricted({
                clientKey: getOrCreateClientKey(),
                roomId: routeRoomId,
              })

              if (isCancelled) {
                return
              }

              if (isRestricted) {
                goToRoomAccessRestricted(routeRoomId)
                return
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
                [room.id]: room,
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
  }, [currentParticipantId, goToRoomAccessRestricted, routeRoomId, setStorage]);

  const createRoom = async (payload: CreateRoomPayload) => {
    const hostClientKey = getOrCreateClientKey();

    if (!isFirebaseConfigured) {
      const room = createRoomRecord(payload, hostClientKey);

      setStorage((previous) => ({
        ...previous,
        rooms: {
          ...previous.rooms,
          [room.id]: room,
        },
      }));

      setVisibleMonth(room.startDate);
      navigate({ name: "room", roomId: room.id });
      return true;
    }

    try {
      const roomRow = await createFirebaseRoom({
        ...payload,
        hostClientKey,
      });
      const room = mapRoomRowToDraftRoom(roomRow);

      setStorage((previous) => ({
        ...previous,
        rooms: {
          ...previous.rooms,
          [room.id]: room,
        },
      }));

      setVisibleMonth(room.startDate);
      navigate({ name: "room", roomId: room.id });
      return true;
    } catch {
      showToast("방 생성에 실패했어요. 잠시 후 다시 시도해 주세요.");
      return false;
    }
  };

  const joinRoomByInviteCode = async () => {
    const inviteCode = joinInviteCode.trim().toUpperCase();
    if (!inviteCode) {
      showToast("초대 코드를 입력해 주세요.");
      return false;
    }

    if (!isFirebaseConfigured) {
      const room = Object.values(storage.rooms).find(
        (candidate) => candidate.inviteCode === inviteCode
      );

      if (!room) {
        showToast("일치하는 방을 찾지 못했어요. 코드를 다시 확인해 주세요.");
        return false;
      }

      setVisibleMonth(room.startDate);
      navigate({ name: "room", roomId: room.id });
      return true;
    }

    try {
      const roomRow = await getRoomByInviteCode(inviteCode);

      if (!roomRow) {
        showToast("일치하는 방을 찾지 못했어요. 코드를 다시 확인해 주세요.");
        return false;
      }

      const roomSnapshot = await getRoomSnapshot(roomRow.id);
      const room = roomSnapshot
        ? mapRoomSnapshotToDraftRoom(roomSnapshot)
        : mapRoomRowToDraftRoom(roomRow);

      try {
        await restoreParticipant({
          clientKey: getOrCreateClientKey(),
          roomId: room.id,
        })
      } catch (error) {
        if (String(error).includes("ROOM_ACCESS_RESTRICTED")) {
          goToRoomAccessRestricted(room.id)
          setLandingMessage("")
          return false
        }

        throw error
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

      setVisibleMonth(room.startDate);
      navigate({ name: "room", roomId: room.id });
      return true;
    } catch {
      showToast("방 조회에 실패했어요. 네트워크 상태를 확인해 주세요.");
      return false;
    }
  };

  const joinCurrentRoom = async (nickname: string) => {
    if (!currentRoom || currentParticipant) {
      return false;
    }

    if (currentRoom.participants.length >= currentRoom.maxParticipants) {
      showToast("이 방은 정원이 모두 찼어요.");
      return false;
    }

    if (!isFirebaseConfigured) {
      const nextParticipant = createParticipant(
        currentRoom,
        getOrCreateClientKey()
      );

      nextParticipant.nickname = nickname;
      showToast(`${nickname} 님으로 방에 참여했어요.`);

      setStorage((previous) => ({
        rooms: {
          ...previous.rooms,
          [currentRoom.id]: {
            ...currentRoom,
            participants: [...currentRoom.participants, nextParticipant],
          },
        },
        memberships: {
          ...previous.memberships,
          [currentRoom.id]: nextParticipant.id,
        },
      }));
      return true;
    }

    try {
      const participantRow = await joinFirebaseRoom({
        clientKey: getOrCreateClientKey(),
        nickname,
        roomId: currentRoom.id,
      });

      const nextParticipant = mapParticipantRow(participantRow);

      showToast(`${nickname} 님으로 방에 참여했어요.`);
      setStorage((previous) => ({
        rooms: {
          ...previous.rooms,
          [currentRoom.id]: {
            ...currentRoom,
            participants: upsertParticipant(
              currentRoom.participants,
              nextParticipant
            ),
          },
        },
        memberships: {
          ...previous.memberships,
          [currentRoom.id]: nextParticipant.id,
        },
      }));
      return true;
    } catch (error) {
      const errorMessage = String(error);
      showToast(
        errorMessage.includes("ROOM_CAPACITY_REACHED")
          ? "이 방은 정원이 모두 찼어요."
          : "방 참여에 실패했어요. 잠시 후 다시 시도해 주세요."
      );
      return false;
    }
  };

  const changeSelectionMode = async (mode: DateMode) => {
    if (!currentRoom || !currentParticipant) {
      return;
    }

    const previousParticipant = currentParticipant;
    const nextParticipant = {
      ...currentParticipant,
      selectionMode: mode,
    };

    updateCurrentParticipant(nextParticipant);

    if (!isFirebaseConfigured) {
      return;
    }

    try {
      await updateParticipantAvailability({
        clientKey: getOrCreateClientKey(),
        participantId: nextParticipant.id,
        roomId: currentRoom.id,
        selectionMode: nextParticipant.selectionMode,
        weekdayRules: nextParticipant.weekdayRules,
      });
    } catch {
      updateCurrentParticipant(previousParticipant);
      showToast("선택 방식을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.");
    }
  };

  const toggleWeekday = async (weekday: number) => {
    if (!currentRoom || !currentParticipant) {
      return;
    }

    const previousParticipant = currentParticipant;
    const weekdayRules = currentParticipant.weekdayRules.includes(weekday)
      ? currentParticipant.weekdayRules.filter((value) => value !== weekday)
      : [...currentParticipant.weekdayRules, weekday].sort(
          (left, right) => left - right
        );

    const nextParticipant = {
      ...currentParticipant,
      weekdayRules,
    };

    updateCurrentParticipant(nextParticipant);

    if (!isFirebaseConfigured) {
      return;
    }

    try {
      await updateParticipantAvailability({
        clientKey: getOrCreateClientKey(),
        participantId: nextParticipant.id,
        roomId: currentRoom.id,
        selectionMode: nextParticipant.selectionMode,
        weekdayRules: nextParticipant.weekdayRules,
      });
    } catch {
      updateCurrentParticipant(previousParticipant);
      showToast("요일 규칙을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.");
    }
  };

  const toggleDate = async (isoDate: string) => {
    if (!currentRoom || !currentParticipant) {
      return;
    }

    const previousParticipant = currentParticipant;
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
        status: nextStatus,
        targetDate: isoDate,
      });
    } catch {
      updateCurrentParticipant(previousParticipant);
      showToast("날짜 선택을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.");
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
    const nextParticipant = {
      ...currentParticipant,
      nickname: trimmedNickname,
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

  const updateCurrentParticipant = (nextParticipant: Participant) => {
    if (!currentRoom) {
      return;
    }

    setStorage((previous) => ({
      ...previous,
      rooms: {
        ...previous.rooms,
        [currentRoom.id]: {
          ...currentRoom,
          participants: currentRoom.participants.map((participant) =>
            participant.id === nextParticipant.id
              ? nextParticipant
              : participant
          ),
        },
      },
    }));
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

  const copyInviteCode = async () => {
    if (!currentRoom) {
      return;
    }

    try {
      await navigator.clipboard.writeText(currentRoom.inviteCode);
      showToast("초대 코드가 복사되었어요.");
    } catch {
      showToast("복사에 실패했어요. 브라우저 권한을 확인해 주세요.");
    }
  };

  const shareRoom = async () => {
    if (!currentRoom) {
      return;
    }

    try {
      if (isKakaoConfigured) {
        await shareRoomWithKakao({
          inviteCode: currentRoom.inviteCode,
          roomId: currentRoom.id,
        });
        return;
      } else {
        showToast(
          "링크를 복사하는데 문제가 생겼어요, 대신 초대코드로 입장할수있어요!"
        );
      }
      showToast("공유 링크를 복사했어요.");
    } catch {
      showToast("공유를 완료하지 못했어요.");
    }
  };

  return {
    changeSelectionMode,
    copyInviteCode,
    createRoom,
    currentParticipant,
    currentRoom,
    currentRoomSummary,
    currentRoute: route,
    deleteCurrentRoom,
    goToLanding: () => navigate({ name: "landing" }),
    isHydratingRoom,
    isCurrentUserHost,
    joinCurrentRoom,
    leaveCurrentRoom,
    joinInviteCode,
    joinRoomByInviteCode,
    modeOptions: (Object.keys(MODE_LABELS) as DateMode[]).map((value) => ({
      label: MODE_LABELS[value],
      value,
    })),
    moveVisibleMonth,
    selectedMode: currentParticipant?.selectionMode ?? "available",
    setJoinInviteCode,
    shareRoom,
    changeNickname,
    removeParticipant,
    toggleDate,
    toastMessage,
    toggleWeekday,
    weekdayOptions: WEEKDAY_LABELS.map((label, value) => ({
      label,
      value,
      selected: currentParticipant?.weekdayRules.includes(value) ?? false,
    })),
  };
}

function createRoomRecord(
  payload: CreateRoomPayload,
  hostClientKey: string
): Room {
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  return {
    id,
    inviteCode: id.slice(0, 6).toUpperCase(),
    maxParticipants: payload.maxParticipants,
    dateRangeType: payload.dateRangeType,
    startDate: payload.startDate,
    endDate: payload.endDate,
    createdAt,
    expiresAt: addOneMonth(createdAt),
    hostClientKey,
    participants: [],
  };
}

function createParticipant(
  room: Room,
  participantId: string = crypto.randomUUID()
): Participant {
  const usedColorIndexes = new Set(
    room.participants.map((participant) => participant.colorIndex)
  );
  const colorIndex =
    COLOR_PALETTE.findIndex((_, index) => !usedColorIndexes.has(index)) === -1
      ? 0
      : COLOR_PALETTE.findIndex((_, index) => !usedColorIndexes.has(index));

  return {
    id: participantId,
    nickname: "",
    colorIndex,
    selectionMode: "available",
    weekdayRules: [],
    overrides: {},
  };
}

function addOneMonth(isoDate: string) {
  const expiresAt = new Date(isoDate);
  expiresAt.setMonth(expiresAt.getMonth() + 1);
  return expiresAt.toISOString();
}

function updateMembership(
  memberships: AppStorage["memberships"],
  roomId: string,
  participantId: string | undefined
) {
  const nextMemberships = { ...memberships };

  if (participantId) {
    nextMemberships[roomId] = participantId;
  } else {
    delete nextMemberships[roomId];
  }

  return nextMemberships;
}

function upsertParticipant(
  participants: Participant[],
  nextParticipant: Participant
) {
  const existing = participants.some(
    (participant) => participant.id === nextParticipant.id
  );

  if (!existing) {
    return [...participants, nextParticipant];
  }

  return participants.map((participant) =>
    participant.id === nextParticipant.id ? nextParticipant : participant
  );
}

function mergeRoomSnapshot(
  previousRoom: Room | undefined,
  nextRoom: Room,
  localParticipantId: string | undefined
) {
  if (!previousRoom || !localParticipantId) {
    return nextRoom;
  }

  const localParticipant = previousRoom.participants.find(
    (participant) => participant.id === localParticipantId
  );

  if (!localParticipant) {
    return nextRoom;
  }

  const mergedParticipants = nextRoom.participants.map((participant) =>
    participant.id === localParticipant.id
      ? {
          ...participant,
          selectionMode: localParticipant.selectionMode,
          weekdayRules: localParticipant.weekdayRules,
          overrides: localParticipant.overrides,
        }
      : participant
  );

  return {
    ...nextRoom,
    participants: mergedParticipants.some(
      (participant) => participant.id === localParticipant.id
    )
      ? mergedParticipants
      : upsertParticipant(mergedParticipants, localParticipant),
  };
}
