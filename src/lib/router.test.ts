import { describe, expect, it } from 'vitest'
import { parseRoute } from './router'

describe('parseRoute', () => {
  it('parses landing, room, and restricted room routes', () => {
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

  it('falls back to landing for invalid room paths', () => {
    expect(parseRoute('/room/abc123/')).toEqual({ name: 'landing' })
    expect(parseRoute('/room/abc123/extra')).toEqual({ name: 'landing' })
  })
})
