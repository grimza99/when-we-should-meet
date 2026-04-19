import { useState } from 'react'
import { CreateRoomModal } from '../components/room/CreateRoomModal'
import { Button } from '../components/ui/Button'
import { TextInput } from '../components/ui/TextInput'
import { normalizeInviteCodeInput } from '../lib/inviteCode'
import type { CreateRoomPayload } from '../types'

type LandingPageProps = {
  joinInviteCode: string
  message: string
  onCreateRoom: (payload: CreateRoomPayload) => Promise<boolean>
  onJoinInviteCodeChange: (inviteCode: string) => void
  onJoinRoom: () => Promise<boolean>
}

export function LandingPage({
  joinInviteCode,
  message,
  onCreateRoom,
  onJoinInviteCodeChange,
  onJoinRoom,
}: LandingPageProps) {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isJoiningRoom, setIsJoiningRoom] = useState(false)

  const submitJoin = async () => {
    if (isJoiningRoom) {
      return
    }

    setIsJoiningRoom(true)

    try {
      await onJoinRoom()
    } finally {
      setIsJoiningRoom(false)
    }
  }

  return (
    <main className="page landing-page">
      <section className="hero-card">
        <p className="eyebrow">when should we meet?</p>
        <h1>채팅 대신 달력에서 날짜를 정해요</h1>
        <p className="hero-copy">
          친구, 가족, 지인과 함께 가능한 날짜를 고르고 가장 좋은 날짜를 바로
          확인하는 가벼운 일정 조율 도구입니다.
        </p>
      </section>

      <section className="panel stack-gap">
        <Button block onClick={() => setIsCreateModalOpen(true)}>
          방 만들기
        </Button>

        <div className="divider" />

        <div className="join-block">
          <TextInput
            autoCapitalize="characters"
            autoCorrect="off"
            id="invite-code"
            inputMode="text"
            label="초대 코드로 참여하기"
            maxLength={6}
            onChange={(value) => onJoinInviteCodeChange(normalizeInviteCodeInput(value))}
            placeholder="예: ABC123"
            spellCheck={false}
            value={joinInviteCode}
          />
          <Button
            block
            disabled={!joinInviteCode.trim() || isJoiningRoom}
            variant="secondary"
            onClick={() => void submitJoin()}
          >
            {isJoiningRoom ? '참여 중...' : '참여하기'}
          </Button>
          {message ? <p className="inline-feedback">{message}</p> : null}
        </div>
      </section>

      <section className="info-grid">
        <article className="mini-card">
          <strong>가입 없음</strong>
          <p>링크나 코드만 있으면 바로 입장합니다.</p>
        </article>
        <article className="mini-card">
          <strong>모바일 중심</strong>
          <p>모든 기기에서 동일한 모바일 폭 UI로 동작합니다.</p>
        </article>
        <article className="mini-card">
          <strong>상위 날짜 집계</strong>
          <p>가장 많이 가능한 날짜 1~3위를 빠르게 확인합니다.</p>
        </article>
      </section>

      {isCreateModalOpen ? (
        <CreateRoomModal
          onCreateRoom={async (payload) => {
            const didCreateRoom = await onCreateRoom(payload)

            if (didCreateRoom) {
              setIsCreateModalOpen(false)
            }

            return didCreateRoom
          }}
        />
      ) : null}
    </main>
  )
}
