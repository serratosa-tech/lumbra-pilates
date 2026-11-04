import { afterEach, describe, expect, it, vi } from 'vitest'
import { DataError } from '../errors.ts'
import { toDataError } from './toDataError.ts'

const codeOf = (error: unknown) => {
  const result = toDataError(error)
  return result instanceof DataError ? result.code : `sin código: ${result.message}`
}

describe('traducción de los errores de Supabase', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('el código de una función de Postgres llega tal cual, en el código o en el mensaje', () => {
    expect(codeOf({ code: 'P0001', message: 'capacity_below_booked' })).toBe('capacity_below_booked')
    expect(codeOf({ code: 'not_found' })).toBe('not_found')
  })

  it.each([
    ['TypeError de fetch', new TypeError('Failed to fetch')],
    ['tiempo agotado', { name: 'TimeoutError', message: 'signal timed out' }],
    ['reintento de Auth', { name: 'AuthRetryableFetchError', message: 'Failed to fetch', status: 0 }],
    ['texto de Safari', { message: 'Load failed' }],
  ])('sin red (%s) es network', (_label, error) => {
    expect(codeOf(error)).toBe('network')
  })

  it('con el navegador sin conexión, cualquier fallo es network', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    expect(codeOf({ status: 500, message: 'Internal Server Error' })).toBe('network')
  })

  it('el límite de Supabase Auth es too_many_attempts', () => {
    expect(codeOf({ name: 'AuthApiError', code: 'over_request_rate_limit', status: 429 })).toBe('too_many_attempts')
    expect(codeOf({ status: 429 })).toBe('too_many_attempts')
  })

  it.each([
    ['token caducado', { code: 'PGRST303', status: 401 }],
    ['permiso denegado', { code: '42501', message: 'permission denied for function get_roster' }],
    ['sin sesión en Auth', { name: 'AuthSessionMissingError', message: 'Auth session missing!' }],
    ['401 sin código', { status: 401 }],
  ])('%s es unauthorized', (_label, error) => {
    expect(codeOf(error)).toBe('unauthorized')
  })

  it('un rango de horario demasiado largo (400 de list_sessions) es invalid_input', () => {
    expect(codeOf({ code: 'P0001', message: 'invalid_input', status: 400 })).toBe('invalid_input')
  })

  it('un id que no es un uuid es invalid_input', () => {
    expect(codeOf({ code: '22P02', message: 'invalid input syntax for type uuid' })).toBe('invalid_input')
  })

  it('un fallo del servidor es unavailable', () => {
    expect(codeOf({ code: 'PGRST002', status: 503 })).toBe('unavailable')
    expect(codeOf({ status: 500 })).toBe('unavailable')
  })

  it('un DataError pasa sin cambios y lo desconocido no se inventa un código', () => {
    const original = new DataError('duplicate')
    expect(toDataError(original)).toBe(original)
    expect(codeOf({ code: 'XX000', message: 'algo raro', status: 400 })).toBe('sin código: algo raro')
  })
})
