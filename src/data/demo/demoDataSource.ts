import type { DataSource } from '../DataSource.ts'
import { DataError } from '../errors.ts'
import {
  cancelBookingById,
  cancelByClient,
  findByCode,
  placeBooking,
  waitlistPosition,
} from '../logic/booking.ts'
import { generateBookingCode } from '../logic/codes.ts'
import { computeMetrics } from '../logic/metrics.ts'
import { cancelSession, createSession, setAttendance, updateSession } from '../logic/sessions.ts'
import { confirmedOf, getSessionRecord, toClassSession, waitlistOf } from '../logic/state.ts'
import { normalizeEmail } from '../logic/validation.ts'
import type {
  Booking,
  BookingDetails,
  BookingSource,
  Catalog,
  SessionRecord,
  StudioState,
  StudioUser,
} from '../types.ts'
import { buildSeed, DEMO_CATALOG } from './seed/index.ts'
import { clearState, currentWeekKey, loadState, saveState, STORAGE_KEY, type LoadedState } from './store.ts'

/** Cuenta del panel en la demo (en la fase 5 pasa a Supabase Auth). */
export const DEMO_CREDENTIALS = { email: 'estudio@lumbra.example', password: 'demo1234' }
const DEMO_USER: StudioUser = { email: DEMO_CREDENTIALS.email, name: 'Lucía Ferrer' }

export interface DemoOptions {
  /** Dónde se guardan los datos (localStorage en el navegador); null = solo en memoria. */
  storage?: Storage | null
  /** Dónde vive la sesión del panel (sessionStorage en el navegador). */
  authStorage?: Storage | null
  now?: () => Date
  /** Retardo simulado de red, para que se vean los estados de carga. */
  latencyMs?: number
  seed?: (now: Date) => StudioState
  catalog?: Catalog
  /** Refresca los datos cuando otra pestaña los cambia. */
  syncTabs?: boolean
}

export interface DemoDataSource extends DataSource {
  /** Vuelve a los datos de ejemplo. */
  reset(): Promise<void>
}

export function createDemoDataSource(options: DemoOptions = {}): DemoDataSource {
  const storage = options.storage ?? null
  const authStorage = options.authStorage ?? null
  const now = options.now ?? (() => new Date())
  const seed = options.seed ?? buildSeed
  const catalog = options.catalog ?? DEMO_CATALOG
  const latencyMs = options.latencyMs ?? 0
  const listeners = new Set<() => void>()

  let loaded: LoadedState = loadState(storage, now(), seed)

  const notify = () => listeners.forEach((listener) => listener())

  /** Estado actual; si ha empezado otra semana desde que se sembró, se vuelve a sembrar. */
  function current(): StudioState {
    if (currentWeekKey(now()) !== loaded.seedWeek) loaded = loadState(storage, now(), seed)
    return loaded.state
  }

  function commit(state: StudioState) {
    loaded = { ...loaded, state }
    saveState(storage, loaded)
    notify()
  }

  async function run<T>(operation: () => T): Promise<T> {
    if (latencyMs > 0) await new Promise((resolve) => setTimeout(resolve, latencyMs))
    return operation()
  }

  const view = (record: SessionRecord, state = current()) => toClassSession(record, state, catalog)

  const details = (booking: Booking, state: StudioState): BookingDetails => ({
    booking,
    session: view(getSessionRecord(state, booking.sessionId), state),
    waitlistPosition: waitlistPosition(state, booking),
  })

  const bookingMeta = (state: StudioState, source: BookingSource) => ({
    id: crypto.randomUUID(),
    code: generateBookingCode(new Set(state.bookings.map((b) => b.code))),
    now: now(),
    source,
  })

  function readUser(): StudioUser | null {
    try {
      const raw = authStorage?.getItem(STORAGE_KEY)
      return raw ? (JSON.parse(raw) as StudioUser) : null
    } catch {
      return null
    }
  }

  function requireStudio() {
    if (!readUser()) throw new DataError('unauthorized')
  }

  if (options.syncTabs && typeof window !== 'undefined') {
    window.addEventListener('storage', (event) => {
      if (event.key !== STORAGE_KEY || event.storageArea !== storage) return
      loaded = loadState(storage, now(), seed)
      notify()
    })
  }

  return {
    listClassTypes: () => run(() => catalog.classTypes.map((t) => ({ ...t }))),

    listInstructors: () => run(() => catalog.instructors.map((i) => ({ ...i, specialties: [...i.specialties] }))),

    listSessions: (from, to) =>
      run(() => {
        const state = current()
        return state.sessions
          .filter((s) => s.startsAt >= from && s.startsAt < to)
          .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
          .map((s) => view(s, state))
      }),

    getSession: (id) =>
      run(() => {
        const state = current()
        const record = state.sessions.find((s) => s.id === id)
        return record ? view(record, state) : null
      }),

    createBooking: (input) =>
      run(() => {
        const state = current()
        const result = placeBooking(state, input, bookingMeta(state, 'web'))
        commit(result.state)
        return details(result.booking, result.state)
      }),

    findBooking: (email, code) =>
      run(() => {
        const state = current()
        const booking = findByCode(state, email, code)
        return booking ? details(booking, state) : null
      }),

    cancelBooking: (email, code) =>
      run(() => {
        const result = cancelByClient(current(), email, code, now())
        commit(result.state)
        return result.result
      }),

    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },

    signIn: (email, password) =>
      run(() => {
        if (normalizeEmail(email) !== DEMO_CREDENTIALS.email || password !== DEMO_CREDENTIALS.password) {
          throw new DataError('invalid_credentials')
        }
        try {
          authStorage?.setItem(STORAGE_KEY, JSON.stringify(DEMO_USER))
        } catch {
          // Sin sessionStorage la sesión no se recuerda al recargar, pero el panel funciona.
        }
        notify()
        return { ...DEMO_USER }
      }),

    signOut: () =>
      run(() => {
        try {
          authStorage?.removeItem(STORAGE_KEY)
        } catch {
          // Nada que borrar.
        }
        notify()
      }),

    getStudioUser: () => run(readUser),

    getRoster: (sessionId) =>
      run(() => {
        requireStudio()
        const state = current()
        const record = getSessionRecord(state, sessionId)
        return {
          session: view(record, state),
          confirmed: confirmedOf(state, sessionId),
          waitlist: waitlistOf(state, sessionId),
          cancelled: state.bookings
            .filter((b) => b.sessionId === sessionId && (b.status === 'cancelled' || b.status === 'class_cancelled'))
            .sort((a, b) => (b.cancelledAt ?? '').localeCompare(a.cancelledAt ?? '')),
        }
      }),

    createSession: (input) =>
      run(() => {
        requireStudio()
        const result = createSession(current(), input, { id: crypto.randomUUID(), now: now() }, catalog)
        commit(result.state)
        return view(result.session, result.state)
      }),

    updateSession: (id, input) =>
      run(() => {
        requireStudio()
        const result = updateSession(current(), id, input, now(), catalog)
        commit(result.state)
        return { session: view(result.session, result.state), promoted: result.promoted }
      }),

    cancelSession: (id) =>
      run(() => {
        requireStudio()
        const result = cancelSession(current(), id, now())
        commit(result.state)
        return result.affected
      }),

    addManualBooking: (input) =>
      run(() => {
        requireStudio()
        const state = current()
        const result = placeBooking(state, input, bookingMeta(state, 'studio'))
        commit(result.state)
        return details(result.booking, result.state)
      }),

    cancelBookingById: (bookingId) =>
      run(() => {
        requireStudio()
        const result = cancelBookingById(current(), bookingId, now())
        commit(result.state)
        return result.result
      }),

    setAttendance: (bookingId, attendance) =>
      run(() => {
        requireStudio()
        const result = setAttendance(current(), bookingId, attendance, now())
        commit(result.state)
        return result.booking
      }),

    getMetrics: (from, to) =>
      run(() => {
        requireStudio()
        return computeMetrics(current(), from, to, now())
      }),

    reset: () =>
      run(() => {
        clearState(storage)
        loaded = loadState(storage, now(), seed)
        notify()
      }),
  }
}
