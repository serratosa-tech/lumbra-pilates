import { studioTime } from '../../lib/dates.ts'
import type { IsoDateTime, SlotOccupancy, StudioState, WeekMetrics } from '../types.ts'
import { startMs } from './state.ts'

/** Franjas de dos horas que se comparan en el gráfico de ocupación. */
const SLOT_HOURS = 2
const FIRST_HOUR = 7
const LAST_HOUR = 21

const ratio = (part: number, total: number) => (total === 0 ? 0 : part / total)

/**
 * Métricas de las clases que empiezan dentro de [from, to). La lista de espera solo cuenta
 * en las clases que aún no han empezado: en las demás ya nadie puede conseguir plaza.
 */
export function computeMetrics(state: StudioState, from: IsoDateTime, to: IsoDateTime, now: Date): WeekMetrics {
  const inRange = state.sessions.filter((s) => s.startsAt >= from && s.startsAt < to)
  const scheduled = inRange.filter((s) => s.status === 'scheduled')
  const scheduledIds = new Set(scheduled.map((s) => s.id))
  const upcomingIds = new Set(scheduled.filter((s) => startMs(s) > now.getTime()).map((s) => s.id))
  const rangeIds = new Set(inRange.map((s) => s.id))

  const confirmedBySession = new Map<string, number>()
  let waitlisted = 0
  let cancellations = 0
  let bookings = 0
  for (const b of state.bookings) {
    if (!rangeIds.has(b.sessionId) || b.status === 'class_cancelled') continue
    bookings++
    if (b.status === 'cancelled') cancellations++
    if (!scheduledIds.has(b.sessionId)) continue
    if (b.status === 'confirmed') confirmedBySession.set(b.sessionId, (confirmedBySession.get(b.sessionId) ?? 0) + 1)
    if (b.status === 'waitlisted' && upcomingIds.has(b.sessionId)) waitlisted++
  }

  const booked = (id: string) => confirmedBySession.get(id) ?? 0
  const totalCapacity = scheduled.reduce((sum, s) => sum + s.capacity, 0)
  const totalBooked = scheduled.reduce((sum, s) => sum + booked(s.id), 0)

  const slots: SlotOccupancy[] = []
  for (let fromHour = FIRST_HOUR; fromHour < LAST_HOUR; fromHour += SLOT_HOURS) {
    const toHour = fromHour + SLOT_HOURS
    const inSlot = scheduled.filter((s) => {
      const { hour } = studioTime(s.startsAt)
      return hour >= fromHour && hour < toHour
    })
    if (inSlot.length === 0) continue
    slots.push({
      fromHour,
      toHour,
      sessions: inSlot.length,
      occupancy: ratio(
        inSlot.reduce((sum, s) => sum + booked(s.id), 0),
        inSlot.reduce((sum, s) => sum + s.capacity, 0),
      ),
    })
  }

  return {
    sessions: scheduled.length,
    occupancy: ratio(totalBooked, totalCapacity),
    fullSessions: scheduled.filter((s) => booked(s.id) >= s.capacity).length,
    waitlisted,
    cancellations,
    cancellationRate: ratio(cancellations, bookings),
    slots,
  }
}
