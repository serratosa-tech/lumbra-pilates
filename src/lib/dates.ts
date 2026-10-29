import type { IsoDateTime } from '../data/types.ts'

/** El estudio trabaja siempre en hora peninsular española. */
export const STUDIO_TIME_ZONE = 'Europe/Madrid'
const LOCALE = 'es-ES'

export interface CalendarDate {
  year: number
  month: number
  day: number
}

const partsFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: STUDIO_TIME_ZONE,
  hourCycle: 'h23',
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
  second: 'numeric',
})

function studioParts(date: Date) {
  const parts = Object.fromEntries(
    partsFormatter.formatToParts(date).map((p) => [p.type, Number(p.value)]),
  )
  return parts as Record<'year' | 'month' | 'day' | 'hour' | 'minute' | 'second', number>
}

/** Diferencia en ms entre la hora del estudio y UTC en ese instante. */
function offsetAt(utcMs: number): number {
  const p = studioParts(new Date(utcMs))
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second)
  return asUtc - Math.floor(utcMs / 1000) * 1000
}

/** Fecha de calendario (en hora del estudio) de un instante. */
export function studioDate(date: Date): CalendarDate {
  const { year, month, day } = studioParts(date)
  return { year, month, day }
}

/** Instante UTC que corresponde a una fecha y hora locales del estudio. */
export function studioDateTime(date: CalendarDate, hour = 0, minute = 0): Date {
  const guess = Date.UTC(date.year, date.month - 1, date.day, hour, minute)
  const first = guess - offsetAt(guess)
  return new Date(guess - offsetAt(first))
}

export function addDays(date: CalendarDate, days: number): CalendarDate {
  const d = new Date(Date.UTC(date.year, date.month - 1, date.day + days))
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() }
}

/** Día de la semana ISO: 1 = lunes … 7 = domingo. */
export function isoWeekday(date: CalendarDate): number {
  const d = new Date(Date.UTC(date.year, date.month - 1, date.day)).getUTCDay()
  return d === 0 ? 7 : d
}

/** Lunes de la semana a la que pertenece la fecha. */
export function startOfWeek(date: CalendarDate): CalendarDate {
  return addDays(date, 1 - isoWeekday(date))
}

/** Intervalo [inicio, fin) del día del estudio, en ISO. */
export function dayRange(date: CalendarDate): { from: IsoDateTime; to: IsoDateTime } {
  return {
    from: studioDateTime(date).toISOString(),
    to: studioDateTime(addDays(date, 1)).toISOString(),
  }
}

const timeFormatter = new Intl.DateTimeFormat(LOCALE, {
  timeZone: STUDIO_TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
})

const dayFormatter = new Intl.DateTimeFormat(LOCALE, {
  timeZone: STUDIO_TIME_ZONE,
  weekday: 'long',
  day: 'numeric',
  month: 'long',
})

const weekdayDayFormatter = new Intl.DateTimeFormat(LOCALE, {
  timeZone: STUDIO_TIME_ZONE,
  weekday: 'long',
  day: 'numeric',
})

export function isSameDate(a: CalendarDate, b: CalendarDate): boolean {
  return a.year === b.year && a.month === b.month && a.day === b.day
}

/** «09:30» */
export function formatTime(iso: IsoDateTime): string {
  return timeFormatter.format(new Date(iso))
}

/** «viernes 30» */
export function formatWeekdayDay(iso: IsoDateTime): string {
  return weekdayDayFormatter.format(new Date(iso))
}

/** «jueves, 29 de octubre» */
export function formatDay(iso: IsoDateTime): string {
  return dayFormatter.format(new Date(iso))
}
