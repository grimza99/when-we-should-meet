import { getDoc } from "firebase/firestore";
import { isFirebaseConfigured } from "./client";
import { roomRef } from "./docs";
import { FIREBASE } from "../../lib/constants";

export type FirebaseAvailabilityStatus =
  | "available"
  | "unavailable"
  | "unknown";

let availabilityStatus: FirebaseAvailabilityStatus = "unknown";
let availabilityProbePromise: Promise<FirebaseAvailabilityStatus> | null = null;

export function getFirebaseAvailabilityStatus() {
  return availabilityStatus;
}

export async function probeFirebaseAvailability(options?: { force?: boolean }) {
  if (!isFirebaseConfigured || typeof window === "undefined") {
    availabilityStatus = "unknown";
    return availabilityStatus;
  }

  if (!window.navigator.onLine) {
    availabilityStatus = "unavailable";
    return availabilityStatus;
  }

  if (!options?.force && availabilityStatus === "available") {
    return availabilityStatus;
  }

  if (!options?.force && availabilityProbePromise) {
    return availabilityProbePromise;
  }

  availabilityProbePromise = (async () => {
    try {
      await getDoc(roomRef(FIREBASE.CONNECTIVITY_PROBE_ROOM_ID));
      availabilityStatus = "available";
      return availabilityStatus;
    } catch {
      availabilityStatus = "unavailable";
      return availabilityStatus;
    } finally {
      availabilityProbePromise = null;
    }
  })();

  return availabilityProbePromise;
}
