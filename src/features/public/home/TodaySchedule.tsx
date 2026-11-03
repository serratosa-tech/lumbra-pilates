import { CalendarX2, RotateCcw } from 'lucide-react'
import { useId } from 'react'
import { SessionCard } from '../../../components/schedule/SessionCard.tsx'
import { SessionCardSkeleton } from '../../../components/schedule/SessionCardSkeleton.tsx'
import { Alert, Button, ButtonLink, EmptyState } from '../../../components/ui/index.ts'
import { useNow } from '../../../lib/useNow.ts'
import { scheduleLink } from '../schedule/useScheduleParams.ts'
import { SectionHeading } from './SectionHeading.tsx'
import { dayHeading, UPCOMING_LIMIT, type UpcomingDay } from './upcoming.ts'
import type { HomeState } from './useHomeData.ts'

function DayGroup({ day, now }: { day: UpcomingDay; now: Date }) {
  const headingId = useId()
  return (
    <div className="pt-5 pb-1">
      <h3 id={headingId} className="pb-3 font-sans text-sm font-semibold tracking-normal text-piedra">
        {dayHeading(day)}
      </h3>
      <ul aria-labelledby={headingId} className="flex flex-col gap-3">
        {day.sessions.map((session) => (
          <li key={session.id}>
            <SessionCard session={session} now={now} to={scheduleLink(session)} headingLevel="h4" />
          </li>
        ))}
      </ul>
    </div>
  )
}

function LoadingList() {
  return (
    <div role="status" className="flex flex-col gap-3 py-5">
      <span className="sr-only">Cargando el horario…</span>
      {Array.from({ length: UPCOMING_LIMIT }, (_, i) => (
        <SessionCardSkeleton key={i} />
      ))}
    </div>
  )
}

function subtitleFor(days: UpcomingDay[] | undefined): string {
  if (!days || days.length === 0) return 'Las próximas clases, con las plazas libres actualizadas cada minuto.'
  if (days[0].relation !== 'hoy')
    return 'Hoy ya no quedan clases. Estas son las siguientes, con las plazas libres actualizadas cada minuto.'
  if (days.length > 1)
    return 'Lo que queda de hoy y lo siguiente en el calendario, con las plazas libres actualizadas cada minuto.'
  return 'Las clases que quedan hoy, con las plazas libres actualizadas cada minuto.'
}

export function TodaySchedule({ state, onRetry }: { state: HomeState; onRetry: () => void }) {
  const now = useNow()
  const days = state.status === 'ready' ? state.data.upcoming : undefined
  const title = days && days.length > 0 && days[0].relation !== 'hoy' ? 'Próximas clases' : 'Hoy en Lumbra'

  return (
    <section aria-labelledby="horario-titulo" id="horario-hoy" className="bg-white/60 py-12 sm:py-20 lg:py-24">
      <div className="container-page grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
        {/* En escritorio el título acompaña al recorrer la lista, por debajo de la cabecera fija. */}
        <div className="lg:sticky lg:top-28 lg:self-start">
          <SectionHeading id="horario-titulo" kicker="Horario" title={title}>
            <p>{subtitleFor(days)}</p>
          </SectionHeading>
          <ButtonLink to="/clases" variant="secondary" className="mt-6 sm:mt-8">
            Ver la semana completa
          </ButtonLink>
        </div>

        {/* El panel con fondo propio solo en escritorio: en móvil y tablet las tarjetas usan todo el ancho. */}
        <div className="lg:rounded-lg lg:border lg:border-arena-200 lg:bg-crema lg:px-5 lg:pb-4 lg:shadow-sm">
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
            <DayGroup key={day.relation} day={day} now={now} />
          ))}
        </div>
      </div>
    </section>
  )
}
