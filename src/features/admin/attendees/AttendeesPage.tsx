import { CalendarX2, ChevronRight, RotateCcw } from 'lucide-react'
import { Link, useSearchParams } from 'react-router'
import { spotsStatus } from '../../../components/schedule/labels.ts'
import { Seo } from '../../../components/Seo.tsx'
import { Alert, Badge, Button, EmptyState, Skeleton } from '../../../components/ui/index.ts'
import { formatDayMonth, formatLongWeekday, formatTime, isSameDate, studioDate } from '../../../lib/dates.ts'
import { useAsyncData } from '../../../lib/useAsyncData.ts'
import { useNow } from '../../../lib/useNow.ts'
import { PanelHeader } from '../PanelHeader.tsx'
import { groupByDay, useStudioWeek } from '../useStudioWeek.ts'
import { RosterView } from './RosterView.tsx'

/** Lista de clases de la semana para elegir de cuál ver los asistentes. */
function SessionPicker({ now }: { now: Date }) {
  const week = useStudioWeek(now)
  const today = studioDate(now)
  const { state, retry } = useAsyncData(`asistentes-semana:${week.weekKey}`, (ds) =>
    ds.listSessions(week.range.from, week.range.to),
  )

  return (
    <>
      <PanelHeader title="Asistentes" week={week} />
      <p className="mt-2 text-tinta-700">Elige una clase para ver sus reservas, la lista de espera y marcar la asistencia.</p>
      <div className="mt-6">
        {state.status === 'loading' && (
          <div role="status" className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <span className="sr-only">Cargando las clases…</span>
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-48 w-full" />
            ))}
          </div>
        )}
        {state.status === 'error' && (
          <Alert
            tone="error"
            title="No hemos podido cargar las clases"
            action={
              <Button variant="secondary" onClick={retry} icon={<RotateCcw aria-hidden="true" strokeWidth={1.75} className="size-4" />}>
                Reintentar
              </Button>
            }
          >
            Vuelve a intentarlo en un momento.
          </Alert>
        )}
        {state.status === 'ready' && state.data.length === 0 && (
          <EmptyState icon={CalendarX2} headingLevel="h2" title="No hay clases esta semana">
            Cambia de semana o programa clases desde «Clases».
          </EmptyState>
        )}
        {state.status === 'ready' && state.data.length > 0 && (
          <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
            {groupByDay(state.data).map((day) => (
              <section
                key={day.date.day}
                aria-labelledby={`asist-${day.date.day}`}
                className="rounded-lg border border-arena-200 bg-white px-4 shadow-sm"
              >
                <h2
                  id={`asist-${day.date.day}`}
                  className="flex items-center gap-2 border-b border-arena-200 py-3 font-sans text-base font-semibold tracking-normal"
                >
                  {formatLongWeekday(day.date)}, {formatDayMonth(day.date)}
                  {isSameDate(day.date, today) && <Badge tone="terracota">Hoy</Badge>}
                </h2>
                <ul className="divide-y divide-arena-200">
                  {day.sessions.map((session) => {
                    const status = spotsStatus(session, now)
                    return (
                      <li key={session.id}>
                        <Link
                          to={`/estudio/asistentes?clase=${session.id}`}
                          className="-mx-2 flex min-h-12 items-center gap-3 rounded-sm px-2 py-2 hover:bg-arena-100"
                        >
                          <span className="w-[5ch] shrink-0 font-display text-lg tabular-nums">{formatTime(session.startsAt)}</span>
                          <span className="min-w-0 flex-1">
                            <span className="block font-semibold">{session.name}</span>
                            <span className="block text-sm text-piedra">
                              {status.state === 'cancelled'
                                ? 'Cancelada'
                                : `${session.bookedCount}/${session.capacity} plazas${session.waitlistCount ? ` · ${session.waitlistCount} en espera` : ''}`}
                            </span>
                          </span>
                          <ChevronRight aria-hidden="true" strokeWidth={1.75} className="size-5 shrink-0 text-piedra" />
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

export function AttendeesPage() {
  const now = useNow()
  const classId = useSearchParams()[0].get('clase')

  return (
    <div className="container-page py-8 sm:py-12">
      <Seo title="Asistentes · Panel del estudio" description="Reservas, lista de espera y asistencia por clase." noindex />
      {classId ? <RosterView key={classId} sessionId={classId} now={now} /> : <SessionPicker now={now} />}
    </div>
  )
}
