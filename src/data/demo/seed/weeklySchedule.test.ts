import { describe, expect, it } from 'vitest'
import { buildSeedSessions } from './weeklySchedule.ts'

describe('buildSeedSessions', () => {
  const sessions = buildSeedSessions(new Date('2026-10-29T10:00:00.000Z'))

  it('genera dos semanas desde el lunes, sin domingos', () => {
    const sorted = [...sessions].sort((a, b) => a.startsAt.localeCompare(b.startsAt))
    expect(sorted[0].startsAt).toBe('2026-10-26T07:00:00.000Z')
    expect(sorted.at(-1)!.startsAt < '2026-11-09T00:00:00.000Z').toBe(true)
    expect(sessions.some((s) => new Date(s.startsAt).getUTCDay() === 0)).toBe(false)
  })

  it('mantiene las plazas ocupadas dentro de la capacidad y los ids únicos', () => {
    expect(sessions.every((s) => s.bookedCount >= 0 && s.bookedCount <= s.capacity)).toBe(true)
    expect(new Set(sessions.map((s) => s.id)).size).toBe(sessions.length)
  })
})
