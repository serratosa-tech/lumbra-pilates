import type { IsoDateTime } from '../data/types.ts'

export interface CalendarEvent {
  uid: string
  title: string
  description: string
  location: string
  start: IsoDateTime
  durationMinutes: number
  /** Momento en que se genera el archivo. */
  stamp: Date
}

const MAX_LINE = 75

/** «20261104T173000Z» */
function icsDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

function escapeText(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')
}

/** Las líneas de más de 75 caracteres se parten y continúan con un espacio (RFC 5545). */
function fold(line: string): string {
  if (line.length <= MAX_LINE) return line
  const parts = [line.slice(0, MAX_LINE)]
  for (let i = MAX_LINE; i < line.length; i += MAX_LINE - 1) parts.push(` ${line.slice(i, i + MAX_LINE - 1)}`)
  return parts.join('\r\n')
}

/** Archivo .ics con un único evento, en UTC, que abren Google Calendar, Apple Calendar y Outlook. */
export function buildIcs(event: CalendarEvent): string {
  const start = new Date(event.start)
  const end = new Date(start.getTime() + event.durationMinutes * 60_000)
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Lumbra Pilates//Reservas//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${event.uid}`,
    `DTSTAMP:${icsDate(event.stamp)}`,
    `DTSTART:${icsDate(start)}`,
    `DTEND:${icsDate(end)}`,
    `SUMMARY:${escapeText(event.title)}`,
    `DESCRIPTION:${escapeText(event.description)}`,
    `LOCATION:${escapeText(event.location)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ]
  return `${lines.map(fold).join('\r\n')}\r\n`
}

/** Descarga un texto como archivo. */
export function downloadFile(filename: string, content: string, type: string): void {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
