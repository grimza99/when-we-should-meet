import { useState } from "react";
import { ARIA_LABELS } from "../../lib/ariaLabels";
import { Button } from "../ui/Button";
import { TextInput } from "../ui/TextInput";
import type { Participant, Room } from "../../types";
import { useRoomActions } from "../../hooks/useRoomActions";
interface IControlGroupSectionProps {
  currentNickname: string;
  currentParticipant: Participant;
  room: Room;
}
export default function ControlGroupSection({
  currentNickname,
  currentParticipant,
  room,
}: IControlGroupSectionProps) {
  const [isSavingNickname, setIsSavingNickname] = useState(false);
  const [isDeletingRoom, setIsDeletingRoom] = useState(false);
  const [isLeavingRoom, setIsLeavingRoom] = useState(false);
  const [nickname, setNickname] = useState(currentNickname);

  const trimmedNickname = nickname.trim();

  const isCurrentUserHost =
    Boolean(currentParticipant.id) &&
    currentParticipant.id === room?.hostClientKey;
  const { changeNickname, deleteRoom, leaveRoom } = useRoomActions({
    isCurrentUserHost,
    participant: currentParticipant,
    room,
  });

  const submitNicknameChange = async () => {
    if (!trimmedNickname || isSavingNickname) {
      return;
    }

    setIsSavingNickname(true);

    try {
      await changeNickname(trimmedNickname);
    } finally {
      setIsSavingNickname(false);
    }
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
      await deleteRoom();
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
      await leaveRoom();
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
