import { ARIA_LABELS } from "../../lib/ariaLabels";
import type { TToastTone } from "../shell/toast-context";

interface IToastProps {
  message: string;
  tone?: TToastTone;
}

export function Toast({ message, tone = "success" }: IToastProps) {
  if (!message) {
    return null;
  }

  const toastToneClassName = {
    success: "toast-success",
  };
  return (
    <div
      aria-label={ARIA_LABELS.toast}
      aria-live="polite"
      className={`toast ${toastToneClassName[tone]}`}
      role="status"
    >
      {message}
    </div>
  );
}
