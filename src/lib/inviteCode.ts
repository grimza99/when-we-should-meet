export function normalizeInviteCodeInput(value: string) {
  return value.replace(/\s+/g, '').toUpperCase().slice(0, 6)
}
