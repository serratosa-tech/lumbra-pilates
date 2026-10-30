import type { ClassSession, DataSource } from '../../../data/index.ts'
import {
  addDays,
  dayRange,
  formatDate,
  isSameDate,
  studioDate,
  studioDateTime,
} from '../../../lib/dates.ts'
import { capitalize } from '../../../lib/text.ts'

/** Clases que muestra la portada como máximo. */
export const UPCOMING_LIMIT = 4
/** Días que se miran hacia delante para completar la lista. */
const LOOKAHEAD_DAYS = 7

export type DayRelation = 'hoy' | 'manana' | 'otro'

export interface UpcomingDay {
  relation: DayRelation
  sessions: ClassSession[]
}

/**
 * Hasta `limit` clases: primero las que quedan hoy y, si no llegan,
 * las del siguiente día con clases (normalmente mañana).
 */
export async function loadUpcoming(ds: DataSource, now: Date, limit = UPCOMING_LIMIT): Promise<UpcomingDay[]> {
  const today = studioDate(now)
  const tomorrow = addDays(today, 1)
  const days: UpcomingDay[] = []
  const scheduled = async (from: string, to: string) =>
    (await ds.listSessions(from, to)).filter((s) => s.status === 'scheduled')

  const todaySessions = (await scheduled(now.toISOString(), dayRange(today).to)).slice(0, limit)
  if (todaySessions.length > 0) days.push({ relation: 'hoy', sessions: todaySessions })

  const missing = limit - todaySessions.length
  if (missing === 0) return days

  const ahead = await scheduled(
    studioDateTime(tomorrow).toISOString(),
    studioDateTime(addDays(tomorrow, LOOKAHEAD_DAYS)).toISOString(),
  )
  if (ahead.length === 0) return days

  const nextDate = studioDate(new Date(ahead[0].startsAt))
  const { to } = dayRange(nextDate)
  days.push({
    relation: isSameDate(nextDate, tomorrow) ? 'manana' : 'otro',
    sessions: ahead.filter((s) => s.startsAt < to).slice(0, missing),
  })
  return days
}

/** «Hoy, jueves 29», «Mañana, viernes 30» o «Lunes 2 de noviembre». */
export function dayHeading(day: UpcomingDay): string {
  const iso = day.sessions[0].startsAt
  if (day.relation === 'hoy') return `Hoy, ${formatDate(iso, { month: false })}`
  if (day.relation === 'manana') return `Mañana, ${formatDate(iso, { month: false })}`
  return capitalize(formatDate(iso))
}
