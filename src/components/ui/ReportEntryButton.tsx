import { useRouteState } from "../../lib/router";

export function ReportEntryButton() {
  const { navigate } = useRouteState();
  return (
    <button
      aria-label="문의 및 제안 페이지로 이동"
      className="report-entry-button"
      onClick={() => navigate({ name: "report" })}
      type="button"
    >
      의견 보내기
    </button>
  );
}
