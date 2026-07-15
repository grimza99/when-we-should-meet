import { useEffect } from "react";
import "./App.css";
import { RoomAccessRestrictedPage } from "./pages/RoomAccessRestrictedPage";
import { LandingPage } from "./pages/LandingPage";
import { RoomPage } from "./pages/RoomPage";
import { trackPageView } from "./integrations/firebase/analytics";
import { ReportPage } from "./pages/ReportPage";
import { ReportEntryButton } from "./components/ui/ReportEntryButton";
import { FirebaseAvailabilityGuard } from "./components/shell/FirebaseAvailabilityGuard";
import { ToastProvider } from "./components/shell/toast/ToastProvider";
import NotFoundRoomPage from "./pages/NotFoundRoomPage";
import { useRouteState } from "./lib/router";

export default function App() {
  const { route } = useRouteState();

  useEffect(() => {
    void trackPageView(route);
  }, [route]);

  return (
    <div className="shell">
      <div className="mobile-frame">
        <ToastProvider>
          <FirebaseAvailabilityGuard />
          {route.name === "landing" ? (
            <LandingPage />
          ) : route.name === "report" ? (
            <ReportPage />
          ) : route.name === "room_access_restricted" ? (
            <RoomAccessRestrictedPage />
          ) : route.name === "not-found-room" ? (
            <NotFoundRoomPage />
          ) : (
            <RoomPage />
          )}
          {route.name !== "report" && <ReportEntryButton />}
        </ToastProvider>
      </div>
    </div>
  );
}
