import { describe, expect, it } from 'vitest'
import { createDemoDataSource } from '../../../data/demo/demoDataSource.ts'
import { dayHeading, loadUpcoming } from './upcoming.ts'

// Plantilla de demo: el jueves hay clases a las 7:30, 9:30, 13:30, 18:00, 19:15 y 20:30;
// el viernes, a las 8:00, 10:00, 14:00 y 18:00; el domingo el estudio cierra.
const ds = createDemoDataSource({ now: () => new Date('2026-10-29T10:00:00.000Z') })
const times = (iso: string[]) => iso.map((s) => new Date(s).toISOString().slice(11, 16))

describe('loadUpcoming', () => {
  it('con 4 o más clases restantes hoy, muestra solo las 4 primeras de hoy', async () => {
    const days = await loadUpcoming(ds, new Date('2026-10-29T06:00:00.000Z')) // 7:00 en Madrid
    expect(days).toHaveLength(1)
    expect(days[0].relation).toBe('hoy')
    expect(days[0].sessions).toHaveLength(4)
  })

  it('si quedan menos de 4 hoy, completa con las primeras de mañana', async () => {
    const days = await loadUpcoming(ds, new Date('2026-10-29T18:00:00.000Z')) // 19:00 en Madrid
    expect(days.map((d) => [d.relation, d.sessions.length])).toEqual([
      ['hoy', 2],
      ['manana', 2],
    ])
    expect(times(days[1].sessions.map((s) => s.startsAt))).toEqual(['07:00', '09:00'])
    expect(dayHeading(days[0])).toBe('Hoy, jueves 29')
    expect(dayHeading(days[1])).toBe('Mañana, viernes 30')
  })

  it('si hoy no quedan clases, muestra las 4 primeras del siguiente día', async () => {
    const days = await loadUpcoming(ds, new Date('2026-10-29T21:00:00.000Z')) // 22:00 en Madrid
    expect(days).toHaveLength(1)
    expect(days[0].relation).toBe('manana')
    expect(days[0].sessions).toHaveLength(4)
  })

  it('el sábado por la tarde salta el domingo y titula con la fecha completa', async () => {
    const days = await loadUpcoming(ds, new Date('2026-10-31T15:00:00.000Z'))
    expect(days[0].relation).toBe('otro')
    expect(dayHeading(days[0])).toBe('Lunes 2 de noviembre')
  })

  it('sin clases en el horizonte devuelve una lista vacía', async () => {
    const empty = createDemoDataSource({ seed: () => ({ sessions: [], bookings: [] }) })
    expect(await loadUpcoming(empty, new Date('2026-10-29T10:00:00.000Z'))).toEqual([])
  })
})
