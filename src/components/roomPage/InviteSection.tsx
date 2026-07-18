import { ARIA_LABELS } from "../../lib/ariaLabels";
import { Button } from "../ui/Button";

type InviteSectionProps = {
  onCopyInviteCode: () => Promise<void>;
  onShareRoom: () => Promise<void>;
};
export default function InviteSection({
  onCopyInviteCode,
  onShareRoom,
}: InviteSectionProps) {
  return (
    <div className="header-actions">
      <Button
        ariaLabel={ARIA_LABELS.room.copyInviteCodeButton}
        onClick={() => void onCopyInviteCode()}
        variant="chip"
      >
        입장 코드 복사
      </Button>
      <Button
        ariaLabel={ARIA_LABELS.room.shareRoomButton}
        onClick={() => void onShareRoom()}
        variant="chip"
      >
        공유
      </Button>
    </div>
  );
}
