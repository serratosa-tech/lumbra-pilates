import { describe, expect, it } from 'vitest'
import { memoryStorage } from '../../test/fixtures.ts'
import { STORAGE_KEY } from '../storage.ts'
import { cleanLegacyStorage, hasStoredSession } from './storedSession.ts'

const SESSION = JSON.stringify({ access_token: 'a', refresh_token: 'r', user: { id: 'u1' } })
/** Lo que guardaba la demo en el navegador hasta la fase 3. */
const LEGACY = JSON.stringify({ schemaVersion: 1, seedWeek: '2026-10-26', sessions: [], bookings: [] })

describe('sesión guardada', () => {
  it('borra el estado antiguo de la demo y deja intacto todo lo demás', () => {
    const storage = memoryStorage({ [STORAGE_KEY]: LEGACY, 'otra-app': 'x' })
    cleanLegacyStorage(storage)
    expect(storage.getItem(STORAGE_KEY)).toBeNull()
    expect(storage.getItem('otra-app')).toBe('x')
  })

  it('borra también un valor dañado', () => {
    const storage = memoryStorage({ [STORAGE_KEY]: '{roto' })
    cleanLegacyStorage(storage)
    expect(storage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('conserva una sesión de supabase-js y la reconoce sin descargar nada', () => {
    const storage = memoryStorage({ [STORAGE_KEY]: SESSION })
    cleanLegacyStorage(storage)
    expect(storage.getItem(STORAGE_KEY)).toBe(SESSION)
    expect(hasStoredSession(storage)).toBe(true)
    expect(hasStoredSession(memoryStorage({ [STORAGE_KEY]: LEGACY }))).toBe(false)
  })

  it('no se rompe si el almacenamiento está bloqueado', () => {
    const blocked = {
      getItem() {
        throw new Error('SecurityError')
      },
    } as unknown as Storage
    expect(() => cleanLegacyStorage(blocked)).not.toThrow()
    expect(hasStoredSession(blocked)).toBe(false)
    expect(() => cleanLegacyStorage(null)).not.toThrow()
  })
})
