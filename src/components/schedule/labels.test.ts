import { describe, expect, it } from 'vitest'
import type { ClassSession } from '../../data/index.ts'
import { plural, spotsStatus } from './labels.ts'

const NOW = new Date('2026-10-29T10:00:00.000Z')
const base: ClassSession = {
  id: 'x',
  classTypeId: 'mat-flow',
  instructorId: 'marta-ibanez',
  name: 'Mat Flow',
  instructor: 'Marta Ibáñez',
  level: 'todos',
  startsAt: '2026-10-29T17:00:00.000Z',
  durationMinutes: 55,
  capacity: 12,
  bookedCount: 0,
  waitlistCount: 0,
  status: 'scheduled',
}

describe('spotsStatus', () => {
  it('distingue plazas libres, últimas plazas y clase completa', () => {
    expect(spotsStatus({ ...base, bookedCount: 4 }, NOW)).toMatchObject({ label: '8 plazas libres', tone: 'exito' })
    expect(spotsStatus({ ...base, bookedCount: 10 }, NOW).label).toBe('Últimas 2 plazas')
    expect(spotsStatus({ ...base, bookedCount: 11 }, NOW).label).toBe('Última plaza')
    expect(spotsStatus({ ...base, bookedCount: 12 }, NOW)).toMatchObject({ state: 'full', tone: 'error' })
  })

  it('marca las clases pasadas y las canceladas', () => {
    expect(spotsStatus(base, new Date('2026-10-29T18:00:00.000Z')).label).toBe('Finalizada')
    expect(spotsStatus({ ...base, status: 'cancelled' }, NOW).label).toBe('Cancelada')
  })
})

describe('plural', () => {
  it('concuerda con la cantidad', () => {
    expect(plural(1, 'plaza')).toBe('1 plaza')
    expect(plural(3, 'plaza')).toBe('3 plazas')
    expect(plural(2, 'clase completa', 'clases completas')).toBe('2 clases completas')
  })
})
