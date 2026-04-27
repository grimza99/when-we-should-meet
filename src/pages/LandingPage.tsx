import { useState } from "react";
import { CreateRoomModal } from "../components/room/CreateRoomModal";
import { Button } from "../components/ui/Button";
import { TextInput } from "../components/ui/TextInput";
import { normalizeInviteCodeInput } from "../lib/inviteCode";
import type { CreateRoomPayload } from "../types";

const landingFeatures = [
  {
    description: "아이디도 비번도 필요 없어요. 방 만들고 링크만 보내면 끝!",
    icon: "🚀",
    title: "1초만에 시작",
  },
  {
    description: "모바일에 최적화된 달력으로 누구나 쉽게 일정을 입력해요.",
    icon: "📱",
    title: "손쉬운 터치",
  },
  {
    description: "가장 많이 모이는 날이 언제인지 저희가 바로 계산해 드릴게요.",
    icon: "🥇",
    title: "최적의 날짜 추천",
  },
];

type LandingPageProps = {
  joinInviteCode: string;
  onCreateRoom: (payload: CreateRoomPayload) => Promise<boolean>;
  onJoinInviteCodeChange: (inviteCode: string) => void;
  onJoinRoom: () => Promise<boolean>;
};

export function LandingPage({
  joinInviteCode,
  onCreateRoom,
  onJoinInviteCodeChange,
  onJoinRoom,
}: LandingPageProps) {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isJoiningRoom, setIsJoiningRoom] = useState(false);

  const submitJoin = async () => {
    if (isJoiningRoom || !joinInviteCode.trim()) {
      return;
    }

    setIsJoiningRoom(true);

    try {
      await onJoinRoom();
    } finally {
      setIsJoiningRoom(false);
    }
  };

  return (
    <main className="page landing-page">
      <section className="landing-hero">
        <img
          src="/logo.png"
          className="landing-logo-img"
          aria-label="app-logo"
        />

        <h1>우리 언제 볼까?</h1>
        <p className="hero-copy">
          번거로운 가입 없이, 링크 하나로
          <br />
          모두가 가능한 최적의 날짜를 찾아보세요.
        </p>
      </section>

      <section className="landing-cta" aria-label="방 만들기 또는 참여하기">
        <Button block onClick={() => setIsCreateModalOpen(true)}>
          방 만들기
        </Button>

        <form
          className="landing-join-form"
          onSubmit={(event) => {
            event.preventDefault();
            void submitJoin();
          }}
        >
          <TextInput
            autoCapitalize="characters"
            autoCorrect="off"
            id="invite-code"
            inputMode="text"
            label="초대 코드 입력"
            maxLength={6}
            onChange={(value) =>
              onJoinInviteCodeChange(normalizeInviteCodeInput(value))
            }
            placeholder="초대 코드 입력"
            spellCheck={false}
            value={joinInviteCode}
          />
          <Button
            disabled={!joinInviteCode.trim() || isJoiningRoom}
            variant="secondary"
            type="submit"
          >
            {isJoiningRoom ? "참여 중" : "참여"}
          </Button>
        </form>
      </section>

      <section className="info-grid" aria-label="서비스 특징">
        {landingFeatures.map((feature) => (
          <article className="mini-card" key={feature.title}>
            <span aria-hidden="true" className="mini-card-icon">
              {feature.icon}
            </span>
            <strong>{feature.title}</strong>
            <p>{feature.description}</p>
          </article>
        ))}
      </section>

      {isCreateModalOpen ? (
        <CreateRoomModal
          onClose={() => setIsCreateModalOpen(false)}
          onCreateRoom={async (payload) => {
            const didCreateRoom = await onCreateRoom(payload);

            if (didCreateRoom) {
              setIsCreateModalOpen(false);
            }

            return didCreateRoom;
          }}
        />
      ) : null}
    </main>
  );
}
