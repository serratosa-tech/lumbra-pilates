import { describe, expect, it } from 'vitest'
import { buildIcs } from './ics.ts'

const ics = buildIcs({
  uid: 'LUM-7K3Q@lumbra-pilates.pages.dev',
  title: 'Mat Flow · Lumbra Pilates',
  description: 'Código de reserva: LUM-7K3Q\nCancela hasta 2 h antes, en Mis reservas; gracias.',
  location: 'Plaza del Umbral 7, bajo, 46003 Valencia',
  start: '2026-11-04T17:30:00.000Z',
  durationMinutes: 55,
  stamp: new Date('2026-11-01T09:15:30.123Z'),
})
const lines = ics.split('\r\n')

describe('archivo de calendario', () => {
  it('tiene un evento con fechas en UTC', () => {
    expect(lines[0]).toBe('BEGIN:VCALENDAR')
    expect(lines).toContain('DTSTART:20261104T173000Z')
    expect(lines).toContain('DTEND:20261104T182500Z')
    expect(lines).toContain('DTSTAMP:20261101T091530Z')
    expect(lines).toContain('UID:LUM-7K3Q@lumbra-pilates.pages.dev')
  })

  it('usa saltos CRLF y termina en uno', () => {
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true)
    expect(ics.replace(/\r\n/g, '')).not.toMatch(/[\r\n]/)
  })

  it('escapa comas, punto y coma y saltos de línea', () => {
    expect(lines).toContain('LOCATION:Plaza del Umbral 7\\, bajo\\, 46003 Valencia')
    const unfolded = ics.replace(/\r\n /g, '')
    expect(unfolded).toContain('DESCRIPTION:Código de reserva: LUM-7K3Q\\nCancela hasta 2 h antes\\, en Mis reservas\\; gracias.')
  })

  it('parte las líneas largas', () => {
    expect(lines.every((line) => line.length <= 75)).toBe(true)
  })
})
