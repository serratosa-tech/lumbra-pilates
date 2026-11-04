import { describe, expect, it } from 'vitest'
import { CATALOG, errorCodeOf, meta, minutesFromNow, NOW, person, session, stateWith } from '../../test/fixtures.ts'
import type { SessionInput, StudioState } from '../types.ts'
import { placeBooking } from './booking.ts'
import { cancelSession, createSession, setAttendance, updateSession } from './sessions.ts'
import { confirmedOf, waitlistOf } from './state.ts'

/** Clase s1 (18:00, 2 plazas) con Ana y Bea confirmadas y Carla en lista de espera. */
function withBookings(): StudioState {
  let state = stateWith()
  ;['Ana', 'Bea', 'Carla'].forEach((name, i) => {
    state = placeBooking(state, person(name), meta(i - 60)).state
  })
  return state
}

const input = (overrides: Partial<SessionInput> = {}): SessionInput => ({
  classTypeId: 'reformer',
  instructorId: 'lucia',
  startsAt: '2026-11-03T09:00:00.000Z',
  durationMinutes: 50,
  capacity: 8,
  ...overrides,
})

describe('gestión de clases del estudio', () => {
  it('crea una clase programada', () => {
    const { state, session: created } = createSession(stateWith(), input(), { id: 'nueva', now: NOW }, CATALOG)
    expect(created).toMatchObject({ id: 'nueva', status: 'scheduled', capacity: 8 })
    expect(state.sessions).toHaveLength(2)
  })

  it('no crea clases en el pasado, solapadas o con datos fuera de rango', () => {
    const create = (overrides: Partial<SessionInput>) => () =>
      createSession(stateWith(), input(overrides), { id: 'x', now: NOW }, CATALOG)
    expect(errorCodeOf(create({ startsAt: '2026-11-02T07:00:00.000Z' }))).toBe('past')
    // s1 va de 17:00 a 17:55 UTC.
    expect(errorCodeOf(create({ startsAt: '2026-11-02T17:30:00.000Z' }))).toBe('overlap')
    expect(errorCodeOf(create({ startsAt: '2026-11-02T16:30:00.000Z', durationMinutes: 45 }))).toBe('overlap')
    expect(errorCodeOf(create({ startsAt: '2026-11-02T16:10:00.000Z', durationMinutes: 50 }))).toBe('sin error')
    expect(errorCodeOf(create({ capacity: 0 }))).toBe('invalid_input')
    expect(errorCodeOf(create({ classTypeId: 'yoga' }))).toBe('invalid_input')
  })

  it('una clase cancelada no bloquea la sala', () => {
    const state = stateWith(session({ status: 'cancelled' }))
    const result = createSession(state, input({ startsAt: '2026-11-02T17:00:00.000Z' }), { id: 'x', now: NOW }, CATALOG)
    expect(result.state.sessions).toHaveLength(2)
  })

  it('no deja bajar el aforo por debajo de las plazas reservadas', () => {
    const state = withBookings()
    const edit = (capacity: number) => () =>
      updateSession(state, 's1', input({ startsAt: '2026-11-02T17:00:00.000Z', capacity }), NOW, CATALOG)
    expect(errorCodeOf(edit(1))).toBe('capacity_below_booked')
    expect(errorCodeOf(edit(2))).toBe('sin error')
  })

  it('al subir el aforo entra gente de la lista de espera', () => {
    const { state, promoted } = updateSession(
      withBookings(),
      's1',
      input({ startsAt: '2026-11-02T17:00:00.000Z', capacity: 4 }),
      NOW,
      CATALOG,
    )
    expect(promoted.map((b) => b.name)).toEqual(['Carla'])
    expect(confirmedOf(state, 's1')).toHaveLength(3)
    expect(waitlistOf(state, 's1')).toHaveLength(0)
  })

  it('no edita clases que ya han empezado', () => {
    const state = stateWith(session({ startsAt: '2026-11-02T07:30:00.000Z' }))
    expect(errorCodeOf(() => updateSession(state, 's1', input(), NOW, CATALOG))).toBe('past')
  })

  it('al cancelar una clase todas sus reservas activas pasan a «cancelada por el estudio»', () => {
    const { state, affected } = cancelSession(withBookings(), 's1', NOW)
    expect(state.sessions[0].status).toBe('cancelled')
    expect(affected.map((b) => b.name)).toEqual(['Ana', 'Bea', 'Carla'])
    expect(state.bookings.every((b) => b.status === 'class_cancelled' && b.cancelledAt === NOW.toISOString())).toBe(true)
    expect(errorCodeOf(() => cancelSession(state, 's1', NOW))).toBe('class_cancelled')
  })

  it('no cancela una clase que ya ha empezado', () => {
    const state = stateWith(session({ startsAt: '2026-11-02T07:30:00.000Z' }))
    expect(errorCodeOf(() => cancelSession(state, 's1', NOW))).toBe('past')
    expect(errorCodeOf(() => cancelSession(state, 'no-existe', NOW))).toBe('session_not_found')
  })

  it('las reservas ya canceladas siguen como estaban', () => {
    let state = withBookings()
    state = { ...state, bookings: state.bookings.map((b) => (b.name === 'Ana' ? { ...b, status: 'cancelled' } : b)) }
    const { affected } = cancelSession(state, 's1', NOW)
    expect(affected.map((b) => b.name)).toEqual(['Bea', 'Carla'])
  })
})

describe('asistencia', () => {
  const state = withBookings() // la clase empieza a las 17:00 UTC
  const ana = state.bookings.find((b) => b.name === 'Ana')!
  const carla = state.bookings.find((b) => b.name === 'Carla')!
  const atClassTime = (minutes: number) => new Date(new Date('2026-11-02T17:00:00.000Z').getTime() + minutes * 60_000)

  it('se marca desde 30 minutos antes de la clase', () => {
    expect(errorCodeOf(() => setAttendance(state, ana.id, 'attended', atClassTime(-31)))).toBe('attendance_too_early')
    expect(setAttendance(state, ana.id, 'attended', atClassTime(-30)).booking.attendance).toBe('attended')
    expect(setAttendance(state, ana.id, 'no_show', atClassTime(90)).booking.attendance).toBe('no_show')
  })

  it('se puede desmarcar y solo vale para plazas confirmadas', () => {
    const marked = setAttendance(state, ana.id, 'attended', atClassTime(0)).state
    expect(setAttendance(marked, ana.id, null, atClassTime(1)).booking.attendance).toBeNull()
    expect(errorCodeOf(() => setAttendance(state, carla.id, 'attended', atClassTime(0)))).toBe('not_confirmed')
    expect(errorCodeOf(() => setAttendance(state, 'nadie', 'attended', minutesFromNow(0)))).toBe('not_found')
  })
})
