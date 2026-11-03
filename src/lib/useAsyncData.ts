import { useCallback, useEffect, useEffectEvent, useState } from 'react'
import { getDataSource, type DataSource } from '../data/index.ts'

export type AsyncState<T> = { status: 'loading' } | { status: 'error'; error: unknown } | { status: 'ready'; data: T }

export interface AsyncDataOptions {
  /**
   * Vuelve a pedir los datos cada tantos milisegundos mientras la pestaña está visible,
   * y también al volver a ella o al recuperar la conexión.
   */
  refreshMs?: number
}

/** Cada cuánto se refrescan las plazas libres del horario público (el texto de la interfaz dice «cada minuto»). */
export const LIVE_REFRESH_MS = 60_000

/** Al volver a la pestaña llegan a la vez «focus» y «visibilitychange»: basta con un refresco. */
const MIN_GAP_MS = 2_000

/**
 * Carga datos de la capa de datos. Vuelve a cargar cuando cambia `key` (con estado de carga)
 * y cuando cambian los datos (sin parpadeo: se mantiene lo anterior hasta tener lo nuevo).
 * Si falla una recarga de lo que ya se veía, se siguen mostrando los datos anteriores.
 */
export function useAsyncData<T>(key: string, load: (ds: DataSource) => Promise<T>, options: AsyncDataOptions = {}) {
  const { refreshMs } = options
  const [result, setResult] = useState<{ key: string; state: AsyncState<T> } | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [version, setVersion] = useState(0)
  const runLoad = useEffectEvent(() => load(getDataSource()))

  useEffect(() => getDataSource().subscribe(() => setVersion((v) => v + 1)), [])

  useEffect(() => {
    if (!refreshMs) return
    let last = Date.now()
    const refresh = () => {
      if (document.visibilityState !== 'visible' || Date.now() - last < MIN_GAP_MS) return
      last = Date.now()
      setVersion((v) => v + 1)
    }
    const timer = window.setInterval(refresh, refreshMs)
    document.addEventListener('visibilitychange', refresh)
    window.addEventListener('focus', refresh)
    window.addEventListener('online', refresh)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', refresh)
      window.removeEventListener('focus', refresh)
      window.removeEventListener('online', refresh)
    }
  }, [refreshMs])

  useEffect(() => {
    let active = true
    runLoad().then(
      (data) => {
        if (active) setResult({ key, state: { status: 'ready', data } })
      },
      (error: unknown) => {
        if (!active) return
        setResult((previous) =>
          previous?.key === key && previous.state.status === 'ready' ? previous : { key, state: { status: 'error', error } },
        )
      },
    )
    return () => {
      active = false
    }
  }, [key, attempt, version])

  const retry = useCallback(() => {
    setResult(null)
    setAttempt((n) => n + 1)
  }, [])

  const state: AsyncState<T> = result?.key === key ? result.state : { status: 'loading' }
  return { state, retry }
}
