import { useState } from 'react'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { TextInput } from '../ui/TextInput'

type NicknameModalProps = {
  onJoinRoom: (nickname: string) => Promise<boolean>
  onClose: () => void
}

export function NicknameModal({ onClose, onJoinRoom }: NicknameModalProps) {
  const [nickname, setNickname] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const submit = async () => {
    const trimmedNickname = nickname.trim()

    if (!trimmedNickname || isSubmitting) {
      return
    }

    setIsSubmitting(true)

    try {
      const didJoinRoom = await onJoinRoom(trimmedNickname)

      if (didJoinRoom) {
        onClose()
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      description="방 안에서 보일 닉네임을 입력하면 바로 참여합니다."
      onClose={onClose}
      title="닉네임 입력"
    >
      <div className="modal-body">
        <TextInput
          label="닉네임"
          onChange={setNickname}
          placeholder="예: 민준"
          value={nickname}
        />
        <Button
          block
          disabled={!nickname.trim() || isSubmitting}
          onClick={() => void submit()}
        >
          {isSubmitting ? '입장 중...' : '입장하기'}
        </Button>
      </div>
    </Modal>
  )
}
