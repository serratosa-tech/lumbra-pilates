import { ChevronRight, Hourglass } from 'lucide-react'
import { Link } from 'react-router'
import { plural } from '../../../components/schedule/labels.ts'
import { Badge, Card, Skeleton } from '../../../components/ui/index.ts'
import { formatShortWeekday, formatTime, studioDate } from '../../../lib/dates.ts'
import { useAsyncData } from '../../../lib/useAsyncData.ts'
import type { useStudioWeek } from '../useStudioWeek.ts'
import { RetryAlert } from './RetryAlert.tsx'

/** Filas visibles; el resto se ve en Asistentes. */
const MAX_ROWS = 4

/**
 * Clases de la semana elegida que aún no han empezado y tienen gente esperando plaza
 * (el mismo criterio que la métrica «En lista de espera»).
 */
export function WaitlistCard({ week, now, className }: { week: ReturnType<typeof useStudioWeek>; now: Date; className?: string }) {
  const { state, retry } = useAsyncData(`esperas:${week.weekKey}`, (ds) => ds.listSessions(week.range.from, week.range.to))
  const waiting =
    state.status === 'ready'
      ? state.data.filter((s) => s.status === 'scheduled' && s.waitlistCount > 0 && new Date(s.startsAt) > now)
      : []
  const weekOver = new Date(week.range.to) <= now
  const attendeesUrl = week.isCurrent ? '/estudio/asistentes' : `/estudio/asistentes?semana=${week.weekKey}`

  return (
    <Card as="section" aria-labelledby="esperas-titulo" className={className}>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h2 id="esperas-titulo" className="text-xl">
          Listas de espera
        </h2>
        {waiting.length > 0 && (
          <Badge tone="aviso" icon={<Hourglass aria-hidden="true" strokeWidth={1.75} className="size-3.5" />}>
            {plural(waiting.length, 'clase')}
          </Badge>
        )}
      </div>
      <p className="mt-1 text-sm text-piedra">Clases de esta semana con gente esperando plaza.</p>

      <div className="mt-4">
        {state.status === 'error' && <RetryAlert onRetry={retry} />}
        {state.status === 'loading' && (
          <div role="status" className="flex flex-col gap-3">
            <span className="sr-only">Cargando las listas de espera…</span>
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        )}
        {state.status === 'ready' && waiting.length === 0 && (
          <p className="text-piedra">
            {weekOver ? 'Esta semana ya ha terminado: no quedan listas abiertas.' : 'Nadie espera plaza esta semana.'}
          </p>
        )}
        {waiting.length > 0 && (
          <ul className="divide-y divide-arena-200">
            {waiting.slice(0, MAX_ROWS).map((session) => (
              <li key={session.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
                {/* 5ch con la letra de la hora (text-xl), como en «Hoy en el estudio». */}
                <span className="flex w-[5ch] shrink-0 flex-col text-xl leading-tight">
                  <span className="text-sm text-piedra">{formatShortWeekday(studioDate(new Date(session.startsAt)))}</span>
                  <span className="font-medium tabular-nums">{formatTime(session.startsAt)}</span>
                </span>
                <div className="min-w-[min(10rem,100%)] flex-1">
                  <Link
                    to={`/estudio/asistentes?clase=${session.id}`}
                    className="inline-flex min-h-11 items-center font-medium underline decoration-arena-400 underline-offset-4 hover:decoration-terracota-600"
                  >
                    {session.name}
                    <span className="sr-only">: ver asistentes</span>
                  </Link>
                  <p className="text-sm text-piedra">
                    {session.instructor} · <span className="tabular-nums">{session.bookedCount}/{session.capacity}</span> plazas
                  </p>
                </div>
                <Badge tone="aviso" className="tabular-nums">
                  {session.waitlistCount} en espera
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </div>

      {state.status === 'ready' && (
        <Link
          to={attendeesUrl}
          className="mt-auto inline-flex min-h-11 items-center gap-1 self-start pt-3 font-medium text-terracota-700 underline decoration-terracota-300 underline-offset-4 hover:decoration-terracota-600"
        >
          {waiting.length > MAX_ROWS ? `Ver las ${waiting.length} clases en Asistentes` : 'Ver todas en Asistentes'}
          <ChevronRight aria-hidden="true" strokeWidth={1.75} className="size-4" />
        </Link>
      )}
    </Card>
  )
}
