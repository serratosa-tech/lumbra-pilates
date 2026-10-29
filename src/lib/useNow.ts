import { useEffect, useState } from 'react'

/** Hora actual, que se refresca cada minuto para que las clases pasen a «finalizada» sin recargar. */
export function useNow(intervalMs = 60_000): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), intervalMs)
    return () => window.clearInterval(timer)
  }, [intervalMs])
  return now
}
