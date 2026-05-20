import { ARIA_LABELS } from "../../lib/ariaLabels";

type ToastProps = {
  message: string;
};

export function Toast({ message }: ToastProps) {
  if (!message) {
    return null;
  }

  return (
    <div
      aria-label={ARIA_LABELS.toast}
      aria-live="polite"
      className="toast"
      role="status"
    >
      {message}
    </div>
  );
}
