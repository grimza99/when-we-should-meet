import { useEffect } from "react";
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

function AppContent() {
  const appState = useAppState();

  useEffect(() => {
    void trackPageView(appState.currentRoute);
  }, [appState.currentRoute]);

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
          isHydratingRoom={appState.isHydratingRoom}
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
