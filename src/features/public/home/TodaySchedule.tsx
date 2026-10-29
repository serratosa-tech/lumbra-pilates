import { CalendarX2, Clock, RotateCcw, UserRound } from 'lucide-react'
import { useId } from 'react'
import { Alert, Badge, Button, ButtonLink, EmptyState, Skeleton } from '../../../components/ui/index.ts'
import type { ClassSession } from '../../../data/index.ts'
import { cn } from '../../../lib/cn.ts'
import { formatTime } from '../../../lib/dates.ts'
import { spotsStatus } from './labels.ts'
import { SectionHeading } from './SectionHeading.tsx'
import { dayHeading, UPCOMING_LIMIT, type UpcomingDay } from './upcoming.ts'
import type { HomeState } from './useHomeData.ts'

function SessionRow({ session }: { session: ClassSession }) {
  const spots = spotsStatus(session)
  const occupancy = Math.min(100, Math.round((session.bookedCount / session.capacity) * 100))
  const time = formatTime(session.startsAt)

  return (
    <li className="grid grid-cols-1 items-center gap-x-5 gap-y-3 border-b border-arena-200 py-5 last:border-b-0 min-[20rem]:grid-cols-[auto_minmax(0,1fr)] sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:px-2">
      <p className="font-display text-2xl leading-none whitespace-nowrap sm:min-w-24 sm:text-3xl">
        <time dateTime={session.startsAt}>{time}</time>
      </p>
      <div className="min-w-0">
        <h4 className="font-sans text-lg font-semibold tracking-normal">{session.name}</h4>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-piedra">
          <span className="inline-flex items-center gap-1.5">
            <UserRound aria-hidden="true" strokeWidth={1.75} className="size-4" />
            {session.instructor}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock aria-hidden="true" strokeWidth={1.75} className="size-4" />
            {session.durationMinutes} min
          </span>
        </p>
        <div className="mt-2.5 flex flex-wrap items-center gap-3">
          <Badge tone={spots.tone}>{spots.label}</Badge>
          <span aria-hidden="true" className="h-1.5 w-20 overflow-hidden rounded-full bg-arena-200">
            <span
              className={cn('block h-full rounded-full', spots.full ? 'bg-error' : 'bg-terracota-500')}
              style={{ width: `${occupancy}%` }}
            />
          </span>
        </div>
      </div>
      <ButtonLink
        to="/clases"
        variant={spots.full ? 'ghost' : 'secondary'}
        className="min-[20rem]:col-span-2 sm:col-span-1"
        aria-label={`${spots.full ? 'Apuntarme a la lista de espera de' : 'Reservar'} ${session.name}, ${time}`}
      >
        {spots.full ? 'Apuntarme a la lista' : 'Reservar'}
      </ButtonLink>
    </li>
  )
}

function DayGroup({ day }: { day: UpcomingDay }) {
  const headingId = useId()
  return (
    <div className="border-b border-arena-200 last:border-b-0">
      <h3
        id={headingId}
        className="border-b border-arena-200 pt-5 pb-3 font-sans text-sm font-semibold tracking-normal text-piedra sm:px-2"
      >
        {dayHeading(day)}
      </h3>
      <ul aria-labelledby={headingId}>
        {day.sessions.map((session) => (
          <SessionRow key={session.id} session={session} />
        ))}
      </ul>
    </div>
  )
}

function LoadingList() {
  return (
    <div role="status" className="divide-y divide-arena-200">
      <span className="sr-only">Cargando el horario…</span>
      {Array.from({ length: UPCOMING_LIMIT }, (_, i) => (
        <div key={i} className="flex items-center gap-5 py-5 sm:px-2">
          <Skeleton className="h-8 w-16" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-5 w-40 max-w-full" />
            <Skeleton className="h-4 w-56 max-w-full" />
          </div>
        </div>
      ))}
    </div>
  )
}

function subtitleFor(days: UpcomingDay[] | undefined): string {
  if (!days || days.length === 0) return 'Las próximas clases, con las plazas libres en tiempo real.'
  if (days[0].relation !== 'hoy')
    return 'Hoy ya no quedan clases. Estas son las siguientes, con las plazas libres en tiempo real.'
  if (days.length > 1) return 'Lo que queda de hoy y lo siguiente en el calendario, con las plazas libres en tiempo real.'
  return 'Las clases que quedan hoy, con las plazas libres en tiempo real.'
}

export function TodaySchedule({ state, onRetry }: { state: HomeState; onRetry: () => void }) {
  const days = state.status === 'ready' ? state.data.upcoming : undefined
  const title = days && days.length > 0 && days[0].relation !== 'hoy' ? 'Próximas clases' : 'Hoy en Lumbra'

  return (
    <section aria-labelledby="horario-titulo" id="horario-hoy" className="bg-white/60 py-12 sm:py-20 lg:py-24">
      <div className="container-page grid grid-cols-1 gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
        <div>
          <SectionHeading id="horario-titulo" kicker="Horario" title={title}>
            <p>{subtitleFor(days)}</p>
          </SectionHeading>
          <ButtonLink to="/clases" variant="secondary" className="mt-6 sm:mt-8">
            Ver la semana completa
          </ButtonLink>
        </div>

        <div className="rounded-lg border border-arena-200 bg-crema px-4 shadow-sm sm:px-6">
          {state.status === 'loading' && <LoadingList />}
          {state.status === 'error' && (
            <div className="py-6">
              <Alert
                tone="error"
                title="No hemos podido cargar el horario"
                action={
                  <Button variant="secondary" onClick={onRetry} icon={<RotateCcw aria-hidden="true" strokeWidth={1.75} className="size-4" />}>
                    Reintentar
                  </Button>
                }
              >
                Comprueba tu conexión y vuelve a intentarlo.
              </Alert>
            </div>
          )}
          {days && days.length === 0 && (
            <div className="py-6">
              <EmptyState icon={CalendarX2} title="No hay clases programadas">
                Esta semana el estudio descansa. Consulta el calendario para ver las próximas fechas.
              </EmptyState>
            </div>
          )}
          {days?.map((day) => (
            <DayGroup key={day.relation} day={day} />
          ))}
        </div>
      </div>
    </section>
  )
}
