const CLIENT_KEY_STORAGE_KEY = 'when-should-we-meet-client-key'

export function getOrCreateClientKey() {
  const existing = window.localStorage.getItem(CLIENT_KEY_STORAGE_KEY)

  if (existing) {
    return existing
  }

  const next = crypto.randomUUID()
  window.localStorage.setItem(CLIENT_KEY_STORAGE_KEY, next)
  return next
}
