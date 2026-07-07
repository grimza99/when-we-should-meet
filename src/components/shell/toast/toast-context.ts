import { createContext, useContext } from "react";

export type TToastTone = "success";

export type ToastPayload = {
  msg: string;
  tone?: TToastTone;
  durationMs?: number;
};

export type ToastContextValue = {
  showToast: (payload: ToastPayload) => void;
  dismissToast: (id: string) => void;
};

export const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }

  return context;
}
