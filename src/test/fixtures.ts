import { DataError } from '../data/errors.ts'
import type { BookingInput, Catalog, SessionRecord, StudioState } from '../data/types.ts'

/** Código del DataError que lanza `fn`, para comprobar las reglas de negocio. */
export function errorCodeOf(fn: () => unknown): string {
  try {
    fn()
    return 'sin error'
  } catch (error) {
    return error instanceof DataError ? error.code : 'otro error'
  }
}

/** Datos mínimos y fijos para los tests de la lógica de negocio. */
export const NOW = new Date('2026-11-02T08:00:00.000Z') // lunes, 9:00 en Madrid

export const CATALOG: Catalog = {
  classTypes: [
    { id: 'mat-flow', name: 'Mat Flow', summary: '', level: 'todos', intensity: 2, durationMinutes: 55, capacity: 12 },
    { id: 'reformer', name: 'Reformer', summary: '', level: 'avanzado', intensity: 3, durationMinutes: 50, capacity: 8 },
  ],
  instructors: [
    { id: 'marta', name: 'Marta', role: '', bio: '', specialties: [], initials: 'M' },
    { id: 'lucia', name: 'Lucía', role: '', bio: '', specialties: [], initials: 'L' },
  ],
}

export function session(overrides: Partial<SessionRecord> = {}): SessionRecord {
  return {
    id: 's1',
    classTypeId: 'mat-flow',
    instructorId: 'marta',
    startsAt: '2026-11-02T17:00:00.000Z', // 18:00 en Madrid
    durationMinutes: 55,
    capacity: 2,
    status: 'scheduled',
    ...overrides,
  }
}

export function stateWith(...sessions: SessionRecord[]): StudioState {
  return { sessions: sessions.length ? sessions : [session()], bookings: [] }
}

export function person(name: string, sessionId = 's1'): BookingInput {
  return { sessionId, name, email: `${name.toLowerCase()}@correo.example`, phone: '612 345 678' }
}

let counter = 0

/** Metadatos de una reserva nueva hecha `minutesLater` minutos después de NOW. */
export function meta(minutesLater = 0, source: 'web' | 'studio' = 'web') {
  counter++
  return {
    id: `b${counter}`,
    code: `LUM-${String(counter).padStart(4, '2').slice(-4)}`,
    now: new Date(NOW.getTime() + minutesLater * 60_000),
    source,
  }
}

/** Storage en memoria, independiente del localStorage de jsdom. */
export function memoryStorage(initial: Record<string, string> = {}): Storage {
  const data = new Map(Object.entries(initial))
  return {
    get length() {
      return data.size
    },
    clear: () => data.clear(),
    getItem: (key) => data.get(key) ?? null,
    key: (index) => [...data.keys()][index] ?? null,
    removeItem: (key) => void data.delete(key),
    setItem: (key, value) => void data.set(key, String(value)),
  }
}

export const minutesFromNow =(minutes: number) => new Date(NOW.getTime() + minutes * 60_000)
