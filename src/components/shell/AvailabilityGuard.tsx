import { useEffect, useState, type ReactNode } from "react";
import type { FirebaseAvailabilityStatus } from "../../integrations/firebase/availability";
import { isFirebaseConfigured } from "../../integrations/firebase/client";
import { probeFirebaseAvailability } from "../../integrations/firebase/availability";
import { FIREBASE } from "../../lib/constants";
import GuardPage from "../../pages/GuardPage";

type AvailabilityGuardProps = {
  children: ReactNode;
};

export function AvailabilityGuard({ children }: AvailabilityGuardProps) {
  const [firebaseAvailability, setFirebaseAvailability] =
    useState<FirebaseAvailabilityStatus>("unknown");
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (!isFirebaseConfigured || typeof window === "undefined") {
      return;
    }

    let isCancelled = false;
    let retryTimeoutId: number | undefined;

    const checkAvailability = async (allowRetry = true) => {
      setFirebaseAvailability("unknown");
      const firebaseStatus = await probeFirebaseAvailability({ force: true });

      if (isCancelled) {
        return;
      }

      if (firebaseStatus === "FirebaseAvailable") {
        setFirebaseAvailability("FirebaseAvailable");
        return;
      }

      if (allowRetry) {
        retryTimeoutId = window.setTimeout(() => {
          void checkAvailability(false);
        }, FIREBASE.AVAILABILITY_RETRY_DELAY_MS);
        return;
      }

      setFirebaseAvailability("FirebaseUnavailable");
    };

    const handleOnline = () => {
      if (retryTimeoutId) {
        window.clearTimeout(retryTimeoutId);
      }

      void checkAvailability(true);
    };

    void checkAvailability(true);

    window.addEventListener("online", handleOnline);

    return () => {
      isCancelled = true;

      if (retryTimeoutId) {
        window.clearTimeout(retryTimeoutId);
      }

      window.removeEventListener("online", handleOnline);
    };
  }, [retryKey]);

  const handleSetRetryKey = () => {
    setRetryKey((previous) => previous + 1);
  };

  const firebaseUnavailableDescription =
    "현재 브라우저 환경에서는 Firebase 연결이 차단되어 방 생성, 참여, 실시간 동기화를 사용할 수 없습니다.";

  const unavaliableDescription =
    firebaseAvailability === "FirebaseUnavailable"
      ? firebaseUnavailableDescription
      : "현재 브라우저 환경에서는 서비스를 사용할 수 없습니다.";

  const isAvailable = firebaseAvailability !== "FirebaseUnavailable";

  if (isAvailable) return <>{children}</>;

  return (
    <GuardPage
      description={unavaliableDescription}
      onRetry={handleSetRetryKey}
    />
  );
}
