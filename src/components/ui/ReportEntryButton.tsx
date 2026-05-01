type ReportEntryButtonProps = {
  onClick: () => void
}

export function ReportEntryButton({ onClick }: ReportEntryButtonProps) {
  return (
    <button
      aria-label="문의 및 제안 페이지로 이동"
      className="report-entry-button"
      onClick={onClick}
      type="button"
    >
      의견 보내기
    </button>
  )
}
