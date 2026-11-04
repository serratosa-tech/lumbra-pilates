import { CalendarClock, RotateCcw } from 'lucide-react'
import { plural } from '../../../components/schedule/labels.ts'
import { Seo } from '../../../components/Seo.tsx'
import { Alert, Button, EmptyState } from '../../../components/ui/index.ts'
import { filterSessions } from '../../../data/index.ts'
import {
  addDays,
  formatWeekRange,
  isSameDate,
  studioDate,
  toDateKey,
  weekRange,
} from '../../../lib/dates.ts'
import { LIVE_REFRESH_MS, useAsyncData } from '../../../lib/useAsyncData.ts'
import { useNow } from '../../../lib/useNow.ts'
import { BookingDialog } from './booking/BookingDialog.tsx'
import { DayPicker } from './DayPicker.tsx'
import { ScheduleFilters } from './ScheduleFilters.tsx'
import { DayList, ScheduleSkeleton, WeekGrid, type ScheduleDay } from './ScheduleViews.tsx'
import { dayTabId, OPEN_WEEKDAYS, useScheduleParams } from './useScheduleParams.ts'
import { WeekNav } from './WeekNav.tsx'

const DAY_PANEL_ID = 'clases-del-dia'

export function SchedulePage() {
  const now = useNow()
  const params = useScheduleParams(now)
  const { monday, filters } = params

  const { state, retry } = useAsyncData(`horario:${toDateKey(monday)}`, async (ds) => {
    const { from, to } = weekRange(monday)
    const [sessions, classTypes, instructors] = await Promise.all([
      ds.listSessions(from, to),
      ds.listClassTypes(),
      ds.listInstructors(),
    ])
    return { sessions, classTypes, instructors }
  }, { refreshMs: LIVE_REFRESH_MS })

  const data = state.status === 'ready' ? state.data : undefined
  const today = studioDate(now)
  const days: ScheduleDay[] = OPEN_WEEKDAYS.map((weekday) => {
    const date = addDays(monday, weekday - 1)
    const all = data?.sessions.filter((s) => isSameDate(studioDate(new Date(s.startsAt)), date)) ?? []
    return { weekday, date, isToday: isSameDate(date, today), sessions: filterSessions(all, filters), total: all.length }
  })
  const visibleCount = days.reduce((sum, d) => sum + d.sessions.length, 0)
  const selectedDay = days.find((d) => d.weekday === params.day) ?? days[0]

  return (
    <div className="container-page py-8 sm:py-12 lg:py-14">
      <Seo
        title="Horario de clases y reservas"
        description="Horario semanal de Lumbra Pilates en Valencia: reformer, mat y movilidad en grupos reducidos. Mira las plazas libres, que se actualizan solas cada minuto, y reserva sin crear cuenta."
      />

      <header className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div className="max-w-2xl">
          <p className="text-xs font-medium tracking-widest text-terracota-700 uppercase">Horario semanal</p>
          <h1 className="mt-3 text-3xl">Reserva tu clase</h1>
          <p className="mt-3 text-lg text-tinta-800" aria-live="polite">
            Semana del {formatWeekRange(monday)}
          </p>
        </div>
        <WeekNav
          canGoBack={params.canGoBack}
          canGoForward={params.canGoForward}
          isDefaultWeek={params.isDefaultWeek}
          onChange={params.changeWeek}
          onToday={params.goToDefaultWeek}
        />
      </header>

      <div className="mt-6 border-y border-arena-200 py-4 sm:py-5">
        <ScheduleFilters
          filters={filters}
          activeCount={params.activeFilters}
          classTypes={data?.classTypes ?? []}
          instructors={data?.instructors ?? []}
          resultCount={visibleCount}
          onChange={params.setFilter}
          onClear={params.clearFilters}
        />
      </div>

      <p className="mt-4 text-sm text-piedra" aria-live="polite">
        {data &&
          data.sessions.length > 0 &&
          `${plural(visibleCount, 'clase')} esta semana${params.activeFilters > 0 ? ' con los filtros elegidos' : ''}. Plazas actualizadas cada minuto.`}
      </p>

      {state.status === 'loading' && <ScheduleSkeleton />}

      {state.status === 'error' && (
        <Alert
          tone="error"
          title="No hemos podido cargar el horario"
          className="mt-6"
          action={
            <Button variant="secondary" onClick={retry} icon={<RotateCcw aria-hidden="true" strokeWidth={1.75} className="size-4" />}>
              Reintentar
            </Button>
          }
        >
          Comprueba tu conexión y vuelve a intentarlo.
        </Alert>
      )}

      {data && data.sessions.length === 0 && (
        <EmptyState
          icon={CalendarClock}
          headingLevel="h2"
          title="Aún no hemos publicado este horario"
          className="mt-6"
          action={
            <Button variant="secondary" onClick={params.goToDefaultWeek}>
              Volver a esta semana
            </Button>
          }
        >
          Publicamos las clases con unas semanas de antelación. Mientras tanto, tienes plazas en las semanas
          anteriores.
        </EmptyState>
      )}

      {data && data.sessions.length > 0 && (
        <>
          <div className="mt-4 @container lg:hidden">
            <DayPicker days={days} selected={selectedDay.weekday} onSelect={params.selectDay} panelId={DAY_PANEL_ID} />
            <DayList
              day={selectedDay}
              now={now}
              onOpen={params.openClass}
              onClearFilters={params.clearFilters}
              panelId={DAY_PANEL_ID}
              labelledBy={dayTabId(selectedDay.weekday)}
            />
          </div>
          <div className="mt-4 hidden lg:block">
            <WeekGrid days={days} now={now} onOpen={params.openClass} onClearFilters={params.clearFilters} />
          </div>
        </>
      )}

      {params.classId && <BookingDialog key={params.classId} classId={params.classId} now={now} onClose={params.closeClass} />}
    </div>
  )
}
