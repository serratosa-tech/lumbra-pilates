import { DataError, isDataErrorCode } from '../errors.ts'

/** Sesión caducada o inválida (PostgREST) y permiso denegado (Postgres). */
const UNAUTHORIZED_CODES = new Set(['PGRST301', 'PGRST302', 'PGRST303', '42501'])
/**
 * PostgREST sin base de datos: no conecta, error de conexión, caché del esquema o tiempo agotado.
 * supabase-js no pasa el estado HTTP, así que estos fallos solo se reconocen por el código.
 */
const UNAVAILABLE_CODES = new Set(['PGRST000', 'PGRST001', 'PGRST002', 'PGRST003'])
const NETWORK_NAMES = new Set(['TypeError', 'TimeoutError', 'AbortError', 'AuthRetryableFetchError'])
/** Así describen los navegadores un fallo de red cuando supabase-js lo convierte en texto. */
const NETWORK_MESSAGE = /failed to fetch|networkerror|load failed|network request failed|fetch failed/i

interface ErrorLike {
  name?: unknown
  code?: unknown
  message?: unknown
  status?: unknown
}

/**
 * Traduce cualquier error de Supabase (PostgREST, Auth o la red) a un `DataError` con código estable.
 * Las funciones de Postgres lanzan `raise exception '<código>'`: el mensaje ya es el código.
 */
export function toDataError(error: unknown): Error {
  if (error instanceof DataError) return error
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return new DataError('network')
  if (typeof error !== 'object' || error === null) return new Error(String(error))

  const { name, code, message, status } = error as ErrorLike
  if ((typeof name === 'string' && NETWORK_NAMES.has(name)) || (typeof message === 'string' && NETWORK_MESSAGE.test(message))) {
    return new DataError('network')
  }
  if (isDataErrorCode(code)) return new DataError(code)
  if (isDataErrorCode(message)) return new DataError(message)
  if (status === 429 || code === 'over_request_rate_limit') return new DataError('too_many_attempts')
  if ((typeof code === 'string' && UNAUTHORIZED_CODES.has(code)) || name === 'AuthSessionMissingError' || status === 401) {
    return new DataError('unauthorized')
  }
  // Un id con formato imposible (no es un uuid).
  if (code === '22P02') return new DataError('invalid_input')
  if ((typeof code === 'string' && UNAVAILABLE_CODES.has(code)) || (typeof status === 'number' && status >= 500)) {
    return new DataError('unavailable')
  }
  return error instanceof Error ? error : new Error(typeof message === 'string' ? message : 'Error desconocido')
}
