import { Button } from "../components/ui/Button";

type GuardPageProps = {
  description: string;
  onRetry?: () => void;
};
export default function GuardPage({ description, onRetry }: GuardPageProps) {
  return (
    <main aria-label="Firebase unavailable page" className="page">
      <section className="hero-card">
        <h1>서비스에 연결할 수 없습니다</h1>
        <p className="hero-copy">{description}</p>
        <div className="calendar-header-actions">
          {onRetry && (
            <Button
              ariaLabel="Firebase connection retry button"
              onClick={onRetry}
              variant="secondary"
            >
              다시 시도
            </Button>
          )}
          <Button
            ariaLabel="Reload page button"
            onClick={() => window.location.reload()}
          >
            새로고침
          </Button>
        </div>
      </section>
    </main>
  );
}
