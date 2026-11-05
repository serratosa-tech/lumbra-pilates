import { CalendarCheck, CalendarX2, Gauge, Hourglass, Undo2, type LucideIcon } from 'lucide-react'
import { Link } from 'react-router'
import { plural } from '../../../components/schedule/labels.ts'
import { SpotsMeter } from '../../../components/schedule/SpotsMeter.tsx'
import { Seo } from '../../../components/Seo.tsx'
import { Card, EmptyState, Skeleton } from '../../../components/ui/index.ts'
import type { WeekMetrics } from '../../../data/index.ts'
import { dayRange, formatTime, studioDate } from '../../../lib/dates.ts'
import { useAsyncData } from '../../../lib/useAsyncData.ts'
import { useNow } from '../../../lib/useNow.ts'
import { PanelHeader } from '../PanelHeader.tsx'
import { useStudioUser } from '../studioUser.ts'
import { useStudioWeek } from '../useStudioWeek.ts'
import { OccupancyChart } from './OccupancyChart.tsx'
import { RetryAlert } from './RetryAlert.tsx'
import { WaitlistCard } from './WaitlistCard.tsx'

const percent = (value: number) => `${Math.round(value * 100)} %`

// 2×2 desde 320 px; con el texto del navegador muy grande (el rem de la consulta crece) pasa a una columna.
const METRICS_GRID = 'grid grid-cols-1 gap-3 min-[20rem]:grid-cols-2 lg:grid-cols-4'

function MetricCard({ icon: Icon, label, value, detail }: { icon: LucideIcon; label: string; value: string; detail: string }) {
  return (
    <Card as="li" className="flex min-w-0 flex-col gap-1 p-4 sm:p-5">
      {/* En tarjetas estrechas el icono va encima de la etiqueta para que el texto tenga todo el ancho. */}
      <p className="flex flex-col items-start gap-2 text-sm font-medium text-tinta-700 sm:flex-row sm:items-center">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-arena-100 text-terracota-600">
          <Icon aria-hidden="true" strokeWidth={1.75} className="size-4" />
        </span>
        {label}
      </p>
      <p className="mt-2 text-3xl font-medium tabular-nums">{value}</p>
      <p className="text-sm text-piedra">{detail}</p>
    </Card>
  )
}

function metricCards(m: WeekMetrics) {
  return [
    { icon: Gauge, label: 'Ocupación media', value: percent(m.occupancy), detail: `en ${plural(m.sessions, 'clase')}` },
    {
      icon: CalendarCheck,
      label: 'Clases completas',
      value: String(m.fullSessions),
      detail: `de ${plural(m.sessions, 'clase programada', 'clases programadas')}`,
    },
    {
      icon: Hourglass,
      label: 'En lista de espera',
      value: String(m.waitlisted),
      detail: m.waitlisted === 1 ? 'persona esperando plaza' : 'personas esperando plaza',
    },
    {
      icon: Undo2,
      label: 'Tasa de cancelación',
      value: percent(m.cancellationRate),
      detail: plural(m.cancellations, 'cancelación', 'cancelaciones'),
    },
  ]
}

export function OverviewPage() {
  const now = useNow()
  const user = useStudioUser()
  const week = useStudioWeek(now)
  const metrics = useAsyncData(`metricas:${week.weekKey}`, (ds) => ds.getMetrics(week.range.from, week.range.to))
  const today = useAsyncData('hoy', (ds) => {
    const { from, to } = dayRange(studioDate(now))
    return ds.listSessions(from, to)
  })

  return (
    <div className="container-page py-8 sm:py-12">
      <Seo title="Resumen · Panel del estudio" description="Métricas de la semana en Lumbra Pilates." noindex />
      <p className="mb-2 text-sm text-piedra">Hola, {user.name.split(' ')[0]}.</p>
      <PanelHeader title="Resumen" week={week} />

      <section aria-label="Métricas de la semana" className="mt-6">
        {metrics.state.status === 'error' && <RetryAlert onRetry={metrics.retry} />}
        {metrics.state.status === 'loading' && (
          <div role="status" className={METRICS_GRID}>
            <span className="sr-only">Cargando métricas…</span>
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="flex flex-col gap-3 rounded-lg border border-arena-200 bg-white p-4 sm:p-5">
                <Skeleton className="h-5 w-full max-w-32" />
                <Skeleton className="h-9 w-20" />
                <Skeleton className="h-4 w-full max-w-28" />
              </div>
            ))}
          </div>
        )}
        {metrics.state.status === 'ready' &&
          (metrics.state.data.sessions === 0 ? (
            <EmptyState icon={CalendarX2} title="No hay clases esta semana">
              Programa clases desde la sección «Clases» para ver aquí sus métricas.
            </EmptyState>
          ) : (
            <ul className={METRICS_GRID}>
              {metricCards(metrics.state.data).map((card) => (
                <MetricCard key={card.label} {...card} />
              ))}
            </ul>
          ))}
      </section>

      {/* Las dos columnas terminan a la misma altura: la tarjeta de esperas ocupa lo que sobre a la izquierda
          (su contenido queda arriba y solo el enlace baja al pie) y «Hoy» se estira si la izquierda es más alta. */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-6">
          <Card as="section" aria-labelledby="franjas-titulo">
            <h2 id="franjas-titulo" className="text-xl">
              Ocupación por franja horaria
            </h2>
            <div className="mt-5">
              {metrics.state.status === 'ready' && metrics.state.data.slots.length > 0 ? (
                <OccupancyChart slots={metrics.state.data.slots} />
              ) : metrics.state.status === 'ready' ? (
                <p className="text-piedra">Sin clases programadas esta semana.</p>
              ) : metrics.state.status === 'error' ? (
                <p className="text-piedra">No se han podido cargar las franjas. Usa «Reintentar» arriba.</p>
              ) : (
                <div className="flex flex-col gap-3" aria-hidden="true">
                  {Array.from({ length: 6 }, (_, i) => (
                    <Skeleton key={i} className="h-7 w-full" />
                  ))}
                </div>
              )}
            </div>
          </Card>
          <WaitlistCard week={week} now={now} className="flex flex-1 flex-col" />
        </div>

        <Card as="section" aria-labelledby="hoy-titulo">
          <h2 id="hoy-titulo" className="text-xl">
            Hoy en el estudio
          </h2>
          <div className="mt-4">
            {today.state.status === 'error' && <RetryAlert onRetry={today.retry} />}
            {today.state.status === 'loading' && (
              <div role="status" className="flex flex-col gap-3">
                <span className="sr-only">Cargando las clases de hoy…</span>
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
            )}
            {today.state.status === 'ready' && today.state.data.length === 0 && (
              <p className="text-piedra">Hoy no hay clases. Buen momento para descansar.</p>
            )}
            {today.state.status === 'ready' && today.state.data.length > 0 && (
              <ul className="divide-y divide-arena-200">
                {today.state.data.map((session) => (
                  <li key={session.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
                    <span className="w-[5ch] shrink-0 text-xl font-medium tabular-nums">{formatTime(session.startsAt)}</span>
                    <div className="min-w-[min(10rem,100%)] flex-1">
                      <Link
                        to={`/estudio/asistentes?clase=${session.id}`}
                        className="font-medium underline decoration-arena-400 underline-offset-4 hover:decoration-terracota-600"
                      >
                        {session.name}
                        <span className="sr-only">: ver asistentes</span>
                      </Link>
                      <p className="text-sm text-piedra">{session.instructor}</p>
                      <SpotsMeter session={session} now={now} className="mt-2" />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
