import { useCallback, useEffect, useRef, useState } from "react";
import "./App.css";
import { RoomAccessRestrictedPage } from "./pages/RoomAccessRestrictedPage";
import { useAppState } from "./state/useAppState";
import { LandingPage } from "./pages/LandingPage";
import { RoomPage } from "./pages/RoomPage";
import { trackPageView } from "./integrations/firebase/analytics";
import { ReportPage } from "./pages/ReportPage";
import { ReportEntryButton } from "./components/ui/ReportEntryButton";
import { ToastProvider } from "./components/shell/toast/ToastProvider";
import NotFoundRoomPage from "./pages/NotFoundRoomPage";
import { isFirebaseConfigured } from "./integrations/firebase/client";
import { useToast } from "./components/shell/toast/toast-context";
import {
  getRoomSnapshot,
  isRoomAccessRestricted,
  subscribeToRoomChanges,
  unsubscribeFromRoomChanges,
} from "./integrations/firebase/services/room-service";
import { useRouteState } from "./lib/router";
import { mapRoomSnapshotToDraftRoom } from "./integrations/firebase/mapper";
import { getOrCreateClientKey } from "./lib/session/clientIdentity";
import { restoreParticipant } from "./integrations/firebase/services/participant-service";
import { mergeRoomSnapshot } from "./util/room";
import { updateMembership } from "./util/participant";
import { useLocalStorageState } from "./hooks/useLocalStorageState";
import type { RoomChangeSubscription } from "./types";

function AppContent() {
  const appState = useAppState();
  const [isHydratingRoom, setIsHydratingRoom] = useState(false);
  const [, setStorage] = useLocalStorageState();
  const { showToast } = useToast();
  const { navigate } = useRouteState();
  const roomChangeSubscriptionRef = useRef<RoomChangeSubscription | null>(null);

  const hasCurrentParticipant = Boolean(appState.currentParticipant);
  const needsRoomSnapshot = Boolean(
    appState.currentRoom.id &&
      (!appState.currentRoom ||
        (appState.currentParticipant.id !== undefined &&
          !hasCurrentParticipant))
  );

  useEffect(() => {
    void trackPageView(appState.currentRoute);
  }, [appState.currentRoute]);
  const goToRoomAccessRestricted = useCallback(
    (roomId: string) => {
      setStorage((previous) => ({
        ...previous,
        memberships: updateMembership(previous.memberships, roomId, undefined),
      }));
      showToast({
        msg: "이 방은 다시 입장할 수 없도록 제한되었어요.",
      });
      navigate({ name: "room_access_restricted", roomId }, { replace: true });
    },
    [showToast, navigate, setStorage]
  );
  useEffect(() => {
    if (!isFirebaseConfigured || !appState.currentRoom.id) {
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
            const roomSnapshot = await getRoomSnapshot(appState.currentRoom.id);

            if (isCancelled) {
              return;
            }

            if (!roomSnapshot) {
              setStorage((previous) => {
                const rooms = { ...previous.rooms };
                const memberships = { ...previous.memberships };

                delete rooms[appState.currentRoom.id];
                delete memberships[appState.currentRoom.id];

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
              Boolean(appState.currentParticipant.id) &&
              !room.participants.some(
                (participant) =>
                  participant.id === appState.currentParticipant.id
              );

            if (shouldCheckRestrictedAccess) {
              const isRestricted = await isRoomAccessRestricted({
                clientKey: getOrCreateClientKey(),
                roomId: appState.currentRoom.id,
              });

              if (isCancelled) {
                return;
              }

              if (isRestricted) {
                goToRoomAccessRestricted(appState.currentRoom.id);
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
      roomId: appState.currentRoom.id,
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
    appState.currentParticipant.id,
    navigate,
    appState.currentRoom.id,
    setStorage,
    showToast,
  ]);

  useEffect(() => {
    if (!isFirebaseConfigured || !appState.currentRoom.id) {
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
        const roomSnapshot = await getRoomSnapshot(appState.currentRoom.id);

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
            roomId: appState.currentRoom.id,
          });
        } catch (error) {
          if (String(error).includes("ROOM_ACCESS_RESTRICTED")) {
            if (!isCancelled) {
              goToRoomAccessRestricted(appState.currentRoom.id);
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

    void hydrateRoom();

    return () => {
      isCancelled = true;
    };
  }, [
    appState.currentParticipant.id,
    goToRoomAccessRestricted,
    hasCurrentParticipant,
    appState.currentRoom,
    navigate,
    needsRoomSnapshot,
    appState.currentRoom.id,
    setStorage,
    showToast,
  ]);
  return (
    <>
      {appState.currentRoute.name === "landing" ? (
        <LandingPage setVisibleMonth={appState.setVisibleMonth} />
      ) : appState.currentRoute.name === "report" ? (
        <ReportPage />
      ) : appState.currentRoute.name === "room_access_restricted" ? (
        <RoomAccessRestrictedPage />
      ) : appState.currentRoute.name === "not-found-room" ? (
        <NotFoundRoomPage />
      ) : (
        <RoomPage
          currentParticipant={appState.currentParticipant}
          isHydratingRoom={isHydratingRoom}
          room={appState.currentRoom}
          roomSummary={appState.currentRoomSummary}
          onMoveMonth={appState.moveVisibleMonth}
          isCurrentUserHost={appState.isCurrentUserHost}
        />
      )}
      {appState.currentRoute.name !== "report" && <ReportEntryButton />}
    </>
  );
}

function App() {
  return (
    <div className="shell">
      <div className="mobile-frame">
        <ToastProvider>
          <AppContent />
        </ToastProvider>
      </div>
    </div>
  );
}

export default App;
