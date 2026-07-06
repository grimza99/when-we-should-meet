"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Toast } from "../ui/Toast";

export type TToastTone = "success";

type ToastPayload = {
  msg: string;
  tone?: TToastTone;
  durationMs?: number;
};

type ToastItem = ToastPayload & {
  id: string;
};

type ToastContextValue = {
  showToast: (payload: ToastPayload) => void;
  dismissToast: (id: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

function createToastId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const timeoutMapRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    setIsMounted(true);

    return () => {
      timeoutMapRef.current.forEach((timeoutId) => {
        window.clearTimeout(timeoutId);
      });
      timeoutMapRef.current.clear();
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
      {isMounted
        ? createPortal(
            <>
              {toasts.map((toast) => (
                <Toast key={toast.id} message={toast.msg} tone={toast.tone} />
              ))}
            </>,
            document.body
          )
        : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }

  return context;
}
