import { describe, expect, it } from 'vitest'
import { CATALOG } from '../../../test/fixtures.ts'
import {
  fieldsOffTypeDefaults,
  newSessionForm,
  toSessionInput,
  validateSessionForm,
  withClassType,
  type SessionFormValues,
} from './sessionForm.ts'

const [MAT_FLOW, REFORMER] = CATALOG.classTypes

const NOW = new Date('2026-11-02T08:00:00.000Z')
const values: SessionFormValues = {
  classTypeId: 'mat-flow',
  instructorId: 'marta-ibanez',
  date: '2026-11-04',
  time: '18:30',
  durationMinutes: '55',
  capacity: '12',
}

describe('formulario de clase', () => {
  it('acepta una clase futura bien rellenada y la pasa a hora de Madrid', () => {
    expect(validateSessionForm(values, { booked: 0, now: NOW })).toEqual({})
    expect(toSessionInput(values)).toEqual({
      classTypeId: 'mat-flow',
      instructorId: 'marta-ibanez',
      startsAt: '2026-11-04T17:30:00.000Z',
      durationMinutes: 55,
      capacity: 12,
    })
  })

  it('rechaza el pasado, los rangos imposibles y los campos vacíos', () => {
    const errors = validateSessionForm(
      { ...values, classTypeId: '', date: '2026-11-02', time: '08:30', durationMinutes: '5', capacity: '1.5' },
      { booked: 0, now: NOW },
    )
    expect(Object.keys(errors).sort()).toEqual(['capacity', 'classTypeId', 'durationMinutes', 'time'])
    expect(errors.time).toBe('La clase tiene que empezar en el futuro.')
  })

  it('una clase nueva toma la duración y el aforo del tipo', () => {
    expect(newSessionForm(REFORMER, 'lucia-ferrer', { year: 2026, month: 11, day: 4 })).toMatchObject({
      classTypeId: 'reformer',
      durationMinutes: '50',
      capacity: '8',
    })
  })

  it('al cambiar el tipo, actualiza duración y aforo salvo los cambiados a mano', () => {
    const fresh = { ...values, durationMinutes: '55', capacity: '12' }
    expect(withClassType(fresh, REFORMER, new Set())).toMatchObject({ classTypeId: 'reformer', durationMinutes: '50', capacity: '8' })
    expect(withClassType({ ...fresh, capacity: '6' }, REFORMER, new Set(['capacity']))).toMatchObject({
      durationMinutes: '50',
      capacity: '6',
    })
    expect(withClassType({ ...fresh, durationMinutes: '60' }, REFORMER, new Set(['durationMinutes']))).toMatchObject({
      durationMinutes: '60',
      capacity: '8',
    })
  })

  it('al editar, cuenta como cambiado a mano lo que no coincide con el tipo', () => {
    expect(fieldsOffTypeDefaults({ ...values, durationMinutes: '55', capacity: '12' }, MAT_FLOW)).toEqual(new Set())
    expect(fieldsOffTypeDefaults({ ...values, durationMinutes: '55', capacity: '10' }, MAT_FLOW)).toEqual(new Set(['capacity']))
  })

  it('no deja bajar el aforo por debajo de las plazas reservadas', () => {
    expect(validateSessionForm({ ...values, capacity: '5' }, { booked: 6, now: NOW }).capacity).toBe(
      'Hay 6 plazas reservadas: el aforo no puede ser menor.',
    )
    expect(validateSessionForm({ ...values, capacity: '6' }, { booked: 6, now: NOW }).capacity).toBeUndefined()
  })
})
