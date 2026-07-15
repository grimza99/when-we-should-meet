import { useState } from "react";
import { ARIA_LABELS } from "../../lib/ariaLabels";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";
import { TextInput } from "../ui/TextInput";
import { useToast } from "../shell/toast/toast-context";
import { isFirebaseConfigured } from "../../integrations/firebase/client";
import { createParticipant, upsertParticipant } from "../../util/participant";
import { getOrCreateClientKey } from "../../lib/session/clientIdentity";
import { useLocalStorageState } from "../../hooks/useLocalStorageState";
import type { Participant, Room } from "../../types";
import { mapParticipantRow } from "../../integrations/firebase/mapper";
import { joinRoom as joinFirebaseRoom } from "../../integrations/firebase/services/room-service";

type NicknameModalProps = {
  currentParticipant?: Participant;
  onClose: () => void;
  room: Room;
};

export function NicknameModal({
  currentParticipant,
  onClose,
  room,
}: NicknameModalProps) {
  const [nickname, setNickname] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [, setStorage] = useLocalStorageState();
  const { showToast } = useToast();
  const joinCurrentRoom = async (nickname: string) => {
    if (currentParticipant) {
      return false;
    }

    if (room.participants.length >= room.maxParticipants) {
      showToast({ msg: "이 방은 정원이 모두 찼어요." });
      return false;
    }

    if (!isFirebaseConfigured) {
      const nextParticipant = createParticipant(room, getOrCreateClientKey());

      nextParticipant.nickname = nickname;
      showToast({ msg: `${nickname} 님으로 방에 참여했어요.` });

      setStorage((previous) => {
        const previousRoom = previous.rooms[room.id];

        if (!previousRoom) {
          return previous;
        }

        return {
          ...previous,
          rooms: {
            ...previous.rooms,
            [room.id]: {
              ...previousRoom,
              participants: [...previousRoom.participants, nextParticipant],
            },
          },
          memberships: {
            ...previous.memberships,
            [room.id]: nextParticipant.id,
          },
        };
      });
      return true;
    }

    try {
      const participantRow = await joinFirebaseRoom({
        clientKey: getOrCreateClientKey(),
        nickname,
        roomId: room.id,
      });

      const nextParticipant = mapParticipantRow(participantRow);

      showToast({ msg: `${nickname} 님으로 방에 참여했어요.` });
      setStorage((previous) => {
        const previousRoom = previous.rooms[room.id];

        if (!previousRoom) {
          return previous;
        }

        return {
          ...previous,
          rooms: {
            ...previous.rooms,
            [room.id]: {
              ...previousRoom,
              participants: upsertParticipant(
                previousRoom.participants,
                nextParticipant
              ),
            },
          },
          memberships: {
            ...previous.memberships,
            [room.id]: nextParticipant.id,
          },
        };
      });
      return true;
    } catch (error) {
      const errorMessage = String(error);
      showToast({
        msg: errorMessage.includes("ROOM_CAPACITY_REACHED")
          ? "이 방은 정원이 모두 찼어요."
          : "방 참여에 실패했어요. 잠시 후 다시 시도해 주세요.",
      });
      return false;
    }
  };

  const submit = async () => {
    const trimmedNickname = nickname.trim();

    if (!trimmedNickname || isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      const didJoinRoom = await joinCurrentRoom(trimmedNickname);

      if (didJoinRoom) {
        onClose();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      ariaLabel={ARIA_LABELS.nickname.dialog}
      description="방안에서 보여질 별명을 입력해주세요."
      onClose={onClose}
      title="별명 입력"
      closeButtonVisible={false}
    >
      <div className="modal-body">
        <TextInput
          ariaLabel={ARIA_LABELS.nickname.input}
          label="별명"
          onChange={setNickname}
          placeholder="예: 민준"
          value={nickname}
        />
        <Button
          ariaLabel={ARIA_LABELS.nickname.submitButton}
          block
          disabled={!nickname.trim() || isSubmitting}
          onClick={() => void submit()}
        >
          {isSubmitting ? "입장 중..." : "입장하기"}
        </Button>
      </div>
    </Modal>
  );
}
