import { startOfWeek, studioDate, toDateKey } from '../../lib/dates.ts'
import type { StudioState } from '../types.ts'

/** Única clave de la app en localStorage (y en sessionStorage para la sesión del panel). */
export const STORAGE_KEY = 'lumbra-pilates:v1'
/** Sube cuando cambia la forma de los datos guardados: los antiguos se descartan. */
export const SCHEMA_VERSION = 1

interface Persisted extends StudioState {
  schemaVersion: number
  /** Lunes de la semana en que se sembraron los datos («2026-10-26»). */
  seedWeek: string
}

export function currentWeekKey(now: Date): string {
  return toDateKey(startOfWeek(studioDate(now)))
}

function isPersisted(value: unknown): value is Persisted {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Partial<Persisted>
  return (
    typeof v.schemaVersion === 'number' &&
    typeof v.seedWeek === 'string' &&
    Array.isArray(v.sessions) &&
    Array.isArray(v.bookings)
  )
}

function read(storage: Storage | null): Persisted | null {
  try {
    const raw = storage?.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    return isPersisted(parsed) ? parsed : null
  } catch {
    return null
  }
}

export interface LoadedState {
  state: StudioState
  seedWeek: string
}

/**
 * Lee los datos guardados. Si no hay, están dañados, son de otra versión o de una semana anterior,
 * siembra datos de ejemplo nuevos (así la demo siempre tiene clases esta semana) y los guarda.
 */
export function loadState(storage: Storage | null, now: Date, seed: (now: Date) => StudioState): LoadedState {
  const seedWeek = currentWeekKey(now)
  const stored = read(storage)
  if (stored && stored.schemaVersion === SCHEMA_VERSION && stored.seedWeek === seedWeek) {
    return { state: { sessions: stored.sessions, bookings: stored.bookings }, seedWeek }
  }
  const state = seed(now)
  saveState(storage, { state, seedWeek })
  return { state, seedWeek }
}

export function saveState(storage: Storage | null, { state, seedWeek }: LoadedState): void {
  const persisted: Persisted = { schemaVersion: SCHEMA_VERSION, seedWeek, ...state }
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(persisted))
  } catch {
    // Sin espacio o almacenamiento bloqueado: la demo sigue funcionando en memoria.
  }
}

/** Borra solo la clave de la app; nunca el resto del almacenamiento. */
export function clearState(storage: Storage | null): void {
  try {
    storage?.removeItem(STORAGE_KEY)
  } catch {
    // Almacenamiento bloqueado: no hay nada que borrar.
  }
}
