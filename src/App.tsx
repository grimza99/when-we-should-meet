import { useEffect, useState } from "react";
import "./App.css";
import { RoomAccessRestrictedPage } from "./pages/RoomAccessRestrictedPage";
import { LandingPage } from "./pages/LandingPage";
import { RoomPage } from "./pages/RoomPage";
import { trackPageView } from "./integrations/firebase/analytics";
import { ReportPage } from "./pages/ReportPage";
import { ReportEntryButton } from "./components/ui/ReportEntryButton";
import { ToastProvider } from "./components/shell/toast/ToastProvider";
import NotFoundRoomPage from "./pages/NotFoundRoomPage";
import { useRouteState } from "./lib/router";

function AppContent() {
  const [visibleMonth, setVisibleMonth] = useState("");

  const { route } = useRouteState();

  useEffect(() => {
    void trackPageView(route);
  }, [route]);

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
          setVisibleMonth={setVisibleMonth}
          visibleMonth={visibleMonth}
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
