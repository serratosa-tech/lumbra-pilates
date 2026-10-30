import { describe, expect, it } from 'vitest'
import { errorCodeOf as codeOf, meta, minutesFromNow, NOW, person, session, stateWith } from '../../test/fixtures.ts'
import type { StudioState } from '../types.ts'
import {
  canCancelOnline,
  cancelBookingById,
  cancelByClient,
  cancellationDeadline,
  placeBooking,
  waitlistPosition,
} from './booking.ts'
import { confirmedOf, waitlistOf } from './state.ts'

/** Clase de 2 plazas con Ana y Bea confirmadas y Carla y Dani en lista de espera. */
function fullClass(startsAt = '2026-11-02T17:00:00.000Z'): StudioState {
  let state = stateWith(session({ startsAt }))
  ;['Ana', 'Bea', 'Carla', 'Dani'].forEach((name, i) => {
    state = placeBooking(state, person(name), meta(i - 60)).state
  })
  return state
}

const byName = (state: StudioState, name: string) => state.bookings.find((b) => b.name === name)!

describe('cancelar una reserva', () => {
  it('al cancelar una plaza sube la primera persona de la lista de espera', () => {
    const state = fullClass()
    const ana = byName(state, 'Ana')
    const { state: next, result } = cancelByClient(state, ana.email, ana.code, NOW)

    expect(result.booking.status).toBe('cancelled')
    expect(result.booking.cancelledAt).toBe(NOW.toISOString())
    expect(result.promoted?.name).toBe('Carla')
    expect(result.promoted?.promotedAt).toBe(NOW.toISOString())
    expect(confirmedOf(next, 's1').map((b) => b.name)).toEqual(['Bea', 'Carla'])
    expect(waitlistPosition(next, byName(next, 'Dani'))).toBe(1)
  })

  it('sin lista de espera, simplemente libera la plaza', () => {
    let state = stateWith()
    state = placeBooking(state, person('Ana'), meta(-10)).state
    const ana = byName(state, 'Ana')
    const { state: next, result } = cancelByClient(state, 'ANA@correo.example ', ana.code.toLowerCase(), NOW)
    expect(result.promoted).toBeNull()
    expect(confirmedOf(next, 's1')).toHaveLength(0)
  })

  it('salir de la lista de espera no sube a nadie y recoloca las posiciones', () => {
    const state = fullClass()
    const carla = byName(state, 'Carla')
    const { state: next, result } = cancelByClient(state, carla.email, carla.code, NOW)
    expect(result.promoted).toBeNull()
    expect(confirmedOf(next, 's1')).toHaveLength(2)
    expect(waitlistOf(next, 's1').map((b) => b.name)).toEqual(['Dani'])
  })

  it('se puede cancelar justo hasta 2 horas antes, no después', () => {
    const state = fullClass('2026-11-02T10:00:00.000Z') // 2 h después de NOW
    const ana = byName(state, 'Ana')
    expect(cancellationDeadline({ startsAt: '2026-11-02T10:00:00.000Z' }).toISOString()).toBe(NOW.toISOString())
    expect(cancelByClient(state, ana.email, ana.code, NOW).result.booking.status).toBe('cancelled')
    expect(codeOf(() => cancelByClient(state, ana.email, ana.code, minutesFromNow(1)))).toBe('too_late')
  })

  it('sabe si aún se puede cancelar online: hasta 2 horas antes, incluido el minuto exacto', () => {
    const startsAt = '2026-11-02T10:00:00.000Z' // 2 h después de NOW
    expect(canCancelOnline({ startsAt }, minutesFromNow(-30))).toBe(true)
    expect(canCancelOnline({ startsAt }, NOW)).toBe(true)
    expect(canCancelOnline({ startsAt }, minutesFromNow(1))).toBe(false)
    expect(canCancelOnline({ startsAt }, minutesFromNow(119))).toBe(false)
  })

  it('una plaza reservada a menos de 2 horas ya no se puede cancelar online', () => {
    let state = stateWith(session({ startsAt: '2026-11-02T09:30:00.000Z' })) // 1 h 30 min después de NOW
    state = placeBooking(state, person('Ana'), meta()).state
    const ana = byName(state, 'Ana')
    expect(ana.status).toBe('confirmed')
    expect(codeOf(() => cancelByClient(state, ana.email, ana.code, NOW))).toBe('too_late')
  })

  it('la lista de espera se puede dejar hasta que empieza la clase', () => {
    const state = fullClass('2026-11-02T09:00:00.000Z')
    const dani = byName(state, 'Dani')
    expect(cancelByClient(state, dani.email, dani.code, minutesFromNow(59)).result.booking.status).toBe('cancelled')
    expect(codeOf(() => cancelByClient(state, dani.email, dani.code, minutesFromNow(60)))).toBe('past')
  })

  it('no se cancela dos veces ni con datos que no coinciden', () => {
    const state = fullClass()
    const ana = byName(state, 'Ana')
    const { state: next } = cancelByClient(state, ana.email, ana.code, NOW)
    expect(codeOf(() => cancelByClient(next, ana.email, ana.code, NOW))).toBe('already_cancelled')
    expect(codeOf(() => cancelByClient(state, 'otra@correo.example', ana.code, NOW))).toBe('not_found')
  })

  it('el estudio cancela sin límite de horas y también sube a la lista de espera', () => {
    const state = fullClass('2026-11-02T08:30:00.000Z') // empieza en 30 min
    const { result } = cancelBookingById(state, byName(state, 'Bea').id, NOW)
    expect(result.promoted?.name).toBe('Carla')
  })
})
