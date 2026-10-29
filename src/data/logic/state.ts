import { DataError } from '../errors.ts'
import type { Booking, Catalog, ClassSession, SessionRecord, StudioState } from '../types.ts'

const byCreation = (a: Booking, b: Booking) => a.createdAt.localeCompare(b.createdAt)

export function getSessionRecord(state: StudioState, id: string): SessionRecord {
  const session = state.sessions.find((s) => s.id === id)
  if (!session) throw new DataError('session_not_found')
  return session
}

export function getBooking(state: StudioState, id: string): Booking {
  const booking = state.bookings.find((b) => b.id === id)
  if (!booking) throw new DataError('not_found', 'Esta reserva ya no existe.')
  return booking
}

/** Plazas confirmadas, por orden de reserva. */
export function confirmedOf(state: StudioState, sessionId: string): Booking[] {
  return state.bookings.filter((b) => b.sessionId === sessionId && b.status === 'confirmed').sort(byCreation)
}

/** Lista de espera, por orden de llegada. */
export function waitlistOf(state: StudioState, sessionId: string): Booking[] {
  return state.bookings.filter((b) => b.sessionId === sessionId && b.status === 'waitlisted').sort(byCreation)
}

export const startMs = (session: Pick<SessionRecord, 'startsAt'>) => new Date(session.startsAt).getTime()
export const endMs = (session: Pick<SessionRecord, 'startsAt' | 'durationMinutes'>) =>
  startMs(session) + session.durationMinutes * 60_000

export function replaceBookings(state: StudioState, changed: Booking[]): StudioState {
  const byId = new Map(changed.map((b) => [b.id, b]))
  return { ...state, bookings: state.bookings.map((b) => byId.get(b.id) ?? b) }
}

/** Añade a la clase su tipo, su instructora y las plazas ocupadas. */
export function toClassSession(record: SessionRecord, state: StudioState, catalog: Catalog): ClassSession {
  const classType = catalog.classTypes.find((t) => t.id === record.classTypeId)
  const instructor = catalog.instructors.find((i) => i.id === record.instructorId)
  let bookedCount = 0
  let waitlistCount = 0
  for (const b of state.bookings) {
    if (b.sessionId !== record.id) continue
    if (b.status === 'confirmed') bookedCount++
    else if (b.status === 'waitlisted') waitlistCount++
  }
  return {
    ...record,
    name: classType?.name ?? 'Clase',
    level: classType?.level ?? 'todos',
    instructor: instructor?.name ?? 'Por confirmar',
    bookedCount,
    waitlistCount,
  }
}
