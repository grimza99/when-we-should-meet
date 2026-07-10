import { useCallback, useEffect, useRef } from "react";
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
import { mergeRoomSnapshot } from "./util/room";
import { useLocalStorageState } from "./hooks/useLocalStorageState";
import type { RoomChangeSubscription } from "./types";
import { updateMembership } from "./util/participant";

function AppContent() {
  const {
    currentParticipant,
    currentRoom,
    setVisibleMonth,
    currentRoomSummary,
    moveVisibleMonth,
    isCurrentUserHost,
  } = useAppState();

  const [, setStorage] = useLocalStorageState();
  const { showToast } = useToast();
  const { navigate, route } = useRouteState();
  const roomChangeSubscriptionRef = useRef<RoomChangeSubscription | null>(null);

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
    void trackPageView(route);
  }, [route]);

  useEffect(() => {
    if (!isFirebaseConfigured || !currentRoom.id) {
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
            const roomSnapshot = await getRoomSnapshot(currentRoom.id);

            if (isCancelled) {
              return;
            }

            if (!roomSnapshot) {
              setStorage((previous) => {
                const rooms = { ...previous.rooms };
                const memberships = { ...previous.memberships };

                delete rooms[currentRoom.id];
                delete memberships[currentRoom.id];

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
              Boolean(currentParticipant.id) &&
              !room.participants.some(
                (participant) => participant.id === currentParticipant.id
              );

            if (shouldCheckRestrictedAccess) {
              const isRestricted = await isRoomAccessRestricted({
                clientKey: getOrCreateClientKey(),
                roomId: currentRoom.id,
              });

              if (isCancelled) {
                return;
              }

              if (isRestricted) {
                goToRoomAccessRestricted(currentRoom.id);
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
      roomId: currentRoom.id,
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
  }, [currentParticipant.id, navigate, currentRoom.id, setStorage, showToast]);

  return (
    <>
      {route.name === "landing" ? (
        <LandingPage setVisibleMonth={setVisibleMonth} />
      ) : route.name === "report" ? (
        <ReportPage />
      ) : route.name === "room_access_restricted" ? (
        <RoomAccessRestrictedPage />
      ) : route.name === "not-found-room" ? (
        <NotFoundRoomPage />
      ) : (
        <RoomPage
          currentParticipant={currentParticipant}
          room={currentRoom}
          roomSummary={currentRoomSummary}
          onMoveMonth={moveVisibleMonth}
          isCurrentUserHost={isCurrentUserHost}
        />
      )}
      {route.name !== "report" && <ReportEntryButton />}
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
