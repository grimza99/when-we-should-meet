import { useCallback, useEffect, useRef, useState } from 'react'

const LOCAL_STORAGE_SYNC_EVENT = 'when-should-we-meet:storage-sync'

export function useLocalStorageState<T>(key: string, initialValue: T) {
  const [state, setState] = useState<T>(() => {
    const stored = window.localStorage.getItem(key)

    if (!stored) {
      return initialValue
    }

    try {
      return JSON.parse(stored) as T
    } catch {
      return initialValue
    }
  })
  const stateRef = useRef(state)
  const lastSerializedRef = useRef<string | null>(JSON.stringify(state))

  const persistState = useCallback(
    (nextState: T) => {
      const serializedState = JSON.stringify(nextState)

      if (lastSerializedRef.current === serializedState) {
        return
      }

      lastSerializedRef.current = serializedState
      window.localStorage.setItem(key, serializedState)
      window.dispatchEvent(
        new CustomEvent(LOCAL_STORAGE_SYNC_EVENT, {
          detail: {
            key,
            value: serializedState,
          },
        }),
      )
    },
    [key],
  )

  useEffect(() => {
    const syncState = (serializedState: string | null) => {
      if (serializedState === lastSerializedRef.current) {
        return
      }

      if (!serializedState) {
        stateRef.current = initialValue
        lastSerializedRef.current = JSON.stringify(initialValue)
        setState(initialValue)
        return
      }

      try {
        const nextState = JSON.parse(serializedState) as T
        stateRef.current = nextState
        lastSerializedRef.current = serializedState
        setState(nextState)
      } catch {
        stateRef.current = initialValue
        lastSerializedRef.current = JSON.stringify(initialValue)
        setState(initialValue)
      }
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== key) {
        return
      }

      syncState(event.newValue)
    }

    const handleCustomStorageEvent = (event: Event) => {
      const customEvent = event as CustomEvent<{ key: string; value: string | null }>

      if (customEvent.detail?.key !== key) {
        return
      }

      syncState(customEvent.detail.value)
    }

    window.addEventListener('storage', handleStorage)
    window.addEventListener(LOCAL_STORAGE_SYNC_EVENT, handleCustomStorageEvent)

    return () => {
      window.removeEventListener('storage', handleStorage)
      window.removeEventListener(LOCAL_STORAGE_SYNC_EVENT, handleCustomStorageEvent)
    }
  }, [initialValue, key])

  const setAndPersistState = useCallback(
    (
      value: T | ((previousState: T) => T),
    ) => {
      const previousState = stateRef.current
      const nextState =
        typeof value === 'function'
          ? (value as (previousState: T) => T)(previousState)
          : value

      stateRef.current = nextState
      persistState(nextState)
      setState(nextState)
    },
    [persistState],
  )

  return [state, setAndPersistState] as const
}
