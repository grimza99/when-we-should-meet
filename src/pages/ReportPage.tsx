import { Button } from "../components/ui/Button";
import { HomeBrandButton } from "../components/ui/HomeBrandButton";

const reportLinks = [
  {
    href: "https://example.com/report-error",
    label: "오류사항",
  },
  {
    href: "https://example.com/report-feature",
    label: "추가기능사항",
  },
  {
    href: "https://example.com/report-etc",
    label: "기타 문의사항",
  },
];

type ReportPageProps = {
  onBackToLanding: () => void;
};

export function ReportPage({ onBackToLanding }: ReportPageProps) {
  const openReportLink = (href: string) => {
    window.location.assign(href);
  };

  return (
    <main className="page report-page">
      <HomeBrandButton onClick={onBackToLanding} />

      <section className="hero-card report-hero-card">
        <h1>의견을 보내주세요</h1>
        <p className="hero-copy">
          사용 중 불편했던 점이나 필요한 기능이 있다면
          <br />
          아래 항목으로 보내주세요.
        </p>
      </section>

      <section className="controls-card report-links-card">
        {reportLinks.map((item) => (
          <Button
            block
            key={item.label}
            onClick={() => openReportLink(item.href)}
          >
            {item.label}
          </Button>
        ))}
      </section>
    </main>
  );
}
