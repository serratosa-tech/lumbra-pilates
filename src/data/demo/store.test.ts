import { describe, expect, it, vi } from 'vitest'
import { memoryStorage, session } from '../../test/fixtures.ts'
import type { StudioState } from '../types.ts'
import { clearState, loadState, saveState, SCHEMA_VERSION, STORAGE_KEY } from './store.ts'

const NOW = new Date('2026-10-29T10:00:00.000Z') // jueves; la semana empieza el lunes 26
const seeded: StudioState = { sessions: [session()], bookings: [] }
const seed = vi.fn(() => seeded)

const stored = (overrides: object = {}) =>
  JSON.stringify({ schemaVersion: SCHEMA_VERSION, seedWeek: '2026-10-26', sessions: [], bookings: [], ...overrides })

describe('persistencia de la demo', () => {
  it('siembra y guarda los datos de ejemplo si no hay nada', () => {
    const storage = memoryStorage()
    const { state, seedWeek } = loadState(storage, NOW, seed)
    expect(state).toBe(seeded)
    expect(seedWeek).toBe('2026-10-26')
    expect(JSON.parse(storage.getItem(STORAGE_KEY)!)).toMatchObject({ schemaVersion: SCHEMA_VERSION, seedWeek: '2026-10-26' })
  })

  it('recupera lo guardado si es de esta versión y de esta semana', () => {
    const storage = memoryStorage({ [STORAGE_KEY]: stored() })
    expect(loadState(storage, NOW, seed).state).toEqual({ sessions: [], bookings: [] })
  })

  it.each([
    ['JSON dañado', '{no es json'],
    ['otra versión', stored({ schemaVersion: SCHEMA_VERSION + 1 })],
    ['una semana anterior', stored({ seedWeek: '2026-10-19' })],
    ['forma incorrecta', JSON.stringify({ schemaVersion: SCHEMA_VERSION, seedWeek: '2026-10-26', sessions: 'x' })],
  ])('vuelve a sembrar con %s', (_, raw) => {
    const storage = memoryStorage({ [STORAGE_KEY]: raw })
    expect(loadState(storage, NOW, seed).state).toBe(seeded)
  })

  it('usa una sola clave y restablecer no toca las demás', () => {
    const storage = memoryStorage({ 'otra-app': 'intacta' })
    saveState(storage, { state: seeded, seedWeek: '2026-10-26' })
    expect(storage.length).toBe(2)
    clearState(storage)
    expect(storage.getItem(STORAGE_KEY)).toBeNull()
    expect(storage.getItem('otra-app')).toBe('intacta')
  })

  it('sigue funcionando si el almacenamiento falla', () => {
    const broken = memoryStorage()
    broken.setItem = () => {
      throw new Error('QuotaExceededError')
    }
    expect(() => loadState(broken, NOW, seed)).not.toThrow()
    expect(() => loadState(null, NOW, seed)).not.toThrow()
  })
})
