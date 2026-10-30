import type { ClassLevel, ClassSession } from '../types.ts'
import { endMs, startMs } from './state.ts'

/** Estado de una clase en el horario. */
export type SessionState = 'available' | 'last_spots' | 'full' | 'past' | 'cancelled'

/** A partir de cuántas plazas libres (o menos) se avisa de «últimas plazas». */
export const LAST_SPOTS_THRESHOLD = 2

export function freeSpots(session: Pick<ClassSession, 'capacity' | 'bookedCount'>): number {
  return Math.max(0, session.capacity - session.bookedCount)
}

export function sessionState(session: ClassSession, now: Date): SessionState {
  if (session.status === 'cancelled') return 'cancelled'
  if (now.getTime() >= startMs(session)) return 'past'
  const free = freeSpots(session)
  if (free === 0) return 'full'
  if (free <= LAST_SPOTS_THRESHOLD) return 'last_spots'
  return 'available'
}

/** La clase ya ha terminado (no solo empezado). */
export function hasEnded(session: Pick<ClassSession, 'startsAt' | 'durationMinutes'>, now: Date): boolean {
  return now.getTime() >= endMs(session)
}

/** Se puede reservar (o entrar en la lista de espera). */
export function isBookable(state: SessionState): boolean {
  return state === 'available' || state === 'last_spots' || state === 'full'
}

export interface SessionFilters {
  classTypeId?: string
  instructorId?: string
  /** Las clases «para todos los niveles» encajan con cualquier nivel. */
  level?: ClassLevel
}

export function filterSessions(sessions: ClassSession[], filters: SessionFilters): ClassSession[] {
  return sessions.filter(
    (s) =>
      (!filters.classTypeId || s.classTypeId === filters.classTypeId) &&
      (!filters.instructorId || s.instructorId === filters.instructorId) &&
      (!filters.level || s.level === filters.level || s.level === 'todos'),
  )
}
