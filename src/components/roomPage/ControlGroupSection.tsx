import { useState } from "react";
import { ARIA_LABELS } from "../../lib/ariaLabels";
import { Button } from "../ui/Button";
import { TextInput } from "../ui/TextInput";
import { useToast } from "../shell/toast/toast-context";
import { isFirebaseConfigured } from "../../integrations/firebase/client";
import { updateParticipantNickname } from "../../integrations/firebase/services/participant-service";
import { getOrCreateClientKey } from "../../lib/session/clientIdentity";
import { useLocalStorageState } from "../../hooks/useLocalStorageState";
import type { Participant, Room } from "../../types";
import { useCurrentParticipantUpdater } from "../../hooks/useParticipant";
import {
  deleteRoom as deleteFirebaseRoom,
  leaveRoom as leaveFirebaseRoom,
} from "../../integrations/firebase/services/room-service";
import { useRouteState } from "../../lib/router";
import { updateMembership } from "../../util/participant";
interface IControlGroupSectionProps {
  currentNickname: string;
  currentParticipant: Participant;
  roomId: string;
  room: Room;
}
export default function ControlGroupSection({
  currentNickname,
  currentParticipant,
  roomId,
  room,
}: IControlGroupSectionProps) {
  const [isSavingNickname, setIsSavingNickname] = useState(false);
  const [isDeletingRoom, setIsDeletingRoom] = useState(false);
  const [isLeavingRoom, setIsLeavingRoom] = useState(false);
  const [nickname, setNickname] = useState(currentNickname);
  const { showToast } = useToast();
  const [, setStorage] = useLocalStorageState();

  const { navigate } = useRouteState();

  const updateCurrentParticipant = useCurrentParticipantUpdater();

  const trimmedNickname = nickname.trim();

  const isCurrentUserHost =
    Boolean(currentParticipant.id) &&
    currentParticipant.id === room?.hostClientKey;
  const submitNicknameChange = async () => {
    if (!trimmedNickname || isSavingNickname) {
      return;
    }

    setIsSavingNickname(true);

    try {
      await changeNickname();
    } finally {
      setIsSavingNickname(false);
    }
  };

  const changeNickname = async () => {
    if (!trimmedNickname) {
      showToast({ msg: "닉네임을 입력해 주세요." });
      return false;
    }

    const previousParticipant = currentParticipant;
    const updatedAt = new Date().toISOString();
    const nextParticipant = {
      ...currentParticipant,
      nickname: trimmedNickname,
      updatedAt,
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
        roomId,
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

  const deleteCurrentRoom = async () => {
    if (!isCurrentUserHost) {
      showToast({ msg: "방장만 방을 삭제할 수 있어요." });
      return false;
    }

    if (isFirebaseConfigured) {
      try {
        await deleteFirebaseRoom({
          hostClientKey: getOrCreateClientKey(),
          roomId,
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

      delete rooms[roomId];
      delete memberships[roomId];
      delete visibleMonthsByRoomId[roomId];

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
  const leaveCurrentRoom = async () => {
    if (isCurrentUserHost) {
      showToast({
        msg: "방장은 방을 나갈 수 없어요. 방 삭제 기능을 사용해 주세요.",
      });
      return false;
    }
    if (!room || !currentParticipant || !room.id || !currentParticipant.id)
      return false;

    const roomId = room.id;
    const participantId = currentParticipant.id;

    if (isFirebaseConfigured) {
      try {
        await leaveFirebaseRoom({
          clientKey: getOrCreateClientKey(),
          participantId,
          roomId,
        });
      } catch {
        showToast({ msg: "방을 나가지 못했어요. 잠시 후 다시 시도해 주세요." });
        return false;
      }
    }

    setStorage((previous) => {
      const nextRoom = previous.rooms[roomId]
        ? {
            ...previous.rooms[roomId],
            participants: previous.rooms[roomId].participants.filter(
              (participant) => participant.id !== participantId
            ),
          }
        : undefined;
      const memberships = updateMembership(
        previous.memberships,
        roomId,
        undefined
      );
      const visibleMonthsByRoomId = { ...previous.visibleMonthsByRoomId };

      delete visibleMonthsByRoomId[roomId];

      return {
        ...previous,
        memberships,
        visibleMonthsByRoomId,
        rooms: nextRoom
          ? {
              ...previous.rooms,
              [roomId]: nextRoom,
            }
          : previous.rooms,
      };
    });
    showToast({ msg: "방에서 나갔어요." });
    navigate({ name: "landing" });

    return true;
  };
  const submitDeleteRoom = async () => {
    if (
      isDeletingRoom ||
      !window.confirm("이 방과 참가자 정보를 모두 삭제할까요?")
    ) {
      return;
    }

    setIsDeletingRoom(true);

    try {
      await deleteCurrentRoom();
    } finally {
      setIsDeletingRoom(false);
    }
  };

  const submitLeaveRoom = async () => {
    if (
      isLeavingRoom ||
      !window.confirm(
        "이 방에서 나가면 선택한 날짜도 함께 사라집니다. 나갈까요?"
      )
    ) {
      return;
    }

    setIsLeavingRoom(true);

    try {
      await leaveCurrentRoom();
    } finally {
      setIsLeavingRoom(false);
    }
  };
  return (
    <section className="controls-card">
      <div className="control-group">
        <p className="section-label">관리</p>
        <div className="nickname-edit-row">
          <TextInput
            ariaLabel={ARIA_LABELS.room.nicknameInput}
            label="닉네임"
            onChange={setNickname}
            placeholder="새 닉네임"
            value={nickname}
            inputStyle={{ minHeight: "40px" }}
          />
          <Button
            ariaLabel={ARIA_LABELS.room.nicknameSaveButton}
            disabled={
              !trimmedNickname ||
              trimmedNickname === currentParticipant.nickname ||
              isSavingNickname
            }
            onClick={() => void submitNicknameChange()}
            variant="secondary"
            style={{ minHeight: "40px" }}
          >
            {isSavingNickname ? "저장 중..." : "변경"}
          </Button>
        </div>
      </div>

      <div className="control-group danger-zone">
        {isCurrentUserHost ? (
          <Button
            ariaLabel={ARIA_LABELS.room.deleteRoomButton}
            block
            disabled={isDeletingRoom}
            onClick={() => void submitDeleteRoom()}
            variant="secondary"
          >
            {isDeletingRoom ? "삭제 중..." : "방 삭제"}
          </Button>
        ) : (
          <Button
            ariaLabel={ARIA_LABELS.room.leaveRoomButton}
            block
            disabled={isLeavingRoom}
            onClick={() => void submitLeaveRoom()}
            variant="secondary"
          >
            {isLeavingRoom ? "나가는 중..." : "방 나가기"}
          </Button>
        )}
      </div>
    </section>
  );
}
