import { useEffect, useState } from 'react'

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

  useEffect(() => {
    window.localStorage.setItem(key, JSON.stringify(state))
  }, [key, state])

  return [state, setState] as const
}
