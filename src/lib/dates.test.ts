import { describe, expect, it } from 'vitest'
import {
  addDays,
  dayRange,
  formatDay,
  formatTime,
  formatWeekdayDay,
  startOfWeek,
  studioDate,
  studioDateTime,
} from './dates.ts'

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

  it('formatea en español de España', () => {
    expect(formatTime('2026-10-29T17:00:00.000Z')).toBe('18:00')
    expect(formatDay('2026-10-29T17:00:00.000Z')).toBe('jueves, 29 de octubre')
    expect(formatWeekdayDay('2026-10-30T07:00:00.000Z')).toBe('viernes 30')
  })
})
