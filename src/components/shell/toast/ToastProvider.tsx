"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Toast } from "../../ui/Toast";
import { ToastContext, type ToastPayload } from "./toast-context";

type ToastItem = ToastPayload & {
  id: string;
};

function createToastId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timeoutMapRef = useRef<Map<string, number>>(new Map());
  const portalTarget = typeof document !== "undefined" ? document.body : null;

  useEffect(() => {
    const timeoutMap = timeoutMapRef.current;

    return () => {
      timeoutMap.forEach((timeoutId) => {
        window.clearTimeout(timeoutId);
      });
      timeoutMap.clear();
    };
  }, []);

  const dismissToast = useCallback((id: string) => {
    const timeoutId = timeoutMapRef.current.get(id);
    if (timeoutId) {
      window.clearTimeout(timeoutId);
      timeoutMapRef.current.delete(id);
    }

    setToasts((previous) => previous.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    ({ durationMs = 3200, ...payload }: ToastPayload) => {
      const id = createToastId();
      setToasts((previous) => [...previous, { id, ...payload }]);

      const timeoutId = window.setTimeout(() => {
        dismissToast(id);
      }, durationMs);

      timeoutMapRef.current.set(id, timeoutId);
    },
    [dismissToast]
  );

  const value = useMemo(
    () => ({
      showToast,
      dismissToast,
    }),
    [dismissToast, showToast]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      {portalTarget
        ? createPortal(
            <>
              {toasts.map((toast) => (
                <Toast key={toast.id} message={toast.msg} tone={toast.tone} />
              ))}
            </>,
            portalTarget
          )
        : null}
    </ToastContext.Provider>
  );
}
