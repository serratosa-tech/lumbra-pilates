import type { SupabaseClient } from '@supabase/supabase-js'
import type { DataSource } from '../DataSource.ts'
import { DEMO_ACCOUNTS } from '../demoAccounts.ts'
import { DataError } from '../errors.ts'
import { computeMetrics } from '../logic/metrics.ts'
import { normalizeEmail } from '../logic/validation.ts'
import { STORAGE_KEY } from '../storage.ts'
import type {
  Account,
  Booking,
  BookingDetails,
  BookingInput,
  CancellationResult,
  ClassSession,
  ClassType,
  ClientCancellation,
  Instructor,
  Roster,
  SessionInput,
} from '../types.ts'
import type { SupabaseConfig } from './config.ts'
import { createRest } from './rest.ts'
import { hasStoredSession } from './storedSession.ts'
import { toDataError } from './toDataError.ts'

type SupabaseModule = typeof import('./supabaseJs.ts')

export interface SupabaseOptions {
  /** null si faltan las variables de entorno: cada petición falla con `unavailable`. */
  config: SupabaseConfig | null
  /** Dónde guarda supabase-js la sesión (localStorage, bajo la clave única de la app). */
  storage: Storage | null
  fetch?: typeof fetch
  /** Carga diferida de supabase-js (sustituible en los tests). */
  loadSupabase?: () => Promise<SupabaseModule>
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const CLASS_TYPE_COLUMNS = 'id,name,summary,level,intensity,durationMinutes:duration_minutes,capacity'
const INSTRUCTOR_COLUMNS = 'id,name,role,bio,specialties,initials'

const bookingArgs = (input: BookingInput) => ({
  p_session_id: input.sessionId,
  p_name: input.name,
  p_email: input.email,
  p_phone: input.phone,
})

const sessionArgs = (input: SessionInput) => ({
  p_class_type_id: input.classTypeId,
  p_instructor_id: input.instructorId,
  p_starts_at: input.startsAt,
  p_duration_minutes: input.durationMinutes,
  p_capacity: input.capacity,
})

/**
 * Implementación de la capa de datos sobre Supabase, solo con las funciones RPC de supabase/migrations
 * (y la lectura de las tablas que la RLS deja ver: catálogo y la fila propia de studio_members).
 *
 * - Lo público va con `fetch` directo y la clave publishable: el horario no descarga supabase-js.
 * - supabase-js se importa de forma diferida al reservar, iniciar sesión o entrar en el panel,
 *   y añade a cada petición el token de la sesión.
 */
export function createSupabaseDataSource(options: SupabaseOptions): DataSource {
  const { config, storage } = options
  const fetchImpl = options.fetch ?? ((...args: Parameters<typeof fetch>) => globalThis.fetch(...args))
  const loadSupabase = options.loadSupabase ?? (() => import('./supabaseJs.ts'))
  const rest = config ? createRest(config, fetchImpl) : null
  const listeners = new Set<() => void>()
  const notify = () => listeners.forEach((listener) => listener())

  let clientPromise: Promise<SupabaseClient> | undefined
  let accountPromise: Promise<Account | null> | undefined
  /** Usuario de la última sesión conocida: solo se avisa cuando cambia de verdad. */
  let currentUserId: string | null | undefined

  function api() {
    if (!rest) throw new DataError('unavailable')
    return rest
  }

  function client(): Promise<SupabaseClient> {
    clientPromise ??= (async () => {
      if (!config) throw new DataError('unavailable')
      let module: SupabaseModule
      try {
        module = await loadSupabase()
      } catch (error) {
        // Sin conexión no llega el fragmento de supabase-js: se volverá a intentar en la siguiente acción.
        clientPromise = undefined
        throw toDataError(error)
      }
      const created = module.createClient(config.url, config.key, {
        auth: {
          storageKey: STORAGE_KEY,
          storage: storage ?? undefined,
          persistSession: storage !== null,
          autoRefreshToken: true,
          detectSessionInUrl: false,
        },
        global: { fetch: fetchImpl },
      })
      created.auth.onAuthStateChange((event, session) => {
        const userId = session?.user.id ?? null
        if (event === 'INITIAL_SESSION' || userId === currentUserId) {
          currentUserId = userId
          return
        }
        currentUserId = userId
        accountPromise = undefined
        // Fuera del aviso de Auth: quien escucha puede volver a pedir datos con el cliente.
        setTimeout(notify, 0)
      })
      return created
    })()
    return clientPromise
  }

  /** RPC con supabase-js: lleva el token de la sesión si la hay. */
  async function clientRpc<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
    const supabase = await client()
    const { data, error } = await supabase.rpc(fn, args)
    if (error) throw toDataError(error)
    return data as T
  }

  /**
   * RPC que solo existe para cuentas con sesión (cliente y estudio). Sin sesión ni se pide:
   * por ejemplo, la lista de «Tus reservas» que se refresca justo al cerrar sesión.
   */
  async function sessionRpc<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
    if (!clientPromise && !hasStoredSession(storage)) throw new DataError('unauthorized')
    const supabase = await client()
    const { data } = await supabase.auth.getSession()
    if (!data.session) throw new DataError('unauthorized')
    return clientRpc<T>(fn, args)
  }

  /** Ejecuta un cambio y avisa a quien muestra datos para que se refresque. */
  async function change<T>(operation: Promise<T>): Promise<T> {
    const result = await operation
    notify()
    return result
  }

  async function loadAccount(): Promise<Account | null> {
    const supabase = await client()
    const { data, error } = await supabase.auth.getSession()
    if (error) throw toDataError(error)
    const user = data.session?.user
    if (!user) return null

    const email = user.email ?? ''
    // La RLS solo deja ver la fila propia: si existe, la cuenta es del estudio.
    const member = await supabase.from('studio_members').select('display_name').eq('user_id', user.id).maybeSingle()
    if (member.error) throw toDataError(member.error)
    if (member.data) return { email, name: String(member.data.display_name), phone: null, role: 'studio' }

    const demo = DEMO_ACCOUNTS.client
    if (email === demo.email) return { email, name: demo.name, phone: demo.phone, role: 'client' }
    const name: unknown = user.user_metadata?.name
    return { email, name: typeof name === 'string' && name ? name : email.split('@')[0], phone: null, role: 'client' }
  }

  function getAccount(): Promise<Account | null> {
    // Sin sesión guardada (ni cliente ya cargado) no hace falta descargar supabase-js.
    if (!clientPromise && !hasStoredSession(storage)) return Promise.resolve(null)
    accountPromise ??= loadAccount().catch((error: unknown) => {
      accountPromise = undefined
      throw error
    })
    return accountPromise
  }

  async function listSessions(from: string, to: string): Promise<ClassSession[]> {
    return api().rpc<ClassSession[]>('list_sessions', { p_from: from, p_to: to })
  }

  return {
    listClassTypes: () => api().select<ClassType[]>('class_types', `select=${CLASS_TYPE_COLUMNS}&order=id`),

    listInstructors: () => api().select<Instructor[]>('instructors', `select=${INSTRUCTOR_COLUMNS}&order=id`),

    listSessions,

    getSession: async (id) => (UUID.test(id) ? api().rpc<ClassSession | null>('get_session', { p_id: id }) : null),

    createBooking: (input) => change(clientRpc<BookingDetails>('book_class', bookingArgs(input))),

    findBooking: (email, code) => api().rpc<BookingDetails | null>('find_booking', { p_email: email, p_code: code }),

    cancelBooking: (email, code) =>
      change(
        (async () => {
          const result = await api().rpc<ClientCancellation | { error: string }>('cancel_booking', {
            p_email: email,
            p_code: code,
          })
          // Un fallo no lanza error en Postgres (desharía el registro del intento): llega como { error }.
          if ('error' in result) throw toDataError({ code: result.error })
          return result
        })(),
      ),

    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },

    prepare() {
      client().catch(() => {
        // Solo era una precarga: si falla, la acción real mostrará el error.
      })
    },

    async signIn(email, password) {
      const supabase = await client()
      const { error } = await supabase.auth.signInWithPassword({ email: normalizeEmail(email), password })
      if (error) throw toDataError(error)
      accountPromise = undefined
      const account = await getAccount()
      if (!account) throw new DataError('unauthorized')
      return account
    },

    async signOut() {
      if (!clientPromise && !hasStoredSession(storage)) return
      const supabase = await client()
      // 'local': cierra la sesión solo en este navegador. 'global' echaría a todos los visitantes de la cuenta demo.
      const { error } = await supabase.auth.signOut({ scope: 'local' })
      if (error) throw toDataError(error)
      accountPromise = undefined
      notify()
    },

    getAccount,

    listMyBookings: () => sessionRpc<BookingDetails[]>('list_my_bookings'),

    cancelMyBooking: (bookingId) => change(sessionRpc<ClientCancellation>('cancel_my_booking', { p_booking_id: bookingId })),

    getRoster: (sessionId) => sessionRpc<Roster>('get_roster', { p_session_id: sessionId }),

    createSession: (input) => change(sessionRpc<ClassSession>('create_session', sessionArgs(input))),

    updateSession: (id, input) =>
      change(sessionRpc<{ session: ClassSession; promoted: Booking[] }>('update_session', { p_id: id, ...sessionArgs(input) })),

    cancelSession: (id) => change(sessionRpc<Booking[]>('cancel_session', { p_id: id })),

    addManualBooking: (input) => change(sessionRpc<BookingDetails>('add_manual_booking', bookingArgs(input))),

    cancelBookingById: (bookingId) =>
      change(sessionRpc<CancellationResult>('cancel_booking_by_id', { p_booking_id: bookingId })),

    setAttendance: (bookingId, attendance) =>
      change(sessionRpc<Booking>('set_attendance', { p_booking_id: bookingId, p_attendance: attendance })),

    async getMetrics(from, to) {
      // Las métricas se calculan en la app con la misma función que la demo: no se duplica la lógica en SQL.
      const [bookings, sessions] = await Promise.all([
        sessionRpc<Booking[]>('list_studio_bookings', { p_from: from, p_to: to }),
        listSessions(from, to),
      ])
      return computeMetrics({ sessions, bookings }, from, to, new Date())
    },
  }
}
