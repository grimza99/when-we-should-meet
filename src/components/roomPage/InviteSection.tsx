import { ARIA_LABELS } from "../../lib/ariaLabels";
import type { Room } from "../../types";
import { useRoomActions } from "../../hooks/useRoomActions";
import { Button } from "../ui/Button";

type InviteSectionProps = {
  room: Room;
};
export default function InviteSection({ room }: InviteSectionProps) {
  const { copyInviteCode, shareRoom } = useRoomActions({ room });

  return (
    <div className="header-actions">
      <Button
        ariaLabel={ARIA_LABELS.room.copyInviteCodeButton}
        onClick={() => void copyInviteCode()}
        variant="chip"
      >
        입장 코드 복사
      </Button>
      <Button
        ariaLabel={ARIA_LABELS.room.shareRoomButton}
        onClick={() => void shareRoom()}
        variant="chip"
      >
        공유
      </Button>
    </div>
  );
}
