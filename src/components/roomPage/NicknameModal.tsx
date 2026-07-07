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
import type { AppStorage } from "../../types";
import { DEFAULT_STORAGE, STORAGE_KEY } from "../../lib/constants";
import { mapParticipantRow } from "../../integrations/firebase/mapper";
import { useRouteState } from "../../lib/router";
import { joinRoom as joinFirebaseRoom } from "../../integrations/firebase/services/room-service";

type NicknameModalProps = {
  onClose: () => void;
};

export function NicknameModal({ onClose }: NicknameModalProps) {
  const [nickname, setNickname] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [storage, setStorage] = useLocalStorageState<AppStorage>(
    STORAGE_KEY,
    DEFAULT_STORAGE
  );
  const { route } = useRouteState();
  const { showToast } = useToast();

  const currentRoom =
    route.name === "room" ? storage.rooms[route.roomId] : undefined;
  const currentParticipantId =
    route.name === "room" ? storage.memberships[route.roomId] : undefined;
  const currentParticipant = currentRoom?.participants.find(
    (participant) => participant.id === currentParticipantId
  );
  const joinCurrentRoom = async (nickname: string) => {
    if (!currentRoom || currentParticipant) {
      return false;
    }

    if (currentRoom.participants.length >= currentRoom.maxParticipants) {
      showToast({ msg: "이 방은 정원이 모두 찼어요." });
      return false;
    }

    if (!isFirebaseConfigured) {
      const nextParticipant = createParticipant(
        currentRoom,
        getOrCreateClientKey()
      );

      nextParticipant.nickname = nickname;
      showToast({ msg: `${nickname} 님으로 방에 참여했어요.` });

      setStorage((previous) => {
        const previousRoom = previous.rooms[currentRoom.id];

        if (!previousRoom) {
          return previous;
        }

        return {
          ...previous,
          rooms: {
            ...previous.rooms,
            [currentRoom.id]: {
              ...previousRoom,
              participants: [...previousRoom.participants, nextParticipant],
            },
          },
          memberships: {
            ...previous.memberships,
            [currentRoom.id]: nextParticipant.id,
          },
        };
      });
      return true;
    }

    try {
      const participantRow = await joinFirebaseRoom({
        clientKey: getOrCreateClientKey(),
        nickname,
        roomId: currentRoom.id,
      });

      const nextParticipant = mapParticipantRow(participantRow);

      showToast({ msg: `${nickname} 님으로 방에 참여했어요.` });
      setStorage((previous) => {
        const previousRoom = previous.rooms[currentRoom.id];

        if (!previousRoom) {
          return previous;
        }

        return {
          ...previous,
          rooms: {
            ...previous.rooms,
            [currentRoom.id]: {
              ...previousRoom,
              participants: upsertParticipant(
                previousRoom.participants,
                nextParticipant
              ),
            },
          },
          memberships: {
            ...previous.memberships,
            [currentRoom.id]: nextParticipant.id,
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
