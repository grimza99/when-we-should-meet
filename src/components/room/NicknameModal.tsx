import { useState } from 'react'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { TextInput } from '../ui/TextInput'

type NicknameModalProps = {
  onJoinRoom: (nickname: string) => void
}

export function NicknameModal({ onJoinRoom }: NicknameModalProps) {
  const [nickname, setNickname] = useState('')

  return (
    <Modal
      description="방 안에서 보일 닉네임을 입력하면 바로 참여합니다."
      title="닉네임 입력"
    >
      <div className="modal-body">
        <TextInput
          label="닉네임"
          onChange={setNickname}
          placeholder="예: 민준"
          value={nickname}
        />
        <Button block disabled={!nickname.trim()} onClick={() => onJoinRoom(nickname.trim())}>
          입장하기
        </Button>
      </div>
    </Modal>
  )
}
