import { useLocalStorageState } from "./useLocalStorageState";
import { useCurrentParticipantUpdater } from "./useParticipant";
import { useToast } from "../components/shell/toast/toast-context";
import { useRouteState } from "../lib/router";
import { getOrCreateClientKey } from "../lib/session/clientIdentity";
import { isFirebaseConfigured } from "../integrations/firebase/client";
import {
  removeParticipant as removeFirebaseParticipant,
  resetParticipantSelections as resetFirebaseParticipantSelections,
  setParticipantDateOverride,
  updateParticipantAvailability,
  updateParticipantNickname,
} from "../integrations/firebase/services/participant-service";
import {
  deleteRoom as deleteFirebaseRoom,
  leaveRoom as leaveFirebaseRoom,
} from "../integrations/firebase/services/room-service";
import { trackShareEvent } from "../integrations/firebase/analytics";
import {
  isKakaoConfigured,
  shareRankingWithKakao,
  shareRoomWithKakao,
} from "../integrations/kakao/client";
import { convertParticipantSelectionMode } from "../lib/date";
import { WEEKDAY_LABELS } from "../lib/constants";
import { updateMembership } from "../util/participant";
import type { DateMode, Participant, Room, RoomSummary } from "../types";

type UseRoomActionsParams = {
  room?: Room | null;
  participant?: Participant | null;
  roomSummary?: RoomSummary;
  isCurrentUserHost?: boolean;
};

export const useRoomActions = ({
  room,
  participant,
  roomSummary,
  isCurrentUserHost = false,
}: UseRoomActionsParams) => {
  const [, setStorage] = useLocalStorageState();
  const updateCurrentParticipant = useCurrentParticipantUpdater();
  const { navigate } = useRouteState();
  const { showToast } = useToast();

  // 선택 초기화
  const resetSelections = async () => {
    if (!room || !participant) {
      return;
    }

    const previousParticipant = participant;
    const nextParticipant = {
      ...participant,
      overrides: {},
      updatedAt: new Date().toISOString(),
      weekdayRules: [],
    };

    updateCurrentParticipant(nextParticipant);
    showToast({ msg: "선택한 날짜와 요일 규칙을 초기화했어요." });

    if (!isFirebaseConfigured) {
      return;
    }

    try {
      await resetFirebaseParticipantSelections({
        clientKey: getOrCreateClientKey(),
        participantId: nextParticipant.id,
        roomId: room.id,
      });
    } catch {
      updateCurrentParticipant(previousParticipant);
      showToast({
        msg: "선택 내용을 초기화하지 못했어요. 잠시 후 다시 시도해 주세요.",
      });
    }
  };

  // 날짜 직접 선택
  const toggleDate = async (isoDate: string) => {
    if (!room || !participant) {
      return;
    }

    if (isoDate < room.startDate || isoDate > room.endDate) {
      showToast({ msg: "방에서 정한 날짜 범위 안에서만 선택할 수 있어요." });
      return;
    }

    const previousParticipant = participant;
    const nextOverrides = { ...participant.overrides };
    const currentOverride = nextOverrides[isoDate];
    const nextStatus =
      currentOverride === participant.selectionMode
        ? null
        : participant.selectionMode;

    if (nextStatus === null) {
      delete nextOverrides[isoDate];
    } else {
      nextOverrides[isoDate] = nextStatus;
    }

    const nextParticipant = {
      ...participant,
      overrides: nextOverrides,
      updatedAt: new Date().toISOString(),
    };

    updateCurrentParticipant(nextParticipant);

    if (!isFirebaseConfigured) {
      return;
    }

    try {
      await setParticipantDateOverride({
        clientKey: getOrCreateClientKey(),
        participantId: nextParticipant.id,
        roomId: room.id,
        overrides: nextParticipant.overrides,
      });
    } catch {
      updateCurrentParticipant(previousParticipant);
      showToast({
        msg: "날짜 선택을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.",
      });
    }
  };

  // 선택모드 변경 (가능모드-available , 불가능모드-unabailable)
  const changeSelectionMode = async (mode: DateMode) => {
    if (!room || !participant) {
      return;
    }

    const previousParticipant = participant;
    const nextSelection = convertParticipantSelectionMode(
      room,
      participant,
      mode
    );
    const nextParticipant = {
      ...participant,
      overrides: nextSelection.overrides,
      selectionMode: nextSelection.selectionMode,
      updatedAt: new Date().toISOString(),
      weekdayRules: nextSelection.weekdayRules,
    };

    updateCurrentParticipant(nextParticipant);
    showToast({
      msg:
        mode === "available"
          ? "가능한 날짜를 고르는 모드로 바뀌었어요."
          : "불가능한 날짜를 고르는 모드로 바뀌었어요.",
    });

    if (!isFirebaseConfigured) {
      return;
    }

    try {
      await updateParticipantAvailability({
        clientKey: getOrCreateClientKey(),
        overrides: nextParticipant.overrides,
        participantId: nextParticipant.id,
        roomId: room.id,
        selectionMode: nextParticipant.selectionMode,
        weekdayRules: nextParticipant.weekdayRules,
      });
    } catch {
      updateCurrentParticipant(previousParticipant);
      showToast({
        msg: "선택 방식을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.",
      });
    }
  };

  // 날짜 규칙 (매주0요일)
  const toggleWeekday = async (weekday: number) => {
    if (!room || !participant) {
      return;
    }

    const previousParticipant = participant;
    const weekdayRules = participant.weekdayRules.includes(weekday)
      ? participant.weekdayRules.filter((value) => value !== weekday)
      : [...participant.weekdayRules, weekday].sort(
          (left, right) => left - right
        );
    const nextParticipant = {
      ...participant,
      updatedAt: new Date().toISOString(),
      weekdayRules,
    };

    updateCurrentParticipant(nextParticipant);
    showToast({ msg: `${WEEKDAY_LABELS[weekday]}요일 규칙을 업데이트했어요.` });

    if (!isFirebaseConfigured) {
      return;
    }

    try {
      await updateParticipantAvailability({
        clientKey: getOrCreateClientKey(),
        overrides: nextParticipant.overrides,
        participantId: nextParticipant.id,
        roomId: room.id,
        selectionMode: nextParticipant.selectionMode,
        weekdayRules: nextParticipant.weekdayRules,
      });
    } catch {
      updateCurrentParticipant(previousParticipant);
      showToast({
        msg: "요일 규칙을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.",
      });
    }
  };

  // 닉네임 변경
  const changeNickname = async (nickname: string) => {
    if (!room || !participant) {
      return false;
    }

    const trimmedNickname = nickname.trim();

    if (!trimmedNickname) {
      showToast({ msg: "닉네임을 입력해 주세요." });
      return false;
    }

    const previousParticipant = participant;
    const nextParticipant = {
      ...participant,
      nickname: trimmedNickname,
      updatedAt: new Date().toISOString(),
    };

    updateCurrentParticipant(nextParticipant);
    showToast({ msg: "닉네임을 변경했어요." });

    if (!isFirebaseConfigured) {
      return true;
    }

    try {
      await updateParticipantNickname({
        clientKey: getOrCreateClientKey(),
        nickname: trimmedNickname,
        participantId: nextParticipant.id,
        roomId: room.id,
      });
      return true;
    } catch {
      updateCurrentParticipant(previousParticipant);
      showToast({
        msg: "닉네임을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.",
      });
      return false;
    }
  };

  // 방떠나기
  const leaveRoom = async () => {
    if (!room || !participant) {
      return false;
    }

    if (isCurrentUserHost) {
      showToast({
        msg: "방장은 방을 나갈 수 없어요. 방 삭제 기능을 사용해 주세요.",
      });
      return false;
    }

    if (isFirebaseConfigured) {
      try {
        await leaveFirebaseRoom({
          clientKey: getOrCreateClientKey(),
          participantId: participant.id,
          roomId: room.id,
        });
      } catch {
        showToast({ msg: "방을 나가지 못했어요. 잠시 후 다시 시도해 주세요." });
        return false;
      }
    }

    setStorage((previous) => {
      const nextRoom = previous.rooms[room.id]
        ? {
            ...previous.rooms[room.id],
            participants: previous.rooms[room.id].participants.filter(
              (storedParticipant) => storedParticipant.id !== participant.id
            ),
          }
        : undefined;
      const memberships = updateMembership(
        previous.memberships,
        room.id,
        undefined
      );
      const visibleMonthsByRoomId = { ...previous.visibleMonthsByRoomId };

      delete visibleMonthsByRoomId[room.id];

      return {
        ...previous,
        memberships,
        visibleMonthsByRoomId,
        rooms: nextRoom
          ? {
              ...previous.rooms,
              [room.id]: nextRoom,
            }
          : previous.rooms,
      };
    });
    showToast({ msg: "방에서 나갔어요." });
    navigate({ name: "landing" });

    return true;
  };

  //방삭제
  const deleteRoom = async () => {
    if (!room || !isCurrentUserHost) {
      showToast({ msg: "방장만 방을 삭제할 수 있어요." });
      return false;
    }

    if (isFirebaseConfigured) {
      try {
        await deleteFirebaseRoom({
          hostClientKey: getOrCreateClientKey(),
          roomId: room.id,
        });
      } catch {
        showToast({
          msg: "방을 삭제하지 못했어요. 잠시 후 다시 시도해 주세요.",
        });
        return false;
      }
    }

    setStorage((previous) => {
      const rooms = { ...previous.rooms };
      const memberships = { ...previous.memberships };
      const visibleMonthsByRoomId = { ...previous.visibleMonthsByRoomId };

      delete rooms[room.id];
      delete memberships[room.id];
      delete visibleMonthsByRoomId[room.id];

      return {
        ...previous,
        memberships,
        rooms,
        visibleMonthsByRoomId,
      };
    });
    showToast({ msg: "방을 삭제했어요." });
    navigate({ name: "landing" });

    return true;
  };

  // 참가자 제거
  const removeParticipant = async (participantId: string) => {
    if (!room || !isCurrentUserHost) {
      showToast({ msg: "방장만 참가자를 관리할 수 있어요." });
      return false;
    }

    if (participantId === room.hostClientKey) {
      showToast({ msg: "방장은 참가자 목록에서 제거할 수 없어요." });
      return false;
    }

    const previousRoom = room;
    const nextRoom = {
      ...room,
      participants: room.participants.filter(
        (roomParticipant) => roomParticipant.id !== participantId
      ),
    };

    setStorage((previous) => ({
      ...previous,
      rooms: {
        ...previous.rooms,
        [room.id]: nextRoom,
      },
    }));
    showToast({ msg: "참가자를 내보냈어요." });

    if (!isFirebaseConfigured) {
      return true;
    }

    try {
      await removeFirebaseParticipant({
        hostClientKey: getOrCreateClientKey(),
        participantId,
        roomId: room.id,
      });
      return true;
    } catch {
      setStorage((previous) => ({
        ...previous,
        rooms: {
          ...previous.rooms,
          [previousRoom.id]: previousRoom,
        },
      }));
      showToast({
        msg: "참가자를 내보내지 못했어요. 잠시 후 다시 시도해 주세요.",
      });
      return false;
    }
  };

  // 초대코드복사
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

  //랭킹공유
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
    changeNickname,
    changeSelectionMode,
    copyInviteCode,
    deleteRoom,
    leaveRoom,
    removeParticipant,
    resetSelections,
    shareRanking,
    shareRoom,
    toggleDate,
    toggleWeekday,
  };
};
