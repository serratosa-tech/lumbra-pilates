import type { BadgeTone } from '../ui/index.ts'
import {
  freeSpots,
  sessionState,
  type BookingStatus,
  type ClassIntensity,
  type ClassLevel,
  type ClassSession,
  type SessionState,
} from '../../data/index.ts'

export const LEVEL_LABELS: Record<ClassLevel, string> = {
  iniciacion: 'Iniciación',
  intermedio: 'Intermedio',
  avanzado: 'Avanzado',
  todos: 'Todos los niveles',
}

export const INTENSITY_LABELS: Record<ClassIntensity, string> = {
  1: 'Suave',
  2: 'Media',
  3: 'Alta',
}

export const BOOKING_STATUS_LABELS: Record<BookingStatus, { label: string; tone: BadgeTone }> = {
  confirmed: { label: 'Plaza confirmada', tone: 'exito' },
  waitlisted: { label: 'En lista de espera', tone: 'aviso' },
  cancelled: { label: 'Cancelada', tone: 'neutral' },
  class_cancelled: { label: 'Cancelada por el estudio', tone: 'error' },
}

export interface SpotsStatus {
  label: string
  tone: BadgeTone
  state: SessionState
}

/** Texto y tono del estado de plazas de una clase; `short` para columnas estrechas. */
export function spotsStatus(session: ClassSession, now: Date, short = false): SpotsStatus {
  const state = sessionState(session, now)
  const free = freeSpots(session)
  switch (state) {
    case 'cancelled':
      return { state, label: 'Cancelada', tone: 'neutral' }
    case 'past':
      return { state, label: 'Finalizada', tone: 'neutral' }
    case 'full':
      return { state, label: short ? 'Completa' : 'Completa · lista de espera', tone: 'error' }
    case 'last_spots':
      return { state, label: free === 1 ? 'Última plaza' : `Últimas ${free}${short ? '' : ' plazas'}`, tone: 'aviso' }
    default:
      return { state, label: short ? `${free} libres` : `${free} plazas libres`, tone: 'exito' }
  }
}

/** «1 plaza» / «3 plazas» */
export function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : pluralForm}`
}
