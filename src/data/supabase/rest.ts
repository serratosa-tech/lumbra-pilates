import type { SupabaseConfig } from './config.ts'
import { toDataError } from './toDataError.ts'

const TIMEOUT_MS = 15_000

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

/**
 * Acceso directo a la API REST de Supabase con `fetch`, sin supabase-js: lo usa todo lo que puede
 * hacer un visitante (horario, catálogo, Mis reservas con código). Solo lleva la clave publishable;
 * nunca una cabecera Authorization.
 */
export function createRest(config: SupabaseConfig, fetchImpl: typeof fetch) {
  async function request<T>(path: string, init: { method: 'GET' | 'POST'; body?: string }): Promise<T> {
    let response: Response
    try {
      response = await fetchImpl(`${config.url}/rest/v1/${path}`, {
        method: init.method,
        body: init.body,
        headers: {
          apikey: config.key,
          Accept: 'application/json',
          ...(init.body === undefined ? {} : { 'Content-Type': 'application/json' }),
        },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      })
    } catch (error) {
      throw toDataError(error)
    }
    const body = await readJson(response)
    if (!response.ok) throw toDataError({ ...(typeof body === 'object' ? body : {}), status: response.status })
    return body as T
  }

  return {
    /** POST /rest/v1/rpc/<fn> */
    rpc: <T>(fn: string, args: Record<string, unknown> = {}) =>
      request<T>(`rpc/${fn}`, { method: 'POST', body: JSON.stringify(args) }),
    /** GET /rest/v1/<tabla>?<consulta>: solo tablas que la RLS deja leer a todos. */
    select: <T>(table: string, query: string) => request<T>(`${table}?${query}`, { method: 'GET' }),
  }
}
