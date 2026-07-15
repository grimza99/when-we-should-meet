import { Button } from "../components/ui/Button";
import { HomeBrandButton } from "../components/ui/HomeBrandButton";
import { useRouteState } from "../lib/router";

const reportLinks = [
  {
    href: "https://docs.google.com/forms/d/1thtkHygu01tSqrUC0jndw5FBtRLUYiG9c-Rwdt87wzk/edit",
    label: "오류사항",
  },
  {
    href: "https://docs.google.com/forms/d/1VyrJLTaR0jUhFnEqtc_0UeaX1xbCTz8MeEQZqbfjTVU/edit",
    label: "추가기능요청",
  },
  {
    href: "https://docs.google.com/forms/d/1iGLCj23fIN8YW709chmNfcG6oRz82lmWpdokK4KOsuE/edit",
    label: "기타 문의사항",
  },
];

export function ReportPage() {
  const openReportLink = (href: string) => {
    window.location.assign(href);
  };
  const { navigate } = useRouteState();
  return (
    <main className="page report-page">
      <HomeBrandButton onClick={() => navigate({ name: "landing" })} />

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
