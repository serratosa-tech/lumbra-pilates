import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAsyncData } from './useAsyncData.ts'

function setVisibility(state: DocumentVisibilityState) {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state })
}

describe('useAsyncData con refreshMs', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    setVisibility('visible')
  })
  afterEach(() => {
    vi.useRealTimers()
    setVisibility('visible')
  })

  it('vuelve a pedir cada intervalo solo con la pestaña visible, y al volver a ella', async () => {
    const load = vi.fn(async () => 'datos')
    renderHook(() => useAsyncData('prueba', load, { refreshMs: 60_000 }))
    await act(async () => {})
    expect(load).toHaveBeenCalledTimes(1)

    await act(async () => vi.advanceTimersByTime(60_000))
    expect(load).toHaveBeenCalledTimes(2)

    setVisibility('hidden')
    await act(async () => vi.advanceTimersByTime(120_000))
    expect(load).toHaveBeenCalledTimes(2)

    setVisibility('visible')
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
      window.dispatchEvent(new Event('focus'))
    })
    expect(load).toHaveBeenCalledTimes(3)
  })

  it('si falla un refresco, conserva los datos que ya se veían', async () => {
    const load = vi.fn<() => Promise<string>>().mockResolvedValueOnce('datos').mockRejectedValue(new Error('red'))
    const { result } = renderHook(() => useAsyncData('prueba', load, { refreshMs: 60_000 }))
    await act(async () => {})
    await act(async () => vi.advanceTimersByTime(60_000))
    expect(load).toHaveBeenCalledTimes(2)
    expect(result.current.state).toEqual({ status: 'ready', data: 'datos' })
  })
})
