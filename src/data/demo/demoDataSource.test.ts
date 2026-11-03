import { describe, expect, it, vi } from 'vitest'
import { CATALOG, memoryStorage, NOW, person, session } from '../../test/fixtures.ts'
import { DEMO_ACCOUNTS } from '../demoAccounts.ts'
import { DataError } from '../errors.ts'
import { createDemoDataSource } from './demoDataSource.ts'
import { STORAGE_KEY } from './store.ts'

const { client: CLIENT, studio: STUDIO } = DEMO_ACCOUNTS

const WEEK = ['2026-11-02T00:00:00.000Z', '2026-11-09T00:00:00.000Z'] as const

function setup() {
  const storage = memoryStorage()
  const authStorage = memoryStorage()
  const options = {
    storage,
    authStorage,
    catalog: CATALOG,
    now: () => NOW,
    seed: () => ({ sessions: [session({ capacity: 1 })], bookings: [] }),
  }
  return { ds: createDemoDataSource(options), storage, authStorage, options }
}

describe('demoDataSource', () => {
  it('reserva, encuentra y cancela con subida automática de la lista de espera', async () => {
    const { ds } = setup()
    const ana = await ds.createBooking(person('Ana'))
    const bea = await ds.createBooking(person('Bea'))
    expect(ana.booking.status).toBe('confirmed')
    expect(bea).toMatchObject({ booking: { status: 'waitlisted' }, waitlistPosition: 1 })
    expect(ana.session).toMatchObject({ name: 'Mat Flow', instructor: 'Marta' })

    const found = await ds.findBooking(' ANA@correo.example', ana.booking.code.toLowerCase())
    expect(found?.booking.id).toBe(ana.booking.id)
    expect(await ds.findBooking('otra@correo.example', ana.booking.code)).toBeNull()

    const result = await ds.cancelBooking(ana.booking.email, ana.booking.code)
    // Como cancel_booking en Supabase: se sabe que subió alguien, pero no quién.
    expect(result.promoted).toBe(true)
    const [updated] = await ds.listSessions(...WEEK)
    expect(updated).toMatchObject({ bookedCount: 1, waitlistCount: 0 })
  })

  it('guarda en localStorage y recupera los datos al volver a abrir', async () => {
    const { ds, storage, options } = setup()
    const { booking } = await ds.createBooking(person('Ana'))
    expect(storage.length).toBe(1)
    expect(storage.key(0)).toBe(STORAGE_KEY)

    const reopened = createDemoDataSource(options)
    expect((await reopened.findBooking(booking.email, booking.code))?.booking.status).toBe('confirmed')
  })

  it('avisa de los cambios y restablece los datos de ejemplo', async () => {
    const { ds } = setup()
    const listener = vi.fn()
    const unsubscribe = ds.subscribe(listener)
    const { booking } = await ds.createBooking(person('Ana'))
    expect(listener).toHaveBeenCalledTimes(1)

    await ds.reset()
    expect(listener).toHaveBeenCalledTimes(2)
    expect(await ds.findBooking(booking.email, booking.code)).toBeNull()
    unsubscribe()
  })

  it('el panel necesita iniciar sesión con la cuenta demo del estudio', async () => {
    const { ds, authStorage } = setup()
    await expect(ds.getRoster('s1')).rejects.toMatchObject({ code: 'unauthorized' })
    await expect(ds.signIn(STUDIO.email, 'otra')).rejects.toBeInstanceOf(DataError)

    const account = await ds.signIn(' Estudio@Lumbra.example ', STUDIO.password)
    expect(account).toMatchObject({ email: STUDIO.email, role: 'studio' })
    expect(await ds.getAccount()).toEqual(account)
    expect(authStorage.getItem(STORAGE_KEY)).not.toBeNull()
    expect((await ds.getRoster('s1')).session.id).toBe('s1')

    await ds.signOut()
    expect(await ds.getAccount()).toBeNull()
  })

  it('el cliente demo no entra en el panel, reserva con sus datos y ve y cancela solo lo suyo', async () => {
    const { ds } = setup()
    const other = await ds.createBooking(person('Bea'))
    await ds.signIn(CLIENT.email, CLIENT.password)
    await expect(ds.getRoster('s1')).rejects.toMatchObject({ code: 'unauthorized' })

    const mine = await ds.createBooking(person('Otro nombre'))
    expect(mine.booking).toMatchObject({ name: CLIENT.name, email: CLIENT.email, phone: CLIENT.phone, status: 'waitlisted' })
    expect((await ds.listMyBookings()).map((d) => d.booking.id)).toEqual([mine.booking.id])
    await expect(ds.cancelMyBooking(other.booking.id)).rejects.toMatchObject({ code: 'not_found' })
    expect((await ds.cancelMyBooking(mine.booking.id)).booking.status).toBe('cancelled')
  })

  it('el estudio gestiona reservas y clases', async () => {
    const { ds } = setup()
    await ds.signIn(STUDIO.email, STUDIO.password)
    const manual = await ds.addManualBooking(person('Ana'))
    expect(manual.booking.source).toBe('studio')

    const affected = await ds.cancelSession('s1')
    expect(affected.map((b) => b.status)).toEqual(['class_cancelled'])
    const roster = await ds.getRoster('s1')
    expect(roster.session.status).toBe('cancelled')
    expect(roster.cancelled).toHaveLength(1)

    const created = await ds.createSession({
      classTypeId: 'reformer',
      instructorId: 'lucia',
      startsAt: '2026-11-03T09:00:00.000Z',
      durationMinutes: 50,
      capacity: 6,
    })
    expect(created).toMatchObject({ name: 'Reformer', bookedCount: 0, level: 'avanzado' })
    const metrics = await ds.getMetrics(...WEEK)
    expect(metrics.sessions).toBe(1)
  })
})
