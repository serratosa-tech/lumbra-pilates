import { useCallback, useEffect, useEffectEvent, useState } from 'react'
import { getDataSource, type DataSource } from '../data/index.ts'

export type AsyncState<T> = { status: 'loading' } | { status: 'error'; error: unknown } | { status: 'ready'; data: T }

/**
 * Carga datos de la capa de datos. Vuelve a cargar cuando cambia `key` (con estado de carga)
 * y cuando cambian los datos (sin parpadeo: se mantiene lo anterior hasta tener lo nuevo).
 */
export function useAsyncData<T>(key: string, load: (ds: DataSource) => Promise<T>) {
  const [result, setResult] = useState<{ key: string; state: AsyncState<T> } | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [version, setVersion] = useState(0)
  const runLoad = useEffectEvent(() => load(getDataSource()))

  useEffect(() => getDataSource().subscribe(() => setVersion((v) => v + 1)), [])

  useEffect(() => {
    let active = true
    runLoad().then(
      (data) => {
        if (active) setResult({ key, state: { status: 'ready', data } })
      },
      (error: unknown) => {
        if (active) setResult({ key, state: { status: 'error', error } })
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
