import type { IsoDateTime } from '../data/types.ts'
import { SEP } from './text.ts'

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

/** Intervalo [lunes, lunes siguiente) de la semana que empieza en `monday`, en ISO. */
export function weekRange(monday: CalendarDate): { from: IsoDateTime; to: IsoDateTime } {
  return {
    from: studioDateTime(monday).toISOString(),
    to: studioDateTime(addDays(monday, 7)).toISOString(),
  }
}

/** Hora y minuto (en hora del estudio) de un instante. */
export function studioTime(iso: IsoDateTime): { hour: number; minute: number } {
  const { hour, minute } = studioParts(new Date(iso))
  return { hour, minute }
}

const pad = (n: number) => String(n).padStart(2, '0')

/** «2026-11-02»: fecha para URLs y campos de formulario. */
export function toDateKey(date: CalendarDate): string {
  return `${date.year}-${pad(date.month)}-${pad(date.day)}`
}

/** Lee una fecha «AAAA-MM-DD»; devuelve null si no es una fecha real. */
export function parseDateKey(key: string | null | undefined): CalendarDate | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key ?? '')
  if (!match) return null
  const date = { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) }
  return toDateKey(addDays(date, 0)) === key ? date : null
}

/** «18:30» para un campo de hora. */
export function toTimeKey(iso: IsoDateTime): string {
  const { hour, minute } = studioTime(iso)
  return `${pad(hour)}:${pad(minute)}`
}

/** Semanas completas entre dos lunes (positivo si `b` es posterior). */
export function weeksBetween(a: CalendarDate, b: CalendarDate): number {
  const ms = Date.UTC(b.year, b.month - 1, b.day) - Date.UTC(a.year, a.month - 1, a.day)
  return Math.round(ms / (7 * 24 * 60 * 60 * 1000))
}

export function addMinutes(iso: IsoDateTime, minutes: number): IsoDateTime {
  return new Date(new Date(iso).getTime() + minutes * 60_000).toISOString()
}

const timeFormatter = new Intl.DateTimeFormat(LOCALE, {
  timeZone: STUDIO_TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
})

const dateFormatter = new Intl.DateTimeFormat(LOCALE, {
  timeZone: STUDIO_TIME_ZONE,
  weekday: 'long',
  day: 'numeric',
  month: 'long',
})

export function isSameDate(a: CalendarDate, b: CalendarDate): boolean {
  return a.year === b.year && a.month === b.month && a.day === b.day
}

/** «09:30» */
export function formatTime(iso: IsoDateTime): string {
  return timeFormatter.format(new Date(iso))
}

const middayOf = (date: CalendarDate) => studioDateTime(date, 12)

interface DateFormatOptions {
  /** Con el día de la semana (por defecto). */
  weekday?: boolean
  /** Con el mes (por defecto). */
  month?: boolean
}

/**
 * El formato de fecha de toda la app: «viernes 30 de octubre», sin coma tras el día de la semana.
 * Sin día de la semana, «30 de octubre»; sin mes, «viernes 30». Siempre en minúscula:
 * al principio de frase o en un encabezado se pasa por `capitalize`.
 */
export function formatDate(date: IsoDateTime | CalendarDate, { weekday = true, month = true }: DateFormatOptions = {}): string {
  const instant = typeof date === 'string' ? new Date(date) : middayOf(date)
  const parts = Object.fromEntries(dateFormatter.formatToParts(instant).map((p) => [p.type, p.value]))
  return [weekday && parts.weekday, month ? `${parts.day} de ${parts.month}` : parts.day].filter(Boolean).join(' ')
}

/** «jueves 29 de octubre · 18:30» */
export function formatDateTime(iso: IsoDateTime): string {
  return `${formatDate(iso)}${SEP}${formatTime(iso)}`
}

/** «18:30–19:20» */
export function formatTimeRange(iso: IsoDateTime, minutes: number): string {
  return `${formatTime(iso)}–${formatTime(addMinutes(iso, minutes))}`
}

/** «jueves 29 de octubre · 18:30–19:20» */
export function formatDateTimeRange(iso: IsoDateTime, minutes: number): string {
  return `${formatDate(iso)}${SEP}${formatTimeRange(iso, minutes)}`
}

const shortWeekdayFormatter = new Intl.DateTimeFormat(LOCALE, { timeZone: STUDIO_TIME_ZONE, weekday: 'short' })

/** «lun» */
export function formatShortWeekday(date: CalendarDate): string {
  return shortWeekdayFormatter.format(middayOf(date)).replace('.', '')
}

/** «2 al 7 de noviembre» o «30 de noviembre al 5 de diciembre» (de lunes a sábado). */
export function formatWeekRange(monday: CalendarDate): string {
  const saturday = addDays(monday, 5)
  const end = formatDate(saturday, { weekday: false })
  return monday.month === saturday.month ? `${monday.day} al ${end}` : `${formatDate(monday, { weekday: false })} al ${end}`
}
