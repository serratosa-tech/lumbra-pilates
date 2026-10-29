import { describe, expect, it } from 'vitest'
import type { ClassSession } from '../types.ts'
import { createDemoDataSource } from './demoDataSource.ts'

const session: ClassSession = {
  id: 'reformer-lunes',
  name: 'Reformer',
  instructor: 'Lucía',
  startsAt: '2026-11-02T09:00:00.000Z',
  durationMinutes: 50,
  capacity: 1,
  bookedCount: 0,
}

const person = (name: string) => ({
  sessionId: session.id,
  name,
  email: `${name.toLowerCase()}@ejemplo.es`,
  phone: '600000000',
})

describe('demoDataSource', () => {
  it('confirma mientras haya plazas y después pone en lista de espera', async () => {
    const ds = createDemoDataSource([session])
    const first = await ds.createBooking(person('Ana'))
    const second = await ds.createBooking(person('Bea'))

    expect(first.status).toBe('confirmed')
    expect(second.status).toBe('waitlisted')
    expect(first.code).toMatch(/^[A-Z2-9]{6}$/)
  })

  it('encuentra reservas por email y código sin distinguir mayúsculas', async () => {
    const ds = createDemoDataSource([session])
    const booking = await ds.createBooking(person('Ana'))

    const found = await ds.findBookings(' ANA@ejemplo.es ', booking.code.toLowerCase())
    expect(found.map((b) => b.id)).toEqual([booking.id])
    expect(await ds.findBookings('otra@ejemplo.es', booking.code)).toEqual([])
  })

  it('al cancelar promociona a la primera persona en lista de espera', async () => {
    const ds = createDemoDataSource([session])
    const first = await ds.createBooking(person('Ana'))
    const second = await ds.createBooking(person('Bea'))

    await ds.cancelBooking(first.email, first.code)

    const [promoted] = await ds.findBookings(second.email, second.code)
    expect(promoted.status).toBe('confirmed')
    const [updated] = await ds.listSessions('2026-11-01T00:00:00.000Z', '2026-11-08T00:00:00.000Z')
    expect(updated.bookedCount).toBe(1)
  })

  it('libera la plaza si no hay lista de espera', async () => {
    const ds = createDemoDataSource([session])
    const booking = await ds.createBooking(person('Ana'))

    await ds.cancelBooking(booking.email, booking.code)

    const [updated] = await ds.listSessions('2026-11-01T00:00:00.000Z', '2026-11-08T00:00:00.000Z')
    expect(updated.bookedCount).toBe(0)
    await expect(ds.cancelBooking(booking.email, booking.code)).rejects.toThrow()
  })
})
