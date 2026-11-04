import { describe, expect, it, vi } from 'vitest'
import { memoryStorage } from '../../test/fixtures.ts'
import type { DataSource } from '../DataSource.ts'
import { DEMO_ACCOUNTS } from '../demoAccounts.ts'
import { STORAGE_KEY } from '../storage.ts'
import { createSupabaseDataSource } from './supabaseDataSource.ts'

const CONFIG = { url: 'https://demo.supabase.co', key: 'sb_publishable_prueba' }
const SESSION_ID = '0b9c3c1e-6a43-4f7e-9b1a-2d6f1f0c8a11'
const WEEK = ['2026-11-02T00:00:00.000Z', '2026-11-09T00:00:00.000Z'] as const

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })

const SESSION = {
  id: SESSION_ID,
  classTypeId: 'mat-flow',
  instructorId: 'marta-ibanez',
  startsAt: '2026-11-03T17:00:00.000Z',
  durationMinutes: 55,
  capacity: 10,
  status: 'scheduled',
  name: 'Mat Flow',
  level: 'todos',
  instructor: 'Marta Ibáñez',
  bookedCount: 4,
  waitlistCount: 0,
}

/** supabase-js de mentira: solo lo que usa la capa de datos. */
function fakeSupabase() {
  let session: { user: { id: string; email: string; user_metadata: Record<string, unknown> } } | null = null
  let member: { display_name: string } | null = null
  const rpc = vi.fn(async (fn: string, _args?: unknown): Promise<{ data: unknown; error: unknown }> => {
    if (fn === 'list_studio_bookings') return { data: [], error: null }
    if (fn === 'cancel_my_booking') return { data: { error: undefined }, error: { code: 'P0001', message: 'not_found' } }
    return { data: { booking: { id: 'b1' }, session: SESSION, waitlistPosition: null }, error: null }
  })
  const signOut = vi.fn(async (_options: unknown) => {
    session = null
    return { error: null }
  })
  const client = {
    auth: {
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      getSession: async () => ({ data: { session }, error: null }),
      signInWithPassword: async ({ email, password }: { email: string; password: string }) => {
        if (password !== 'demo1234') {
          return { error: { name: 'AuthApiError', code: 'invalid_credentials', status: 400, message: 'Invalid login credentials' } }
        }
        session = { user: { id: `id-${email}`, email, user_metadata: {} } }
        member = email === DEMO_ACCOUNTS.studio.email ? { display_name: 'Lucía Ferrer' } : null
        return { error: null }
      },
      signOut,
    },
    rpc,
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: member, error: null }) }) }) }),
  }
  const createClient = vi.fn((..._args: unknown[]) => client)
  const loadSupabase = vi.fn(async () => ({ createClient }) as never)
  return { rpc, signOut, createClient, loadSupabase }
}

function setup(fetchImpl: typeof fetch = vi.fn(async () => json([SESSION])), storage = memoryStorage()) {
  const supabase = fakeSupabase()
  const ds = createSupabaseDataSource({ config: CONFIG, storage, fetch: fetchImpl, loadSupabase: supabase.loadSupabase })
  return { ds, fetchImpl: fetchImpl as ReturnType<typeof vi.fn>, supabase, storage }
}

function request(fetchImpl: ReturnType<typeof vi.fn>, index = 0) {
  const [url, init] = fetchImpl.mock.calls[index] as [string, RequestInit]
  return { url, init, headers: init.headers as Record<string, string> }
}

describe('Supabase · lo público, con fetch directo', () => {
  it('pide el horario a list_sessions solo con la clave publishable y sin cargar supabase-js', async () => {
    const { ds, fetchImpl, supabase } = setup()
    expect(await ds.listSessions(...WEEK)).toEqual([SESSION])

    const { url, init, headers } = request(fetchImpl)
    expect(url).toBe('https://demo.supabase.co/rest/v1/rpc/list_sessions')
    expect(init.method).toBe('POST')
    expect(JSON.parse(String(init.body))).toEqual({ p_from: WEEK[0], p_to: WEEK[1] })
    expect(headers).toMatchObject({ apikey: CONFIG.key, 'Content-Type': 'application/json' })
    expect(headers).not.toHaveProperty('Authorization')
    expect(supabase.loadSupabase).not.toHaveBeenCalled()
  })

  it('lee el catálogo de las tablas públicas con los nombres de campo de la app', async () => {
    const { ds, fetchImpl } = setup(vi.fn(async () => json([])))
    await ds.listClassTypes()
    const { url, init } = request(fetchImpl)
    expect(init.method).toBe('GET')
    expect(decodeURIComponent(url)).toBe(
      'https://demo.supabase.co/rest/v1/class_types?select=id,name,summary,level,intensity,durationMinutes:duration_minutes,capacity&order=id',
    )
  })

  it.each([
    ['get_session', (ds: DataSource) => ds.getSession(SESSION_ID)],
    ['find_booking', (ds: DataSource) => ds.findBooking('ana@correo.example', 'LUM-7K3Q')],
    ['cancel_booking', (ds: DataSource) => ds.cancelBooking('ana@correo.example', 'LUM-7K3Q')],
    ['instructors', (ds: DataSource) => ds.listInstructors()],
  ])('%s va con fetch directo, sin Authorization y sin supabase-js', async (path, call) => {
    const { ds, fetchImpl, supabase } = setup(vi.fn(async () => json({ booking: { id: 'b1' }, promoted: false })))
    await call(ds)
    const { url, headers } = request(fetchImpl)
    expect(url).toContain(`/rest/v1/${path === 'instructors' ? path : `rpc/${path}`}`)
    expect(headers).toMatchObject({ apikey: CONFIG.key })
    expect(headers).not.toHaveProperty('Authorization')
    expect(supabase.loadSupabase).not.toHaveBeenCalled()
  })

  it('una clase con un id imposible es null sin preguntar al servidor', async () => {
    const { ds, fetchImpl } = setup()
    expect(await ds.getSession('no-es-un-uuid')).toBeNull()
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('Mis reservas con código: null si no coincide y not_found al cancelar una ajena', async () => {
    const fetchImpl = vi.fn(async (url: string) => (url.endsWith('find_booking') ? json(null) : json({ error: 'not_found' })))
    const { ds } = setup(fetchImpl as unknown as typeof fetch)
    expect(await ds.findBooking('ana@correo.example', 'LUM-7K3Q')).toBeNull()
    await expect(ds.cancelBooking('ana@correo.example', 'LUM-7K3Q')).rejects.toMatchObject({ code: 'not_found' })
  })

  it.each([
    ['too_many_attempts', json({ code: 'P0001', message: 'too_many_attempts' }, 400)],
    ['duplicate', json({ code: 'P0001', message: 'duplicate' }, 400)],
    ['unauthorized', json({ code: '42501', message: 'permission denied for function get_roster' }, 401)],
    ['unauthorized', json({ code: 'PGRST303', message: 'JWT expired' }, 401)],
    ['unavailable', json({ code: 'PGRST002', message: 'Could not query the database' }, 503)],
  ])('traduce la respuesta de error a %s', async (code, response) => {
    const { ds } = setup(vi.fn(async () => response))
    await expect(ds.findBooking('ana@correo.example', 'LUM-7K3Q')).rejects.toMatchObject({ code })
  })

  it('sin conexión, el error es network', async () => {
    const { ds } = setup(vi.fn(async () => Promise.reject(new TypeError('Failed to fetch'))))
    await expect(ds.listSessions(...WEEK)).rejects.toMatchObject({ code: 'network' })
  })

  it('sin variables de entorno, cada petición falla con unavailable', async () => {
    const ds = createSupabaseDataSource({ config: null, storage: null, fetch: vi.fn() })
    await expect(ds.listSessions(...WEEK)).rejects.toMatchObject({ code: 'unavailable' })
    await expect(ds.signIn('a@b.example', 'x')).rejects.toMatchObject({ code: 'unavailable' })
  })
})

describe('Supabase · cuentas, con supabase-js diferido', () => {
  it('sin sesión guardada no descarga supabase-js para saber que no hay cuenta', async () => {
    const { ds, supabase } = setup()
    expect(await ds.getAccount()).toBeNull()
    await ds.signOut()
    expect(supabase.loadSupabase).not.toHaveBeenCalled()
  })

  it('con una sesión guardada carga el cliente con la clave única de la app', async () => {
    const storage = memoryStorage({ [STORAGE_KEY]: JSON.stringify({ access_token: 'a', refresh_token: 'r' }) })
    const { ds, supabase } = setup(undefined, storage)
    expect(await ds.getAccount()).toBeNull()
    expect(supabase.loadSupabase).toHaveBeenCalledTimes(1)
    const [url, key, options] = supabase.createClient.mock.calls[0] as [string, string, { auth: Record<string, unknown> }]
    expect([url, key]).toEqual([CONFIG.url, CONFIG.key])
    expect(options.auth).toMatchObject({ storageKey: STORAGE_KEY, persistSession: true, detectSessionInUrl: false })
  })

  const SESSION_INPUT = {
    classTypeId: 'mat-flow',
    instructorId: 'marta-ibanez',
    startsAt: '2026-11-20T17:00:00.000Z',
    durationMinutes: 55,
    capacity: 10,
  }
  const SESSION_CALLS: [string, (ds: DataSource) => Promise<unknown>][] = [
    ['listMyBookings', (ds) => ds.listMyBookings()],
    ['cancelMyBooking', (ds) => ds.cancelMyBooking('b1')],
    ['getRoster', (ds) => ds.getRoster(SESSION_ID)],
    ['createSession', (ds) => ds.createSession(SESSION_INPUT)],
    ['updateSession', (ds) => ds.updateSession(SESSION_ID, SESSION_INPUT)],
    ['cancelSession', (ds) => ds.cancelSession(SESSION_ID)],
    ['addManualBooking', (ds) => ds.addManualBooking({ sessionId: SESSION_ID, name: 'A B', email: 'a@b.example', phone: '612345678' })],
    ['cancelBookingById', (ds) => ds.cancelBookingById('b1')],
    ['setAttendance', (ds) => ds.setAttendance('b1', 'attended')],
    ['getMetrics', (ds) => ds.getMetrics(...WEEK)],
  ]

  it.each(SESSION_CALLS)('sin sesión, %s es unauthorized sin llamar al servidor ni descargar supabase-js', async (_name, call) => {
    const { ds, supabase } = setup()
    await expect(call(ds)).rejects.toMatchObject({ code: 'unauthorized' })
    expect(supabase.loadSupabase).not.toHaveBeenCalled()
    expect(supabase.rpc).not.toHaveBeenCalled()
  })

  it.each(SESSION_CALLS)('con una sesión guardada pero caducada, %s es unauthorized sin RPC', async (_name, call) => {
    const storage = memoryStorage({ [STORAGE_KEY]: JSON.stringify({ access_token: 'a', refresh_token: 'r' }) })
    const { ds, supabase } = setup(undefined, storage)
    await expect(call(ds)).rejects.toMatchObject({ code: 'unauthorized' })
    expect(supabase.rpc).not.toHaveBeenCalled()
  })

  it('si supabase-js no se descarga (sin red), el error es network y se reintenta en la siguiente acción', async () => {
    const { ds, supabase } = setup()
    supabase.loadSupabase.mockRejectedValueOnce(new TypeError('Failed to fetch dynamically imported module'))
    await expect(ds.signIn(DEMO_ACCOUNTS.client.email, 'demo1234')).rejects.toMatchObject({ code: 'network' })
    expect(await ds.signIn(DEMO_ACCOUNTS.client.email, 'demo1234')).toMatchObject({ role: 'client' })
    expect(supabase.loadSupabase).toHaveBeenCalledTimes(2)
  })

  it('una contraseña incorrecta es invalid_credentials', async () => {
    const { ds } = setup()
    await expect(ds.signIn(DEMO_ACCOUNTS.client.email, 'otra')).rejects.toMatchObject({ code: 'invalid_credentials' })
  })

  it('el cliente demo entra con sus datos, ve sus reservas, cancela con RPC y cierra sesión solo aquí', async () => {
    const { ds, supabase } = setup()
    const account = await ds.signIn(' Cliente@Lumbra.example ', 'demo1234')
    expect(account).toEqual({
      email: DEMO_ACCOUNTS.client.email,
      name: DEMO_ACCOUNTS.client.name,
      phone: DEMO_ACCOUNTS.client.phone,
      role: 'client',
    })

    await ds.createBooking({ sessionId: SESSION_ID, name: 'Ana Demo', email: 'x@y.example', phone: '+34 600 000 900' })
    expect(supabase.rpc).toHaveBeenCalledWith('book_class', {
      p_session_id: SESSION_ID,
      p_name: 'Ana Demo',
      p_email: 'x@y.example',
      p_phone: '+34 600 000 900',
    })

    await ds.listMyBookings()
    expect(supabase.rpc).toHaveBeenCalledWith('list_my_bookings', undefined)
    await expect(ds.cancelMyBooking('ajena')).rejects.toMatchObject({ code: 'not_found' })
    expect(supabase.rpc).toHaveBeenCalledWith('cancel_my_booking', { p_booking_id: 'ajena' })

    await ds.signOut()
    expect(supabase.signOut).toHaveBeenCalledWith({ scope: 'local' })
    expect(await ds.getAccount()).toBeNull()

    // Sin sesión, las funciones de cuenta ni se piden (evita un 401 al refrescar justo al salir).
    supabase.rpc.mockClear()
    await expect(ds.listMyBookings()).rejects.toMatchObject({ code: 'unauthorized' })
    await expect(ds.getRoster(SESSION_ID)).rejects.toMatchObject({ code: 'unauthorized' })
    expect(supabase.rpc).not.toHaveBeenCalled()
  })

  it('el estudio es miembro y sus métricas salen de list_studio_bookings y list_sessions', async () => {
    const { ds, supabase, fetchImpl } = setup()
    expect(await ds.signIn(DEMO_ACCOUNTS.studio.email, 'demo1234')).toMatchObject({ name: 'Lucía Ferrer', role: 'studio' })

    const metrics = await ds.getMetrics(...WEEK)
    expect(supabase.rpc).toHaveBeenCalledWith('list_studio_bookings', { p_from: WEEK[0], p_to: WEEK[1] })
    expect(request(fetchImpl).url).toMatch(/rpc\/list_sessions$/)
    expect(metrics.sessions).toBe(1)
  })

  it('avisa a quien escucha después de cada cambio', async () => {
    const { ds } = setup()
    const listener = vi.fn()
    ds.subscribe(listener)
    await ds.signIn(DEMO_ACCOUNTS.studio.email, 'demo1234')
    await ds.setAttendance('b1', 'attended')
    expect(listener).toHaveBeenCalledTimes(1)
  })
})
