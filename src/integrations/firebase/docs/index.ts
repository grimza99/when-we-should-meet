import { doc } from "firebase/firestore";
import { db } from "../client";

export const roomRef = (roomId: string) => {
  return doc(db, "rooms", roomId);
};

export const inviteCodeRef = (inviteCode: string) => {
  return doc(db, "inviteCodes", inviteCode);
};

export const participantRef = (roomId: string, participantId: string) => {
  return doc(db, "rooms", roomId, "participants", participantId);
};
