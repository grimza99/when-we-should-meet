import { ARIA_LABELS } from "../../lib/ariaLabels";

export type ToastTone = "default" | "success";

type ToastProps = {
  message: string;
  tone?: ToastTone;
};

export function Toast({ message, tone = "default" }: ToastProps) {
  if (!message) {
    return null;
  }

  return (
    <div
      aria-label={ARIA_LABELS.toast}
      aria-live="polite"
      className={tone === "success" ? "toast toast-success" : "toast"}
      role="status"
    >
      {message}
    </div>
  );
}
