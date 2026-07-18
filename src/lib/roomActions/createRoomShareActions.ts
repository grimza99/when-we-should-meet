import { trackShareEvent } from "../../integrations/firebase/analytics";
import {
  isKakaoConfigured,
  shareRankingWithKakao,
  shareRoomWithKakao,
} from "../../integrations/kakao/client";
import type { Room, RoomSummary } from "../../types";
import type { RoomActionContext } from "./shared";

type CreateRoomShareActionsParams = {
  context: Pick<RoomActionContext, "showToast">;
  room?: Room | null;
  roomSummary?: RoomSummary;
};

export function createRoomShareActions({
  context,
  room,
  roomSummary,
}: CreateRoomShareActionsParams) {
  const { showToast } = context;

  const copyInviteCode = async () => {
    if (!room?.inviteCode) {
      return;
    }

    try {
      await navigator.clipboard.writeText(room.inviteCode);
      showToast({ msg: "초대 코드가 복사되었어요." });
    } catch {
      showToast({ msg: "복사에 실패했어요. 브라우저 권한을 확인해 주세요." });
    }
  };

  const shareRoom = async () => {
    if (!room?.id || !room.inviteCode) {
      return;
    }

    const roomUrl = new URL(
      `/room/${room.id}`,
      window.location.origin
    ).toString();
    const shareData = {
      title: "when should we meet?",
      text: `초대 코드 ${room.inviteCode}로 방에 참여해 주세요.`,
      url: roomUrl,
    };

    try {
      if (isKakaoConfigured) {
        void trackShareEvent({
          eventName: "share_room_click",
          method: "kakao",
        });
        await shareRoomWithKakao({
          inviteCode: room.inviteCode,
          roomId: room.id,
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

  const shareRanking = async () => {
    if (!room || !roomSummary) {
      return;
    }

    const roomUrl = new URL(
      `/room/${room.id}`,
      window.location.origin
    ).toString();
    const topRankings = roomSummary.rankings.slice(0, 3);
    const rankingText =
      topRankings.length > 0
        ? topRankings
            .map(
              (ranking) =>
                `${ranking.rank}위 ${ranking.label} · ${ranking.score}명 가능`
            )
            .join("\n")
        : "아직 공유할 랭킹이 없어요.";
    const shareText = `우리 언제 볼까? 일정 랭킹이에요.\n${rankingText}`;

    try {
      if (isKakaoConfigured) {
        void trackShareEvent({
          eventName: "share_ranking_click",
          method: "kakao",
        });
        await shareRankingWithKakao({
          roomId: room.id,
          text: shareText,
        });
        showToast({ msg: "카카오톡 공유 창을 열었어요" });
        return;
      }

      if (navigator.share) {
        void trackShareEvent({
          eventName: "share_ranking_click",
          method: "web_share",
        });
        await navigator.share({
          text: shareText,
          title: "when should we meet?",
          url: roomUrl,
        });
        showToast({ msg: "공유 시트를 열었어요." });
        return;
      }

      void trackShareEvent({
        eventName: "share_ranking_click",
        method: "clipboard",
      });
      await navigator.clipboard.writeText(`${shareText}\n${roomUrl}`);
      showToast({ msg: "랭킹 공유 문구를 복사했어요." });
    } catch {
      showToast({ msg: "랭킹을 공유하지 못했어요" });
    }
  };

  return {
    copyInviteCode,
    shareRanking,
    shareRoom,
  };
}
