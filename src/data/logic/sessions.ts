import { DataError } from '../errors.ts'
import type { Attendance, Booking, Catalog, SessionInput, SessionRecord, StudioState } from '../types.ts'
import { promoteWaitlist } from './booking.ts'
import { confirmedOf, endMs, getBooking, getSessionRecord, replaceBookings, startMs } from './state.ts'

/** La asistencia se puede marcar desde este número de minutos antes de empezar. */
export const ATTENDANCE_OPENS_MINUTES = 30
export const CAPACITY_RANGE = { min: 1, max: 30 }
export const DURATION_RANGE = { min: 15, max: 120 }

const inRange = (value: number, range: { min: number; max: number }) =>
  Number.isInteger(value) && value >= range.min && value <= range.max

function assertValid(input: SessionInput, catalog: Catalog, now: Date) {
  const valid =
    catalog.classTypes.some((t) => t.id === input.classTypeId) &&
    catalog.instructors.some((i) => i.id === input.instructorId) &&
    inRange(input.capacity, CAPACITY_RANGE) &&
    inRange(input.durationMinutes, DURATION_RANGE) &&
    !Number.isNaN(startMs(input))
  if (!valid) throw new DataError('invalid_input')
  if (startMs(input) <= now.getTime()) throw new DataError('past', 'La clase tiene que empezar en el futuro.')
}

/** El estudio tiene una sola sala: dos clases programadas no pueden coincidir. */
function assertNoOverlap(state: StudioState, input: SessionInput, ignoreId?: string) {
  const overlaps = state.sessions.some(
    (s) => s.id !== ignoreId && s.status === 'scheduled' && startMs(s) < endMs(input) && startMs(input) < endMs(s),
  )
  if (overlaps) throw new DataError('overlap')
}

export function createSession(
  state: StudioState,
  input: SessionInput,
  meta: { id: string; now: Date },
  catalog: Catalog,
): { state: StudioState; session: SessionRecord } {
  assertValid(input, catalog, meta.now)
  assertNoOverlap(state, input)
  const session: SessionRecord = { ...input, id: meta.id, status: 'scheduled' }
  return { state: { ...state, sessions: [...state.sessions, session] }, session }
}

/**
 * Edita una clase que aún no ha empezado. El aforo no puede bajar de las plazas confirmadas;
 * si sube, entra gente de la lista de espera.
 */
export function updateSession(
  state: StudioState,
  id: string,
  input: SessionInput,
  now: Date,
  catalog: Catalog,
): { state: StudioState; session: SessionRecord; promoted: Booking[] } {
  const current = getSessionRecord(state, id)
  if (current.status === 'cancelled') throw new DataError('class_cancelled')
  if (startMs(current) <= now.getTime()) throw new DataError('past')
  assertValid(input, catalog, now)
  if (input.capacity < confirmedOf(state, id).length) throw new DataError('capacity_below_booked')
  assertNoOverlap(state, input, id)

  const session: SessionRecord = { ...current, ...input }
  const updated = { ...state, sessions: state.sessions.map((s) => (s.id === id ? session : s)) }
  const promotion = promoteWaitlist(updated, id, now)
  return { state: promotion.state, session, promoted: promotion.promoted }
}

/** Cancela una clase: todas sus reservas activas pasan a «cancelada por el estudio». */
export function cancelSession(
  state: StudioState,
  id: string,
  now: Date,
): { state: StudioState; affected: Booking[] } {
  const current = getSessionRecord(state, id)
  if (current.status === 'cancelled') throw new DataError('class_cancelled')
  if (startMs(current) <= now.getTime()) throw new DataError('past')

  const affected = state.bookings
    .filter((b) => b.sessionId === id && (b.status === 'confirmed' || b.status === 'waitlisted'))
    .map((b): Booking => ({ ...b, status: 'class_cancelled', cancelledAt: now.toISOString() }))
  const withSession = {
    ...state,
    sessions: state.sessions.map((s): SessionRecord => (s.id === id ? { ...s, status: 'cancelled' } : s)),
  }
  return { state: replaceBookings(withSession, affected), affected }
}

export function canMarkAttendance(session: Pick<SessionRecord, 'startsAt'>, now: Date): boolean {
  return now.getTime() >= startMs(session) - ATTENDANCE_OPENS_MINUTES * 60_000
}

/** Marca «asistió», «no vino» o lo deja sin marcar (null). */
export function setAttendance(
  state: StudioState,
  bookingId: string,
  attendance: Attendance | null,
  now: Date,
): { state: StudioState; booking: Booking } {
  const booking = getBooking(state, bookingId)
  if (booking.status !== 'confirmed') throw new DataError('not_confirmed')
  if (!canMarkAttendance(getSessionRecord(state, booking.sessionId), now)) throw new DataError('attendance_too_early')
  const updated: Booking = { ...booking, attendance }
  return { state: replaceBookings(state, [updated]), booking: updated }
}
