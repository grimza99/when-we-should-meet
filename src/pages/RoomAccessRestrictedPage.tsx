import { HomeBrandButton } from "../components/ui/HomeBrandButton";
import { ARIA_LABELS } from "../lib/ariaLabels";

export function RoomAccessRestrictedPage() {
  return (
    <main
      aria-label={ARIA_LABELS.room.restrictedPage}
      className="page room-access-restricted-page"
    >
      <HomeBrandButton />
      <section className="hero-card restricted-card">
        <h1>이 방에는 다시 들어갈 수 없어요</h1>
        <p className="hero-copy">방장이 참가를 제한한 상태예요.</p>
      </section>
    </main>
  );
}
