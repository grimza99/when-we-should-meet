import { ARIA_LABELS } from "../../lib/ariaLabels";
import { useRouteState } from "../../lib/router";
import { Button } from "../ui/Button";

export default function RoomFullState() {
  const { navigate } = useRouteState();

  return (
    <section className="panel stack-gap">
      <p className="eyebrow">room is full</p>
      <h2>이 방은 정원이 모두 찼어요</h2>
      <p className="hero-copy">
        방 만든 사람에게 정원 추가를 요청하거나, 새 방을 만들어 일정을 다시
        조율해 주세요.
      </p>
      <Button
        ariaLabel={ARIA_LABELS.room.homeButton}
        block
        onClick={() => navigate({ name: "landing" })}
        variant="secondary"
      >
        랜딩으로 돌아가기
      </Button>
    </section>
  );
}
