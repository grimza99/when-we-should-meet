import { useCallback, useEffect, useRef, useState } from "react";
import {
  DEFAULT_STORAGE,
  LEGACY_STORAGE_KEY,
  LOCAL_STORAGE_SYNC_EVENT,
  STORAGE_KEY,
} from "../lib/constants";
import type { AppStorage } from "../types";

function normalizeStorage(
  value: Partial<AppStorage> | null | undefined
): AppStorage {
  return {
    ...DEFAULT_STORAGE,
    ...value,
    memberships: value?.memberships ?? DEFAULT_STORAGE.memberships,
    rooms: value?.rooms ?? DEFAULT_STORAGE.rooms,
    visibleMonthsByRoomId:
      value?.visibleMonthsByRoomId ?? DEFAULT_STORAGE.visibleMonthsByRoomId,
  };
}

function readStoredState(storageKey: string) {
  const stored = window.localStorage.getItem(storageKey);

  if (!stored) {
    return null;
  }

  try {
    return normalizeStorage(JSON.parse(stored) as Partial<AppStorage>);
  } catch {
    return null;
  }
}

export function useLocalStorageState() {
  const [{ initialState, shouldMigrateLegacyStorage }] = useState(() => {
    const nextState = readStoredState(STORAGE_KEY);

    if (nextState) {
      return {
        initialState: nextState,
        shouldMigrateLegacyStorage: false,
      };
    }

    const legacyState = readStoredState(LEGACY_STORAGE_KEY);

    if (legacyState) {
      return {
        initialState: legacyState,
        shouldMigrateLegacyStorage: true,
      };
    }

    return {
      initialState: DEFAULT_STORAGE,
      shouldMigrateLegacyStorage: false,
    };
  });
  const [state, setState] = useState<AppStorage>(initialState);
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
    if (!shouldMigrateLegacyStorage) {
      return;
    }

    persistState(stateRef.current);
    window.localStorage.removeItem(LEGACY_STORAGE_KEY);
  }, [persistState, shouldMigrateLegacyStorage]);

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
        const nextState = normalizeStorage(
          JSON.parse(serializedState) as Partial<AppStorage>
        );
        stateRef.current = nextState;
        lastSerializedRef.current = JSON.stringify(nextState);
        setState(nextState);
      } catch {
        stateRef.current = DEFAULT_STORAGE;
        lastSerializedRef.current = JSON.stringify(DEFAULT_STORAGE);
        setState(DEFAULT_STORAGE);
      }
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY && event.key !== LEGACY_STORAGE_KEY) {
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
