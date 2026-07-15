import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "../ui/Button";

type RouteErrorBoundaryProps = {
  children: ReactNode;
  resetKey: string;
};

type RouteErrorBoundaryState = {
  error: Error | null;
};

export class RouteErrorBoundary extends Component<
  RouteErrorBoundaryProps,
  RouteErrorBoundaryState
> {
  state: RouteErrorBoundaryState = {
    error: null,
  };

  static getDerivedStateFromError(error: Error): RouteErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Failed to render route chunk", error, errorInfo);
  }

  componentDidUpdate(previousProps: RouteErrorBoundaryProps) {
    if (
      previousProps.resetKey !== this.props.resetKey &&
      this.state.error !== null
    ) {
      this.setState({ error: null });
    }
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleNavigateHome = () => {
    window.location.assign("/");
  };

  render() {
    if (this.state.error !== null) {
      const isChunkLoadError = detectChunkLoadError(this.state.error);

      return (
        <main className="page route-error-page" aria-live="assertive">
          <section className="hero-card route-error-card">
            <h1>화면을 불러오지 못했어요</h1>
            <p className="hero-copy">
              {isChunkLoadError
                ? "앱이 업데이트되었거나 네트워크가 불안정할 수 있어요. 새로고침 후 다시 시도해 주세요."
                : "일시적인 오류가 발생했어요. 새로고침하거나 랜딩으로 돌아가 다시 시도해 주세요."}
            </p>
          </section>
          <section className="route-error-actions">
            <Button block onClick={this.handleReload}>
              새로고침
            </Button>
            <Button block onClick={this.handleNavigateHome} variant="secondary">
              랜딩으로 돌아가기
            </Button>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}

function detectChunkLoadError(error: Error) {
  const errorMessage = `${error.name} ${error.message}`.toLowerCase();

  return (
    errorMessage.includes("chunkloaderror") ||
    errorMessage.includes("failed to fetch dynamically imported module") ||
    errorMessage.includes("importing a module script failed")
  );
}
