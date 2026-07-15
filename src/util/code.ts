/**----------------------------------------------- 유니크 참가 코드 만들기 -------------------------------------------------- */

import { getDoc } from "firebase/firestore";
import { inviteCodeRef } from "../integrations/firebase/docs";

export const createUniqueInviteCode = async () => {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const inviteCode = crypto
      .randomUUID()
      .replace(/-/g, "")
      .slice(0, 6)
      .toUpperCase();
    const existingInviteCode = await getDoc(inviteCodeRef(inviteCode));

    if (!existingInviteCode.exists()) {
      return inviteCode;
    }
  }

  throw new Error("INVITE_CODE_COLLISION");
};
