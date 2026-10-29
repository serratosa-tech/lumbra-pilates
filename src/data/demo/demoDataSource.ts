import { generateBookingCode, normalizeEmail } from '../../lib/bookingCode.ts'
import type { DataSource } from '../DataSource.ts'
import type { Booking, ClassSession } from '../types.ts'

export function createDemoDataSource(seedSessions: ClassSession[] = []): DataSource {
  const sessions = new Map(seedSessions.map((s) => [s.id, { ...s }]))
  const bookings: Booking[] = []

  function getSession(id: string): ClassSession {
    const session = sessions.get(id)
    if (!session) throw new Error('La clase no existe.')
    return session
  }

  function findOwnBookings(email: string, code: string): Booking[] {
    const normalized = normalizeEmail(email)
    const upperCode = code.trim().toUpperCase()
    return bookings.filter((b) => b.email === normalized && b.code === upperCode)
  }

  return {
    async listSessions(from, to) {
      return [...sessions.values()]
        .filter((s) => s.startsAt >= from && s.startsAt < to)
        .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
        .map((s) => ({ ...s }))
    },

    async createBooking(input) {
      const session = getSession(input.sessionId)
      const hasSpace = session.bookedCount < session.capacity
      if (hasSpace) session.bookedCount += 1

      const booking: Booking = {
        id: crypto.randomUUID(),
        code: generateBookingCode(),
        sessionId: session.id,
        name: input.name.trim(),
        email: normalizeEmail(input.email),
        phone: input.phone.trim(),
        status: hasSpace ? 'confirmed' : 'waitlisted',
        createdAt: new Date().toISOString(),
      }
      bookings.push(booking)
      return { ...booking }
    },

    async findBookings(email, code) {
      return findOwnBookings(email, code).map((b) => ({ ...b }))
    },

    async cancelBooking(email, code) {
      const booking = findOwnBookings(email, code).find((b) => b.status !== 'cancelled')
      if (!booking) throw new Error('No hay ninguna reserva activa con esos datos.')

      const wasConfirmed = booking.status === 'confirmed'
      booking.status = 'cancelled'

      if (wasConfirmed) {
        const next = bookings.find(
          (b) => b.sessionId === booking.sessionId && b.status === 'waitlisted',
        )
        if (next) next.status = 'confirmed'
        else getSession(booking.sessionId).bookedCount -= 1
      }
      return { ...booking }
    },
  }
}
