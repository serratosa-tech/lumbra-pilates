import { describe, expect, it } from 'vitest'
import { NOW } from '../../test/fixtures.ts'
import type { ClassSession } from '../types.ts'
import { filterSessions, hasEnded, isBookable, sessionState } from './schedule.ts'

const base: ClassSession = {
  id: 's1',
  classTypeId: 'mat-flow',
  instructorId: 'marta',
  name: 'Mat Flow',
  instructor: 'Marta',
  level: 'todos',
  startsAt: '2026-11-02T17:00:00.000Z',
  durationMinutes: 55,
  capacity: 10,
  bookedCount: 4,
  waitlistCount: 0,
  status: 'scheduled',
}

describe('estado de una clase en el horario', () => {
  it.each([
    [{ bookedCount: 7 }, 'available'],
    [{ bookedCount: 8 }, 'last_spots'],
    [{ bookedCount: 9 }, 'last_spots'],
    [{ bookedCount: 10 }, 'full'],
    [{ startsAt: NOW.toISOString() }, 'past'],
    [{ status: 'cancelled' as const }, 'cancelled'],
  ])('%o → %s', (overrides, expected) => {
    expect(sessionState({ ...base, ...overrides }, NOW)).toBe(expected)
  })

  it('una clase termina al acabar su duración, no al empezar', () => {
    const at = (minutes: number) => new Date(Date.parse(base.startsAt) + minutes * 60_000)
    expect(hasEnded(base, at(0))).toBe(false)
    expect(hasEnded(base, at(54))).toBe(false)
    expect(hasEnded(base, at(55))).toBe(true)
  })

  it('solo se reservan (o se entra en lista de espera) las clases futuras y activas', () => {
    expect(isBookable('full')).toBe(true)
    expect(isBookable('past')).toBe(false)
    expect(isBookable('cancelled')).toBe(false)
  })
})

describe('filtros del horario', () => {
  const sessions: ClassSession[] = [
    base,
    { ...base, id: 's2', classTypeId: 'reformer', level: 'avanzado', instructorId: 'lucia' },
    { ...base, id: 's3', classTypeId: 'reformer', level: 'iniciacion', instructorId: 'marta' },
  ]
  const ids = (list: ClassSession[]) => list.map((s) => s.id)

  it('sin filtros devuelve todo', () => {
    expect(ids(filterSessions(sessions, {}))).toEqual(['s1', 's2', 's3'])
  })

  it('combina tipo, instructora y nivel', () => {
    expect(ids(filterSessions(sessions, { classTypeId: 'reformer' }))).toEqual(['s2', 's3'])
    expect(ids(filterSessions(sessions, { classTypeId: 'reformer', instructorId: 'marta' }))).toEqual(['s3'])
    expect(ids(filterSessions(sessions, { instructorId: 'lucia', level: 'iniciacion' }))).toEqual([])
  })

  it('las clases para todos los niveles encajan con cualquier nivel', () => {
    expect(ids(filterSessions(sessions, { level: 'avanzado' }))).toEqual(['s1', 's2'])
  })
})
