import { describe, expect, it } from 'vitest'
import { errorCodeOf as errorCode, meta, NOW, person, session, stateWith } from '../../test/fixtures.ts'
import type { StudioState } from '../types.ts'
import { placeBooking, waitlistPosition } from './booking.ts'

function book(state: StudioState, name: string, minutesLater = 0) {
  return placeBooking(state, person(name), meta(minutesLater))
}

describe('reservar', () => {
  it('confirma mientras queden plazas y guarda los datos normalizados', () => {
    const { state, booking } = placeBooking(
      stateWith(),
      { sessionId: 's1', name: '  Ana   López ', email: ' ANA@Correo.Example ', phone: '612345678' },
      meta(),
    )
    expect(booking).toMatchObject({
      status: 'confirmed',
      name: 'Ana López',
      email: 'ana@correo.example',
      phone: '+34 612 345 678',
      attendance: null,
      source: 'web',
    })
    expect(state.bookings).toHaveLength(1)
  })

  it('con la clase llena apunta a la lista de espera y numera las posiciones', () => {
    let state = stateWith()
    state = book(state, 'Ana').state
    state = book(state, 'Bea', 1).state
    const carla = book(state, 'Carla', 2)
    const dani = book(carla.state, 'Dani', 3)

    expect(carla.booking.status).toBe('waitlisted')
    expect(dani.booking.status).toBe('waitlisted')
    expect(waitlistPosition(dani.state, carla.booking)).toBe(1)
    expect(waitlistPosition(dani.state, dani.booking)).toBe(2)
    expect(waitlistPosition(dani.state, dani.state.bookings[0])).toBeNull()
  })

  it('no deja reservar dos veces la misma clase con el mismo email', () => {
    const { state } = book(stateWith(), 'Ana')
    const sameEmail = { ...person('Otra'), email: '  ANA@correo.example' }
    expect(errorCode(() => placeBooking(state, sameEmail, meta()))).toBe('duplicate')
  })

  it('tampoco si la primera reserva está en lista de espera', () => {
    let state = stateWith(session({ capacity: 1 }))
    state = book(state, 'Ana').state
    state = book(state, 'Bea').state
    expect(errorCode(() => book(state, 'Bea'))).toBe('duplicate')
  })

  it('se puede volver a reservar después de cancelar', () => {
    const { state, booking } = book(stateWith(), 'Ana')
    const cancelled: StudioState = {
      ...state,
      bookings: state.bookings.map((b) => (b.id === booking.id ? { ...b, status: 'cancelled' } : b)),
    }
    expect(book(cancelled, 'Ana').booking.status).toBe('confirmed')
  })

  it('no deja reservar una clase empezada, pasada o cancelada', () => {
    const started = stateWith(session({ startsAt: NOW.toISOString() }))
    const past = stateWith(session({ startsAt: '2026-11-01T10:00:00.000Z' }))
    const cancelled = stateWith(session({ status: 'cancelled' }))
    expect(errorCode(() => book(started, 'Ana'))).toBe('past')
    expect(errorCode(() => book(past, 'Ana'))).toBe('past')
    expect(errorCode(() => book(cancelled, 'Ana'))).toBe('class_cancelled')
  })

  it('el estudio puede añadir a alguien a una clase empezada, pero no terminada', () => {
    const started = stateWith(session({ startsAt: '2026-11-02T07:30:00.000Z' }))
    const ended = stateWith(session({ startsAt: '2026-11-02T06:00:00.000Z' }))
    expect(placeBooking(started, person('Ana'), meta(0, 'studio')).booking.source).toBe('studio')
    expect(errorCode(() => placeBooking(ended, person('Ana'), meta(0, 'studio')))).toBe('past')
  })

  it('rechaza datos no válidos aunque lleguen sin pasar por el formulario', () => {
    expect(errorCode(() => placeBooking(stateWith(), { ...person('Ana'), phone: '123' }, meta()))).toBe('invalid_input')
    expect(errorCode(() => placeBooking(stateWith(), { ...person('Ana'), sessionId: 'nada' }, meta()))).toBe(
      'session_not_found',
    )
  })
})
