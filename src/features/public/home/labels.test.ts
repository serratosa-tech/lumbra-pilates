import { describe, expect, it } from 'vitest'
import type { ClassSession } from '../../../data/index.ts'
import { spotsStatus } from './labels.ts'

const base: ClassSession = {
  id: 'x',
  classTypeId: 'mat-flow',
  name: 'Mat Flow',
  instructor: 'Marta Ibáñez',
  startsAt: '2026-10-29T17:00:00.000Z',
  durationMinutes: 55,
  capacity: 12,
  bookedCount: 0,
}

describe('spotsStatus', () => {
  it('distingue plazas libres, últimas plazas y clase completa', () => {
    expect(spotsStatus({ ...base, bookedCount: 4 })).toMatchObject({ label: '8 plazas libres', tone: 'exito' })
    expect(spotsStatus({ ...base, bookedCount: 10 }).label).toBe('Últimas 2 plazas')
    expect(spotsStatus({ ...base, bookedCount: 11 }).label).toBe('Última plaza')
    expect(spotsStatus({ ...base, bookedCount: 12 })).toMatchObject({ full: true, tone: 'error' })
  })
})
