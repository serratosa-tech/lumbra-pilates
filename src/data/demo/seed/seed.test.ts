import { describe, expect, it } from 'vitest'
import { findByCode, waitlistPosition } from '../../logic/booking.ts'
import { isBookingCode } from '../../logic/codes.ts'
import { confirmedOf, waitlistOf } from '../../logic/state.ts'
import { buildSeed, DEMO_EXAMPLES } from './bookings.ts'
import { CUSTOMERS } from './customers.ts'

// Lunes a primera hora, jueves por la mañana, sábado por la noche y domingo.
const MOMENTS = ['2026-10-26T06:00:00.000Z', '2026-10-29T10:00:00.000Z', '2026-10-31T21:00:00.000Z', '2026-11-01T11:00:00.000Z']

describe.each(MOMENTS)('datos de ejemplo sembrados el %s', (iso) => {
  const now = new Date(iso)
  const { sessions, bookings } = buildSeed(now)

  it('cubren la semana pasada, esta y las dos siguientes, sin domingos', () => {
    const sorted = [...sessions].sort((a, b) => a.startsAt.localeCompare(b.startsAt))
    expect(sessions).toHaveLength(28 * 4)
    expect(sorted[0].startsAt).toBe('2026-10-19T06:00:00.000Z') // lunes 19, 8:00 en Madrid (horario de verano)
    expect(sorted.at(-1)!.startsAt < '2026-11-16T00:00:00.000Z').toBe(true)
    expect(sessions.some((s) => new Date(s.startsAt).getUTCDay() === 0)).toBe(false)
    expect(new Set(sessions.map((s) => s.id)).size).toBe(sessions.length)
  })

  it('son coherentes: aforo, lista de espera solo en clases llenas, códigos y emails únicos', () => {
    for (const s of sessions) {
      const confirmed = confirmedOf({ sessions, bookings }, s.id)
      const waitlist = waitlistOf({ sessions, bookings }, s.id)
      expect(confirmed.length).toBeLessThanOrEqual(s.capacity)
      if (waitlist.length > 0) expect(confirmed.length).toBe(s.capacity)
      const activeEmails = [...confirmed, ...waitlist].map((b) => b.email)
      expect(new Set(activeEmails).size).toBe(activeEmails.length)
    }
    expect(new Set(bookings.map((b) => b.code)).size).toBe(bookings.length)
    expect(bookings.every((b) => isBookingCode(b.code))).toBe(true)
    expect(bookings.every((b) => b.email.endsWith('@correo.example'))).toBe(true)
  })

  it('todo lo que ya ha pasado ocurrió antes de ahora', () => {
    for (const b of bookings) {
      expect(b.createdAt <= iso).toBe(true)
      if (b.cancelledAt) expect(b.cancelledAt <= iso && b.cancelledAt >= b.createdAt).toBe(true)
      if (b.promotedAt) expect(b.promotedAt <= iso).toBe(true)
    }
  })

  it('incluyen todos los casos que la demo debe lucir', () => {
    const state = { sessions, bookings }
    const statuses = new Set(bookings.map((b) => b.status))
    expect(statuses).toEqual(new Set(['confirmed', 'waitlisted', 'cancelled', 'class_cancelled']))
    expect(sessions.filter((s) => s.status === 'cancelled')).toHaveLength(1)
    expect(bookings.some((b) => b.promotedAt)).toBe(true)
    expect(bookings.some((b) => b.attendance === 'attended')).toBe(true)
    expect(bookings.some((b) => b.attendance === 'no_show')).toBe(true)
    expect(bookings.some((b) => b.source === 'studio')).toBe(true)
    expect(sessions.filter((s) => waitlistOf(state, s.id).length > 0).length).toBeGreaterThanOrEqual(6)
  })

  it('las reservas de ejemplo de «Mis reservas» existen y son futuras', () => {
    const state = { sessions, bookings }
    const [confirmed, waitlisted] = DEMO_EXAMPLES.map((e) => findByCode(state, e.customer.email, e.code)!)
    expect(confirmed.status).toBe('confirmed')
    expect(waitlisted.status).toBe('waitlisted')
    expect(waitlistPosition(state, waitlisted)).toBe(2)
    for (const b of [confirmed, waitlisted]) {
      expect(sessions.find((s) => s.id === b.sessionId)!.startsAt > iso).toBe(true)
    }
  })
})

describe('semilla', () => {
  it('es determinista', () => {
    const now = new Date(MOMENTS[1])
    expect(buildSeed(now)).toEqual(buildSeed(now))
  })

  it('la clientela ficticia tiene emails únicos', () => {
    expect(new Set(CUSTOMERS.map((c) => c.email)).size).toBe(CUSTOMERS.length)
  })
})
