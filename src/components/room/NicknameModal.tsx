import { useState } from "react";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";
import { TextInput } from "../ui/TextInput";

type NicknameModalProps = {
  onJoinRoom: (nickname: string) => Promise<boolean>;
  onClose: () => void;
};

export function NicknameModal({ onClose, onJoinRoom }: NicknameModalProps) {
  const [nickname, setNickname] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async () => {
    const trimmedNickname = nickname.trim();

    if (!trimmedNickname || isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      const didJoinRoom = await onJoinRoom(trimmedNickname);

      if (didJoinRoom) {
        onClose();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      description="방안에서 보여질 별명을 입력해주세요."
      onClose={onClose}
      title="별명 입력"
      closeButtonVisible={false}
    >
      <div className="modal-body">
        <TextInput
          label="별명"
          onChange={setNickname}
          placeholder="예: 민준"
          value={nickname}
        />
        <Button
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
