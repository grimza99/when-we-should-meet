import { useCallback, useEffect, useRef, useState } from "react";
import {
  DEFAULT_STORAGE,
  LOCAL_STORAGE_SYNC_EVENT,
  STORAGE_KEY,
} from "../lib/constants";
import type { AppStorage } from "../types";

export function useLocalStorageState() {
  const [state, setState] = useState<AppStorage>(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);

    if (!stored) {
      return DEFAULT_STORAGE;
    }

    try {
      return JSON.parse(stored) as AppStorage;
    } catch {
      return DEFAULT_STORAGE;
    }
  });
  const stateRef = useRef(state);
  const lastSerializedRef = useRef<string | null>(JSON.stringify(state));

  const persistState = useCallback(
    (nextState: AppStorage) => {
      const serializedState = JSON.stringify(nextState);

      if (lastSerializedRef.current === serializedState) {
        return;
      }

      lastSerializedRef.current = serializedState;
      window.localStorage.setItem(STORAGE_KEY, serializedState);
      window.dispatchEvent(
        new CustomEvent(LOCAL_STORAGE_SYNC_EVENT, {
          detail: {
            key: STORAGE_KEY,
            value: serializedState,
          },
        })
      );
    },
    []
  );

  useEffect(() => {
    const syncState = (serializedState: string | null) => {
      if (serializedState === lastSerializedRef.current) {
        return;
      }

      if (!serializedState) {
        stateRef.current = DEFAULT_STORAGE;
        lastSerializedRef.current = JSON.stringify(DEFAULT_STORAGE);
        setState(DEFAULT_STORAGE);
        return;
      }

      try {
        const nextState = JSON.parse(serializedState) as AppStorage;
        stateRef.current = nextState;
        lastSerializedRef.current = serializedState;
        setState(nextState);
      } catch {
        stateRef.current = DEFAULT_STORAGE;
        lastSerializedRef.current = JSON.stringify(DEFAULT_STORAGE);
        setState(DEFAULT_STORAGE);
      }
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) {
        return;
      }

      syncState(event.newValue);
    };

    const handleCustomStorageEvent = (event: Event) => {
      const customEvent = event as CustomEvent<{
        key: string;
        value: string | null;
      }>;

      if (customEvent.detail?.key !== STORAGE_KEY) {
        return;
      }

      syncState(customEvent.detail.value);
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener(LOCAL_STORAGE_SYNC_EVENT, handleCustomStorageEvent);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(
        LOCAL_STORAGE_SYNC_EVENT,
        handleCustomStorageEvent
      );
    };
  }, []);

  const setAndPersistState = useCallback(
    (value: AppStorage | ((previousState: AppStorage) => AppStorage)) => {
      const previousState = stateRef.current;
      const nextState =
        typeof value === "function"
          ? (value as (previousState: AppStorage) => AppStorage)(previousState)
          : value;

      stateRef.current = nextState;
      persistState(nextState);
      setState(nextState);
    },
    [persistState]
  );

  return [state, setAndPersistState] as const;
}
