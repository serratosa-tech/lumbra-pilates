import type { DataSource } from '../DataSource.ts'
import { DEMO_ACCOUNTS } from '../demoAccounts.ts'
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
  Account,
  Booking,
  BookingDetails,
  BookingInput,
  BookingSource,
  Catalog,
  CancellationResult,
  ClientCancellation,
  SessionRecord,
  StudioState,
} from '../types.ts'
import { buildSeed, DEMO_CATALOG } from './seed/index.ts'
import { clearState, currentWeekKey, loadState, saveState, STORAGE_KEY, type LoadedState } from './store.ts'

/** Las mismas cuentas demo que en Supabase, con las mismas reglas. */
const ACCOUNTS: Array<Account & { password: string }> = [
  { ...DEMO_ACCOUNTS.client, role: 'client' },
  { ...DEMO_ACCOUNTS.studio, phone: null, role: 'studio' },
]

export interface DemoOptions {
  /** Dónde se guardan los datos; null = solo en memoria. */
  storage?: Storage | null
  /** Dónde vive la sesión. */
  authStorage?: Storage | null
  now?: () => Date
  seed?: (now: Date) => StudioState
  catalog?: Catalog
}

export interface DemoDataSource extends DataSource {
  /** Vuelve a los datos de ejemplo. */
  reset(): Promise<void>
}

/**
 * Implementación en memoria de la capa de datos, con la lógica de src/data/logic.
 * Solo la usan los tests: replica lo que hacen las funciones de Supabase.
 */
export function createDemoDataSource(options: DemoOptions = {}): DemoDataSource {
  const storage = options.storage ?? null
  const authStorage = options.authStorage ?? null
  const now = options.now ?? (() => new Date())
  const seed = options.seed ?? buildSeed
  const catalog = options.catalog ?? DEMO_CATALOG
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

  // Asíncrono como la red, para que los componentes pasen por su estado de carga.
  const run = async <T>(operation: () => T): Promise<T> => operation()

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

  const forClient = ({ booking, promoted }: CancellationResult): ClientCancellation => ({ booking, promoted: promoted !== null })

  function readAccount(): Account | null {
    try {
      const raw = authStorage?.getItem(STORAGE_KEY)
      return raw ? (JSON.parse(raw) as Account) : null
    } catch {
      return null
    }
  }

  function requireAccount(): Account {
    const account = readAccount()
    if (!account) throw new DataError('unauthorized')
    return account
  }

  function requireStudio() {
    if (readAccount()?.role !== 'studio') throw new DataError('unauthorized')
  }

  /** Como book_class: con sesión se usa el email de la cuenta y, con el cliente demo, también su nombre y teléfono. */
  function bookingInputFor(input: BookingInput): BookingInput {
    const account = readAccount()
    if (!account) return input
    if (account.role === 'client' && account.phone) {
      return { ...input, name: account.name, email: account.email, phone: account.phone }
    }
    return { ...input, email: account.email }
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
        const result = placeBooking(state, bookingInputFor(input), bookingMeta(state, 'web'))
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
        return forClient(result.result)
      }),

    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },

    prepare() {
      // En memoria no hay nada que descargar.
    },

    signIn: (email, password) =>
      run(() => {
        const found = ACCOUNTS.find((a) => a.email === normalizeEmail(email) && a.password === password)
        if (!found) throw new DataError('invalid_credentials')
        const { password: _password, ...account } = found
        try {
          authStorage?.setItem(STORAGE_KEY, JSON.stringify(account))
        } catch {
          // Sin almacenamiento la sesión no se recuerda, pero funciona.
        }
        notify()
        return account
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

    getAccount: () => run(readAccount),

    listMyBookings: () =>
      run(() => {
        const { email } = requireAccount()
        const state = current()
        return state.bookings
          .filter((b) => b.email === email)
          .map((b) => details(b, state))
          .sort((a, b) => a.session.startsAt.localeCompare(b.session.startsAt))
      }),

    cancelMyBooking: (bookingId) =>
      run(() => {
        const { email } = requireAccount()
        const state = current()
        const booking = state.bookings.find((b) => b.id === bookingId && b.email === email)
        if (!booking) throw new DataError('not_found')
        const result = cancelByClient(state, booking.email, booking.code, now())
        commit(result.state)
        return forClient(result.result)
      }),

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
