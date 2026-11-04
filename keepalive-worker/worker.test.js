import { afterEach, describe, expect, it, vi } from 'vitest'
import worker from './worker.js'

const env = { SUPABASE_URL: 'https://proyecto.supabase.co/', SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_prueba' }

function respond(status, body) {
  const fetchMock = vi.fn(async () => new Response(body, { status }))
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('Worker de aviso a Supabase', () => {
  it('llama a health_check con la clave publishable y sin Authorization', async () => {
    const fetchMock = respond(200, '{"ok":true,"checked_at":"2026-11-04T07:17:00Z"}')
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})
    await worker.scheduled({}, env)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://proyecto.supabase.co/rest/v1/rpc/health_check')
    expect(init.method).toBe('POST')
    expect(init.headers).toEqual({ apikey: 'sb_publishable_prueba', 'Content-Type': 'application/json' })
    expect(init.body).toBe('{}')
    expect(log).toHaveBeenCalledWith('health_check ok (2026-11-04T07:17:00Z)')
  })

  it('falla si la respuesta no es ok', async () => {
    respond(200, '{"ok":false}')
    await expect(worker.scheduled({}, env)).rejects.toThrow('no ha respondido ok')
    respond(200, 'null')
    await expect(worker.scheduled({}, env)).rejects.toThrow('no ha respondido ok')
    respond(200, '<html>')
    await expect(worker.scheduled({}, env)).rejects.toThrow('no ha devuelto JSON')
  })

  it('falla con un error HTTP', async () => {
    respond(401, '{"message":"Invalid API key"}')
    await expect(worker.scheduled({}, env)).rejects.toThrow('respondido 401')
  })

  it('falla si faltan las variables, sin llamar a nadie', async () => {
    const fetchMock = respond(200, '{"ok":true}')
    await expect(worker.scheduled({}, { SUPABASE_URL: env.SUPABASE_URL })).rejects.toThrow('Faltan las variables')
    await expect(worker.scheduled({}, { SUPABASE_PUBLISHABLE_KEY: 'x' })).rejects.toThrow('Faltan las variables')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('no se puede lanzar desde fuera', () => {
    expect(worker.fetch().status).toBe(404)
  })
})
