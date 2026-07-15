import { lazy, Suspense, useEffect } from "react";
import "./App.css";
import { LandingPage } from "./pages/LandingPage";
import { trackPageView } from "./integrations/firebase/analytics";
import { ReportEntryButton } from "./components/ui/ReportEntryButton";
import { AvailabilityGuard } from "./components/shell/AvailabilityGuard";
import { RouteErrorBoundary } from "./components/shell/RouteErrorBoundary";
import { ToastProvider } from "./components/shell/toast/ToastProvider";
import { useRouteState } from "./lib/router";

const RoomPage = lazy(() =>
  import("./pages/RoomPage").then((module) => ({
    default: module.RoomPage,
  }))
);

const ReportPage = lazy(() =>
  import("./pages/ReportPage").then((module) => ({
    default: module.ReportPage,
  }))
);

const RoomAccessRestrictedPage = lazy(() =>
  import("./pages/RoomAccessRestrictedPage").then((module) => ({
    default: module.RoomAccessRestrictedPage,
  }))
);

const NotFoundRoomPage = lazy(() => import("./pages/NotFoundRoomPage"));

export default function App() {
  const { route } = useRouteState();
  const routeResetKey =
    route.name === "room" || route.name === "room_access_restricted"
      ? `${route.name}:${route.roomId}`
      : route.name;

  useEffect(() => {
    void trackPageView(route);
  }, [route]);

  return (
    <div className="shell">
      <div className="mobile-frame">
        <ToastProvider>
          <AvailabilityGuard>
            <RouteErrorBoundary resetKey={routeResetKey}>
              <Suspense fallback={<RouteLoadingFallback />}>
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
              </Suspense>
            </RouteErrorBoundary>
            {route.name !== "report" && <ReportEntryButton />}
          </AvailabilityGuard>
        </ToastProvider>
      </div>
    </div>
  );
}

function RouteLoadingFallback() {
  return (
    <main className="page route-loading-page" aria-busy="true">
      <section className="hero-card route-loading-card">
        <h1>화면을 불러오는 중입니다</h1>
        <p className="hero-copy">잠시만 기다려 주세요.</p>
      </section>
    </main>
  );
}
