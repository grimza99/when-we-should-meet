import { useEffect, useRef } from "react";
import { isFirebaseConfigured } from "../../integrations/firebase/client";
import { probeFirebaseAvailability } from "../../integrations/firebase/availability";
import { FIREBASE } from "../../lib/constants";

export function FirebaseAvailabilityGuard() {
  const hasShownUnavailableToastRef = useRef(false);

  useEffect(() => {
    if (!isFirebaseConfigured || typeof window === "undefined") {
      return;
    }

    let isCancelled = false;
    let retryTimeoutId: number | undefined;

    const checkAvailability = async (allowRetry = true) => {
      const status = await probeFirebaseAvailability({ force: true });

      if (isCancelled) {
        return;
      }

      if (status === "available") {
        hasShownUnavailableToastRef.current = false;
        return;
      }

      if (allowRetry) {
        retryTimeoutId = window.setTimeout(() => {
          void checkAvailability(false);
        }, FIREBASE.AVAILABILITY_RETRY_DELAY_MS);
        return;
      }

      if (!hasShownUnavailableToastRef.current) {
        hasShownUnavailableToastRef.current = true;
        //사용자에게 알림UI
      }
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
  }, []);

  return null;
}
