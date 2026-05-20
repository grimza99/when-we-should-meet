import { describe, expect, it } from 'vitest'
import { normalizeInviteCodeInput } from './inviteCode'

describe('초대 코드 정규화', () => {
  it('공백을 제거하고 대문자로 바꾸며 6글자까지만 유지한다', () => {
    expect(normalizeInviteCodeInput('ab 12')).toBe('AB12')
    expect(normalizeInviteCodeInput('abc def ghi')).toBe('ABCDEF')
    expect(normalizeInviteCodeInput(' a b c ')).toBe('ABC')
    expect(normalizeInviteCodeInput('      ')).toBe('')
  })
})
