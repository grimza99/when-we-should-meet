import { ARIA_LABELS } from "../../lib/ariaLabels";

export function FeaturesSection() {
  return (
    <section
      className="info-grid"
      aria-label={ARIA_LABELS.landing.featureSection}
    >
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
  );
}

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
