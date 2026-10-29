import { useLocation, useNavigate, useSearchParams } from 'react-router'
import type { ClassLevel, ClassSession, SessionFilters } from '../../../data/index.ts'
import {
  addDays,
  isoWeekday,
  isSameDate,
  parseDateKey,
  startOfWeek,
  studioDate,
  toDateKey,
  weeksBetween,
  type CalendarDate,
} from '../../../lib/dates.ts'

/** Semanas visibles respecto a la actual: la pasada y hasta tres por delante. */
export const WEEK_OFFSETS = { min: -1, max: 3 }
/** Días con clase: de lunes (1) a sábado (6). */
export const OPEN_WEEKDAYS = [1, 2, 3, 4, 5, 6]
export const FILTER_LEVELS: ClassLevel[] = ['iniciacion', 'intermedio', 'avanzado']

/** Id de la pestaña de un día en el selector móvil. */
export const dayTabId = (weekday: number) => `dia-${weekday}`

const PARAM = { week: 'semana', day: 'dia', type: 'tipo', instructor: 'instructora', level: 'nivel', session: 'clase' }

/** Enlace a /clases con la clase abierta, para la portada y otros sitios. */
export function scheduleLink(session: Pick<ClassSession, 'id' | 'startsAt'>): string {
  const date = studioDate(new Date(session.startsAt))
  const params = new URLSearchParams({
    [PARAM.week]: toDateKey(startOfWeek(date)),
    [PARAM.day]: String(isoWeekday(date)),
    [PARAM.session]: session.id,
  })
  return `/clases?${params}`
}

/** Semana que se enseña por defecto: la actual o, en domingo (el estudio cierra), la siguiente. */
function defaultWeek(today: CalendarDate): CalendarDate {
  const monday = startOfWeek(today)
  return isoWeekday(today) === 7 ? addDays(monday, 7) : monday
}

/** Semana, día, filtros y clase abierta de /clases, guardados en la URL. */
export function useScheduleParams(now: Date) {
  const [params, setParams] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()

  const today = studioDate(now)
  const currentMonday = startOfWeek(today)
  const fallback = defaultWeek(today)
  const requested = parseDateKey(params.get(PARAM.week))
  const requestedOffset = requested ? weeksBetween(currentMonday, startOfWeek(requested)) : null
  const offset =
    requestedOffset !== null && requestedOffset >= WEEK_OFFSETS.min && requestedOffset <= WEEK_OFFSETS.max
      ? requestedOffset
      : weeksBetween(currentMonday, fallback)
  const monday = addDays(currentMonday, offset * 7)

  const dayParam = Number(params.get(PARAM.day))
  const todayInWeek = isSameDate(startOfWeek(today), monday) && isoWeekday(today) <= 6
  const day = OPEN_WEEKDAYS.includes(dayParam) ? dayParam : todayInWeek ? isoWeekday(today) : 1

  const level = params.get(PARAM.level) as ClassLevel | null
  const filters: SessionFilters = {
    classTypeId: params.get(PARAM.type) ?? undefined,
    instructorId: params.get(PARAM.instructor) ?? undefined,
    level: level && FILTER_LEVELS.includes(level) ? level : undefined,
  }
  const activeFilters = Object.values(filters).filter(Boolean).length

  function update(changes: Record<string, string | null>, options: { push?: boolean; state?: unknown } = {}) {
    const next = new URLSearchParams(params)
    for (const [key, value] of Object.entries(changes)) {
      if (value === null) next.delete(key)
      else next.set(key, value)
    }
    setParams(next, { replace: !options.push, preventScrollReset: true, state: options.state })
  }

  return {
    monday,
    day,
    filters,
    activeFilters,
    classId: params.get(PARAM.session),
    canGoBack: offset > WEEK_OFFSETS.min,
    canGoForward: offset < WEEK_OFFSETS.max,
    isDefaultWeek: isSameDate(monday, fallback),
    changeWeek: (delta: number) =>
      update({ [PARAM.week]: toDateKey(addDays(monday, delta * 7)), [PARAM.day]: null }, { push: true }),
    goToDefaultWeek: () => update({ [PARAM.week]: null, [PARAM.day]: null }, { push: true }),
    selectDay: (weekday: number) => update({ [PARAM.day]: String(weekday) }),
    setFilter: (name: keyof SessionFilters, value: string) =>
      update({
        [name === 'classTypeId' ? PARAM.type : name === 'instructorId' ? PARAM.instructor : PARAM.level]: value || null,
      }),
    clearFilters: () => update({ [PARAM.type]: null, [PARAM.instructor]: null, [PARAM.level]: null }),
    openClass: (id: string) => update({ [PARAM.session]: id }, { push: true, state: { openedFromSchedule: true } }),
    closeClass: () => {
      // Si se abrió desde el horario, «Atrás» deja la URL como estaba; si se llegó con un enlace, se quita el parámetro.
      if ((location.state as { openedFromSchedule?: boolean } | null)?.openedFromSchedule) navigate(-1)
      else update({ [PARAM.session]: null })
    },
  }
}

export type ScheduleParams = ReturnType<typeof useScheduleParams>
