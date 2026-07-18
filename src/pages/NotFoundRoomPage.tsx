import { Button } from "../components/ui/Button";
import { HomeBrandButton } from "../components/ui/HomeBrandButton";
import { ARIA_LABELS } from "../lib/ariaLabels";
import { useRouteState } from "../lib/router";

export default function NotFoundRoomPage() {
  const { navigate } = useRouteState();

  return (
    <main aria-label={ARIA_LABELS.room.page} className="page room-page">
      <HomeBrandButton />
      <section className="hero-card">
        <h1>존재하지 않는 방입니다</h1>
        <p className="hero-copy">
          초대 코드를 다시 확인하거나 새 방을 만들어 주세요.
        </p>
      </section>
      <Button
        ariaLabel={ARIA_LABELS.room.homeButton}
        block
        onClick={() => navigate({ name: "landing" })}
      >
        랜딩으로 돌아가기
      </Button>
    </main>
  );
}
