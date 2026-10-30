import { DataError } from '../errors.ts'
import type { Booking, BookingInput, BookingSource, CancellationResult, SessionRecord, StudioState } from '../types.ts'
import { normalizeCode } from './codes.ts'
import {
  confirmedOf,
  endMs,
  getBooking,
  getSessionRecord,
  replaceBookings,
  startMs,
  waitlistOf,
} from './state.ts'
import { normalizeEmail, normalizePhone, validateEmail, validateName } from './validation.ts'

/** Horas antes de la clase hasta las que se puede cancelar online. */
export const CANCELLATION_LIMIT_HOURS = 2

export interface NewBookingMeta {
  id: string
  code: string
  now: Date
  source: BookingSource
}

const isActive = (b: Booking) => b.status === 'confirmed' || b.status === 'waitlisted'

/**
 * Reserva una plaza o, si la clase está llena, apunta a la lista de espera.
 * Desde la web solo antes de que empiece la clase; el estudio puede añadir a alguien hasta que termine.
 */
export function placeBooking(state: StudioState, input: BookingInput, meta: NewBookingMeta): { state: StudioState; booking: Booking } {
  const session = getSessionRecord(state, input.sessionId)
  const phone = normalizePhone(input.phone)
  if (validateName(input.name) || validateEmail(input.email) || !phone) throw new DataError('invalid_input')
  if (session.status === 'cancelled') throw new DataError('class_cancelled')

  const now = meta.now.getTime()
  const closesAt = meta.source === 'studio' ? endMs(session) : startMs(session)
  if (now >= closesAt) throw new DataError('past')

  const email = normalizeEmail(input.email)
  if (state.bookings.some((b) => b.sessionId === session.id && b.email === email && isActive(b))) {
    throw new DataError('duplicate')
  }

  const hasSpace = confirmedOf(state, session.id).length < session.capacity
  const booking: Booking = {
    id: meta.id,
    code: meta.code,
    sessionId: session.id,
    name: input.name.trim().replace(/\s+/g, ' '),
    email,
    phone,
    status: hasSpace ? 'confirmed' : 'waitlisted',
    source: meta.source,
    createdAt: meta.now.toISOString(),
    attendance: null,
  }
  return { state: { ...state, bookings: [...state.bookings, booking] }, booking }
}

/** Posición en la lista de espera (desde 1), o null si la reserva no está esperando. */
export function waitlistPosition(state: StudioState, booking: Booking): number | null {
  if (booking.status !== 'waitlisted') return null
  return waitlistOf(state, booking.sessionId).findIndex((b) => b.id === booking.id) + 1
}

export function findByCode(state: StudioState, email: string, code: string): Booking | undefined {
  const normalizedEmail = normalizeEmail(email)
  const normalizedCode = normalizeCode(code)
  return state.bookings.find((b) => b.code === normalizedCode && b.email === normalizedEmail)
}

/** Último momento en que se puede cancelar online. */
export function cancellationDeadline(session: Pick<SessionRecord, 'startsAt'>): Date {
  return new Date(startMs(session) - CANCELLATION_LIMIT_HOURS * 60 * 60_000)
}

/** Si una plaza confirmada en esta clase aún se puede cancelar online (también vale antes de reservar). */
export function canCancelOnline(session: Pick<SessionRecord, 'startsAt'>, now: Date): boolean {
  return now <= cancellationDeadline(session)
}

/**
 * Sube de la lista de espera, por orden de llegada, tantas personas como plazas libres haya.
 */
export function promoteWaitlist(state: StudioState, sessionId: string, now: Date): { state: StudioState; promoted: Booking[] } {
  const session = getSessionRecord(state, sessionId)
  const free = session.capacity - confirmedOf(state, sessionId).length
  if (free <= 0 || session.status === 'cancelled') return { state, promoted: [] }

  const promoted = waitlistOf(state, sessionId)
    .slice(0, free)
    .map((b): Booking => ({ ...b, status: 'confirmed', promotedAt: now.toISOString() }))
  return { state: replaceBookings(state, promoted), promoted }
}

function cancel(state: StudioState, booking: Booking, now: Date): { state: StudioState; result: CancellationResult } {
  const cancelled: Booking = { ...booking, status: 'cancelled', cancelledAt: now.toISOString() }
  const next = replaceBookings(state, [cancelled])
  if (booking.status !== 'confirmed') return { state: next, result: { booking: cancelled, promoted: null } }

  const promotion = promoteWaitlist(next, booking.sessionId, now)
  return { state: promotion.state, result: { booking: cancelled, promoted: promotion.promoted[0] ?? null } }
}

function assertCancellable(booking: Booking) {
  if (booking.status === 'class_cancelled') throw new DataError('class_cancelled')
  if (booking.status === 'cancelled') throw new DataError('already_cancelled')
}

/**
 * Cancelación desde «Mis reservas»: una plaza confirmada hasta 2 horas antes; la lista de espera,
 * hasta que empiece la clase. Si se libera una plaza, sube la primera persona de la lista.
 */
export function cancelByClient(
  state: StudioState,
  email: string,
  code: string,
  now: Date,
): { state: StudioState; result: CancellationResult } {
  const booking = findByCode(state, email, code)
  if (!booking) throw new DataError('not_found')
  assertCancellable(booking)

  const session = getSessionRecord(state, booking.sessionId)
  if (now.getTime() >= startMs(session)) throw new DataError('past')
  if (booking.status === 'confirmed' && !canCancelOnline(session, now)) throw new DataError('too_late')
  return cancel(state, booking, now)
}

/** Cancelación desde el panel: sin límite de horas, mientras la clase no haya terminado. */
export function cancelBookingById(
  state: StudioState,
  bookingId: string,
  now: Date,
): { state: StudioState; result: CancellationResult } {
  const booking = getBooking(state, bookingId)
  assertCancellable(booking)
  if (now.getTime() >= endMs(getSessionRecord(state, booking.sessionId))) throw new DataError('past')
  return cancel(state, booking, now)
}
