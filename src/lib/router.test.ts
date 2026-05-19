import { describe, expect, it } from 'vitest'
import { parseRoute } from './router'

describe('라우트 해석', () => {
  it('랜딩, 방, 접근 제한 라우트를 해석한다', () => {
    expect(parseRoute('/')).toEqual({ name: 'landing' })
    expect(parseRoute('/room/abc123')).toEqual({
      name: 'room',
      roomId: 'abc123',
    })
    expect(parseRoute('/room/abc123/restricted')).toEqual({
      name: 'room_access_restricted',
      roomId: 'abc123',
    })
  })

  it('유효하지 않은 방 경로는 랜딩으로 되돌린다', () => {
    expect(parseRoute('/room/abc123/')).toEqual({ name: 'landing' })
    expect(parseRoute('/room/abc123/extra')).toEqual({ name: 'landing' })
  })
})
