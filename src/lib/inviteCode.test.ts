import { describe, expect, it } from 'vitest'
import { normalizeInviteCodeInput } from './inviteCode'

describe('normalizeInviteCodeInput', () => {
  it('removes whitespace, uppercases, and caps the invite code at 6 characters', () => {
    expect(normalizeInviteCodeInput('ab 12')).toBe('AB12')
    expect(normalizeInviteCodeInput('abc def ghi')).toBe('ABCDEF')
    expect(normalizeInviteCodeInput(' a b c ')).toBe('ABC')
    expect(normalizeInviteCodeInput('      ')).toBe('')
  })
})
