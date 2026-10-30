import { describe, expect, it } from 'vitest'
import { session } from '../../test/fixtures.ts'
import type { Booking, BookingStatus, StudioState } from '../types.ts'
import { computeMetrics } from './metrics.ts'

let n = 0
function booking(sessionId: string, status: BookingStatus): Booking {
  n++
  return {
    id: `b${n}`,
    code: `LUM-${n}`,
    sessionId,
    name: `Persona ${n}`,
    email: `p${n}@correo.example`,
    phone: '+34 612 345 678',
    status,
    source: 'web',
    createdAt: '2026-11-01T10:00:00.000Z',
    attendance: null,
  }
}

const many = (count: number, sessionId: string, status: BookingStatus) =>
  Array.from({ length: count }, () => booking(sessionId, status))

// Semana del 2 al 8 de noviembre. Horas de Madrid = UTC + 1.
const state: StudioState = {
  sessions: [
    session({ id: 'manana', startsAt: '2026-11-02T07:00:00.000Z', capacity: 4 }), // 8:00
    session({ id: 'tarde', startsAt: '2026-11-03T17:00:00.000Z', capacity: 4 }), // 18:00
    session({ id: 'noche', startsAt: '2026-11-04T19:00:00.000Z', capacity: 8 }), // 20:00
    session({ id: 'cancelada', startsAt: '2026-11-05T17:00:00.000Z', capacity: 8, status: 'cancelled' }),
    session({ id: 'otra-semana', startsAt: '2026-11-10T17:00:00.000Z', capacity: 8 }),
  ],
  bookings: [
    ...many(4, 'manana', 'confirmed'),
    ...many(2, 'manana', 'waitlisted'),
    ...many(1, 'manana', 'cancelled'),
    ...many(2, 'tarde', 'confirmed'),
    ...many(1, 'tarde', 'cancelled'),
    ...many(2, 'noche', 'confirmed'),
    ...many(5, 'cancelada', 'class_cancelled'),
    ...many(8, 'otra-semana', 'confirmed'),
  ],
}

const WEEK = ['2026-11-01T23:00:00.000Z', '2026-11-08T23:00:00.000Z'] as const
/** Domingo anterior: ninguna clase de la semana ha empezado. */
const BEFORE_WEEK = new Date('2026-11-01T12:00:00.000Z')

describe('métricas de la semana', () => {
  const metrics = computeMetrics(state, ...WEEK, BEFORE_WEEK)

  it('calcula ocupación, completas, lista de espera y cancelaciones sin contar las clases canceladas', () => {
    expect(metrics.sessions).toBe(3)
    expect(metrics.occupancy).toBeCloseTo(8 / 16)
    expect(metrics.fullSessions).toBe(1)
    expect(metrics.waitlisted).toBe(2)
    expect(metrics.cancellations).toBe(2)
    // 12 reservas en clases de la semana (sin las de la clase cancelada), 2 canceladas.
    expect(metrics.cancellationRate).toBeCloseTo(2 / 12)
  })

  it('agrupa la ocupación por franjas de dos horas en hora de Madrid y omite las vacías', () => {
    expect(metrics.slots).toEqual([
      { fromHour: 7, toHour: 9, sessions: 1, occupancy: 1 },
      { fromHour: 17, toHour: 19, sessions: 1, occupancy: 0.5 },
      { fromHour: 19, toHour: 21, sessions: 1, occupancy: 0.25 },
    ])
  })

  it('la lista de espera solo cuenta en las clases que aún no han empezado', () => {
    // La clase de las 8:00 del lunes (con 2 en espera) ya ha empezado: nadie puede conseguir plaza.
    const started = computeMetrics(state, ...WEEK, new Date('2026-11-02T07:10:00.000Z'))
    expect(started.waitlisted).toBe(0)
    // El resto de métricas no depende de la hora.
    expect(started).toMatchObject({ sessions: 3, fullSessions: 1, cancellations: 2 })
    // Justo antes de empezar todavía cuenta.
    expect(computeMetrics(state, ...WEEK, new Date('2026-11-02T06:59:00.000Z')).waitlisted).toBe(2)
  })

  it('una semana sin clases da ceros, no divisiones entre cero', () => {
    const empty = computeMetrics(state, '2026-12-01T00:00:00.000Z', '2026-12-08T00:00:00.000Z', BEFORE_WEEK)
    expect(empty).toMatchObject({ sessions: 0, occupancy: 0, cancellationRate: 0, slots: [] })
  })
})
