import { trackShareEvent } from "../../integrations/firebase/analytics";
import {
  isKakaoConfigured,
  shareRoomWithKakao,
} from "../../integrations/kakao/client";
import { ARIA_LABELS } from "../../lib/ariaLabels";
import { useToast } from "../shell/toast/toast-context";
import { Button } from "../ui/Button";

interface IInviteSectionProps {
  inviteCode: string;
  roomId: string;
}
export default function InviteSection({
  inviteCode,
  roomId,
}: IInviteSectionProps) {
  const { showToast } = useToast();
  const copyInviteCode = async () => {
    if (!inviteCode) return;
    try {
      await navigator.clipboard.writeText(inviteCode);
      showToast({ msg: "초대 코드가 복사되었어요." });
    } catch {
      showToast({ msg: "복사에 실패했어요. 브라우저 권한을 확인해 주세요." });
    }
  };
  const shareRoom = async () => {
    if (!roomId || !inviteCode) {
      return;
    }

    const roomUrl = new URL(
      `/room/${roomId}`,
      window.location.origin
    ).toString();
    const shareData = {
      title: "when should we meet?",
      text: `초대 코드 ${inviteCode}로 방에 참여해 주세요.`,
      url: roomUrl,
    };

    try {
      if (isKakaoConfigured) {
        void trackShareEvent({
          eventName: "share_room_click",
          method: "kakao",
        });
        await shareRoomWithKakao({
          inviteCode,
          roomId,
        });
        showToast({ msg: "카카오톡 공유 창을 열었어요." });
        return;
      }

      if (navigator.share) {
        void trackShareEvent({
          eventName: "share_room_click",
          method: "web_share",
        });
        await navigator.share(shareData);
        showToast({ msg: "공유 시트를 열었어요." });
        return;
      }

      void trackShareEvent({
        eventName: "share_room_click",
        method: "clipboard",
      });
      await navigator.clipboard.writeText(shareData.url);
      showToast({ msg: "공유 링크를 복사했어요." });
    } catch {
      showToast({ msg: "공유를 완료하지 못했어요." });
    }
  };
  return (
    <div className="header-actions">
      <Button
        ariaLabel={ARIA_LABELS.room.copyInviteCodeButton}
        onClick={copyInviteCode}
        variant="chip"
      >
        입장 코드 복사
      </Button>
      <Button
        ariaLabel={ARIA_LABELS.room.shareRoomButton}
        onClick={shareRoom}
        variant="chip"
      >
        공유
      </Button>
    </div>
  );
}
