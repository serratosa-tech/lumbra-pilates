import { useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router'
import type { ClassSession } from '../../data/index.ts'
import {
  addDays,
  isSameDate,
  parseDateKey,
  startOfWeek,
  studioDate,
  toDateKey,
  weekRange,
  weeksBetween,
  type CalendarDate,
} from '../../lib/dates.ts'

/** El panel puede mirar varias semanas atrás (métricas) y programar con antelación. */
const WEEK_OFFSETS = { min: -4, max: 8 }

/** Semana del panel guardada en la URL (?semana=AAAA-MM-DD). */
export function useStudioWeek(now: Date) {
  const [params, setParams] = useSearchParams()
  const current = startOfWeek(studioDate(now))
  const requested = parseDateKey(params.get('semana'))
  const offset = requested ? weeksBetween(current, startOfWeek(requested)) : 0
  const safeOffset = offset >= WEEK_OFFSETS.min && offset <= WEEK_OFFSETS.max ? offset : 0
  const monday = addDays(current, safeOffset * 7)

  function setOffset(next: number) {
    const nextParams = new URLSearchParams(params)
    if (next === 0) nextParams.delete('semana')
    else nextParams.set('semana', toDateKey(addDays(current, next * 7)))
    setParams(nextParams, { preventScrollReset: true })
  }

  return {
    monday,
    range: weekRange(monday),
    weekKey: toDateKey(monday),
    isCurrent: safeOffset === 0,
    canGoBack: safeOffset > WEEK_OFFSETS.min,
    canGoForward: safeOffset < WEEK_OFFSETS.max,
    changeWeek: (delta: number) => setOffset(safeOffset + delta),
    goToCurrent: () => setOffset(0),
  }
}

/**
 * En móvil, al abrir la semana actual, lleva directamente a la sección del día de hoy
 * (la que contiene el encabezado `targetId`); los días anteriores quedan arriba.
 * Solo una vez por apertura, no en cada recarga de datos.
 */
export function useScrollToToday(targetId: string | null) {
  const done = useRef<string | null>(null)
  useEffect(() => {
    if (!targetId) {
      done.current = null
      return
    }
    if (done.current === targetId) return
    done.current = targetId
    const section = document.getElementById(targetId)?.closest('section')
    // Si hoy es el primer día con clases no hace falta moverse.
    if (!section?.previousElementSibling || !window.matchMedia('(max-width: 47.99rem)').matches) return
    section.scrollIntoView({ block: 'start', behavior: 'instant' })
  }, [targetId])
}

export interface DayGroup {
  date: CalendarDate
  sessions: ClassSession[]
}

/** Agrupa clases (ya ordenadas por hora) por día del estudio. */
export function groupByDay(sessions: ClassSession[]): DayGroup[] {
  const groups: DayGroup[] = []
  for (const session of sessions) {
    const date = studioDate(new Date(session.startsAt))
    const last = groups.at(-1)
    if (last && isSameDate(last.date, date)) last.sessions.push(session)
    else groups.push({ date, sessions: [session] })
  }
  return groups
}
