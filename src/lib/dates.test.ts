import { describe, expect, it } from 'vitest'
import {
  addDays,
  dayRange,
  formatDate,
  formatDateTime,
  formatDateTimeRange,
  formatTime,
  formatWeekRange,
  startOfWeek,
  studioDate,
  studioDateTime,
} from './dates.ts'
import { SEP } from './text.ts'

describe('dates', () => {
  it('convierte hora del estudio a UTC respetando el horario de verano', () => {
    expect(studioDateTime({ year: 2026, month: 7, day: 15 }, 9, 30).toISOString()).toBe(
      '2026-07-15T07:30:00.000Z',
    )
    expect(studioDateTime({ year: 2026, month: 12, day: 15 }, 9, 30).toISOString()).toBe(
      '2026-12-15T08:30:00.000Z',
    )
  })

  it('calcula la fecha del estudio aunque en UTC aún sea el día anterior', () => {
    expect(studioDate(new Date('2026-10-28T23:30:00.000Z'))).toEqual({ year: 2026, month: 10, day: 29 })
  })

  it('el día del cambio de hora dura 25 horas', () => {
    const { from, to } = dayRange({ year: 2026, month: 10, day: 25 })
    expect(Date.parse(to) - Date.parse(from)).toBe(25 * 3600_000)
  })

  it('encuentra el lunes y suma días cruzando meses', () => {
    expect(startOfWeek({ year: 2026, month: 11, day: 1 })).toEqual({ year: 2026, month: 10, day: 26 })
    expect(addDays({ year: 2026, month: 10, day: 30 }, 3)).toEqual({ year: 2026, month: 11, day: 2 })
  })

  it('formatea en español de España, sin coma tras el día de la semana y en minúscula', () => {
    expect(formatTime('2026-10-29T17:00:00.000Z')).toBe('18:00')
    expect(formatDate('2026-10-29T17:00:00.000Z')).toBe('jueves 29 de octubre')
    expect(formatDate({ year: 2026, month: 10, day: 30 })).toBe('viernes 30 de octubre')
    expect(formatDate('2026-10-30T07:00:00.000Z', { month: false })).toBe('viernes 30')
    expect(formatDate({ year: 2026, month: 11, day: 2 }, { weekday: false })).toBe('2 de noviembre')
    expect(formatDateTime('2026-11-05T17:00:00.000Z')).toBe(`jueves 5 de noviembre${SEP}18:00`)
    expect(formatDateTimeRange('2026-11-05T17:00:00.000Z', 50)).toBe(`jueves 5 de noviembre${SEP}18:00–18:50`)
  })

  it('la fecha que cae a medianoche en UTC sigue siendo la del estudio', () => {
    expect(formatDate('2026-10-29T23:30:00.000Z')).toBe('viernes 30 de octubre')
  })

  it('escribe el rango de la semana de lunes a sábado', () => {
    expect(formatWeekRange({ year: 2026, month: 11, day: 2 })).toBe('2 al 7 de noviembre')
    expect(formatWeekRange({ year: 2026, month: 11, day: 30 })).toBe('30 de noviembre al 5 de diciembre')
  })
})
