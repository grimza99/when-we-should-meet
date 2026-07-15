import { ARIA_LABELS } from "../../lib/ariaLabels";

export function HeroSection() {
  return (
    <section className="landing-hero">
      <img
        src="/logo.png"
        className="landing-logo-img"
        aria-label={ARIA_LABELS.landing.logo}
        alt="when-we-should-meet-logo-image"
      />
      <h1 aria-label={ARIA_LABELS.landing.heading}>우리 언제 볼까?</h1>
      <p className="hero-copy">
        번거로운 가입 없이, 링크 하나로
        <br />
        모두가 가능한 최적의 날짜를 찾아보세요.
      </p>
    </section>
  );
}
