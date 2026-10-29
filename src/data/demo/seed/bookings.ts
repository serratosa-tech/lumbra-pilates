import { generateBookingCode } from '../../logic/codes.ts'
import type { Booking, BookingStatus, SessionRecord, StudioState } from '../../types.ts'
import { CUSTOMERS, type Customer } from './customers.ts'
import { seededRandom, shuffled } from './random.ts'
import { buildSeedSessions, slotKey, type SeedSession } from './weeklySchedule.ts'

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR
const SEED = 20261029

/** Esta semana: clases llenas con lista de espera (franja → personas esperando). */
const WAITLIST_THIS_WEEK: Record<string, number> = { '1 18:30': 2, '2 19:00': 3, '4 18:00': 1, '6 09:30': 2 }
/** La semana que viene: clases que ya se han llenado. */
const FULL_NEXT_WEEK: Record<string, number> = { '4 18:00': 1, '6 09:30': 2 }
/** Esta semana el estudio ha cancelado una clase (Nerea, de baja). */
const CANCELLED_THIS_WEEK = '4 13:30'

/** Reservas de ejemplo para probar «Mis reservas»; siempre caen en la semana que viene. */
export const DEMO_EXAMPLES = [
  { customer: CUSTOMERS[0], code: 'LUM-7K3Q', slot: '4 18:00', status: 'confirmed', label: 'Plaza confirmada' },
  { customer: CUSTOMERS[1], code: 'LUM-W8HT', slot: '6 09:30', status: 'waitlisted', label: 'En lista de espera' },
] as const

const POOL = CUSTOMERS.slice(DEMO_EXAMPLES.length)

interface Plan {
  confirmed: number
  waitlisted: number
  cancelled: number
}

function planFor({ week, slot }: SeedSession, random: () => number): Plan {
  const key = slotKey(slot)
  const cancelled = week < 2 && random() < 0.45 ? 1 : 0
  if (week === -1) return { confirmed: slot.booked - (random() < 0.3 ? 1 : 0), waitlisted: 0, cancelled }
  if (week === 0) return { confirmed: slot.booked, waitlisted: WAITLIST_THIS_WEEK[key] ?? 0, cancelled }
  if (week === 1) {
    if (key in FULL_NEXT_WEEK) return { confirmed: slot.capacity, waitlisted: FULL_NEXT_WEEK[key], cancelled }
    return { confirmed: Math.max(1, slot.booked - 3), waitlisted: 0, cancelled }
  }
  return { confirmed: Math.round(slot.booked * 0.35), waitlisted: 0, cancelled: 0 }
}

/** Reservas, lista de espera, cancelaciones y asistencia de las semanas sembradas, coherentes con `now`. */
export function buildSeed(now: Date): StudioState {
  const random = seededRandom(SEED)
  const nowMs = now.getTime()
  const codes = new Set<string>(DEMO_EXAMPLES.map((e) => e.code))
  const sessions: SessionRecord[] = []
  const bookings: Booking[] = []
  let nextId = 0

  for (const seedSession of buildSeedSessions(now)) {
    const { record, week, slot } = seedSession
    const key = slotKey(slot)
    const plan = planFor(seedSession, random)
    const isCancelled = week === 0 && key === CANCELLED_THIS_WEEK
    const showcase = week === 1 ? DEMO_EXAMPLES.find((e) => e.slot === key) : undefined
    const hasPromotion = week === 0 && key in WAITLIST_THIS_WEEK

    const people = shuffled(POOL, random)
    const take = (n: number) => people.splice(0, n)
    const cancelledPeople = take(plan.cancelled + (hasPromotion ? 1 : 0))
    const confirmedPeople = take(plan.confirmed)
    const waitlistPeople = take(plan.waitlisted)
    if (showcase?.status === 'confirmed') confirmedPeople[0] = showcase.customer
    if (showcase?.status === 'waitlisted') waitlistPeople[waitlistPeople.length - 1] = showcase.customer

    const ordered: Array<[Customer, BookingStatus]> = [
      ...cancelledPeople.map((c): [Customer, BookingStatus] => [c, 'cancelled']),
      ...confirmedPeople.map((c): [Customer, BookingStatus] => [c, 'confirmed']),
      ...waitlistPeople.map((c): [Customer, BookingStatus] => [c, 'waitlisted']),
    ]

    const startMs = new Date(record.startsAt).getTime()
    const ended = startMs + record.durationMinutes * MINUTE <= nowMs
    // Todas las reservas se hicieron antes de hoy y antes de la clase, espaciadas unos 47 minutos.
    const base = Math.min(startMs - DAY, nowMs - HOUR)
    const created = ordered.map((_, i) => base - (ordered.length - i) * 47 * MINUTE)
    const lastConfirmedAt = created[cancelledPeople.length + confirmedPeople.length - 1]

    ordered.forEach(([customer, status], i) => {
      const isShowcase = showcase?.customer === customer
      const booking: Booking = {
        id: `demo-${++nextId}`,
        code: isShowcase ? showcase.code : generateBookingCode(codes, random),
        sessionId: record.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        status,
        source: random() < 0.12 ? 'studio' : 'web',
        createdAt: new Date(created[i]).toISOString(),
        attendance: null,
      }
      codes.add(booking.code)

      if (status === 'cancelled') {
        // La primera cancelación de una clase con lista de espera es la que hizo subir a alguien.
        const cancelledAt = hasPromotion && i === 0 ? lastConfirmedAt + 20 * MINUTE : (created[i] + base) / 2
        booking.cancelledAt = new Date(cancelledAt).toISOString()
      }
      if (hasPromotion && status === 'confirmed' && created[i] === lastConfirmedAt) {
        booking.promotedAt = new Date(lastConfirmedAt + 20 * MINUTE).toISOString()
      }
      if (isCancelled && (status === 'confirmed' || status === 'waitlisted')) {
        booking.status = 'class_cancelled'
        booking.cancelledAt = new Date(Math.min(startMs - 4 * HOUR, nowMs - 30 * MINUTE)).toISOString()
      }
      if (ended && booking.status === 'confirmed') {
        booking.attendance = random() < 0.9 ? 'attended' : 'no_show'
      }
      bookings.push(booking)
    })

    sessions.push(isCancelled ? { ...record, status: 'cancelled' } : record)
  }

  return { sessions, bookings }
}
