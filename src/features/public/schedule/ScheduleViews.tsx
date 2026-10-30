import { CalendarX2, SearchX } from 'lucide-react'
import { useId } from 'react'
import { SessionCard } from '../../../components/schedule/SessionCard.tsx'
import { SessionCardSkeleton } from '../../../components/schedule/SessionCardSkeleton.tsx'
import { Button, EmptyState } from '../../../components/ui/index.ts'
import type { ClassSession } from '../../../data/index.ts'
import { cn } from '../../../lib/cn.ts'
import { formatDate, formatShortWeekday, type CalendarDate } from '../../../lib/dates.ts'
import { capitalize } from '../../../lib/text.ts'

export interface ScheduleDay {
  weekday: number
  date: CalendarDate
  isToday: boolean
  /** Clases del día con los filtros aplicados. */
  sessions: ClassSession[]
  /** Clases del día sin filtrar (para distinguir «no hay clases» de «ningún resultado»). */
  total: number
}

interface ViewProps {
  now: Date
  onOpen: (id: string) => void
  onClearFilters: () => void
}

function NoResults({ onClearFilters, compact = false }: { onClearFilters: () => void; compact?: boolean }) {
  if (compact) return <p className="px-1 py-3 text-sm text-piedra">Ninguna coincide con los filtros.</p>
  return (
    <EmptyState
      icon={SearchX}
      title="Ninguna clase coincide"
      action={
        <Button variant="secondary" onClick={onClearFilters}>
          Quitar filtros
        </Button>
      }
    >
      Prueba con otro tipo de clase, instructora o nivel, o mira otro día.
    </EmptyState>
  )
}

/** Lista de las clases de un día (móvil y tablet). */
export function DayList({ day, now, onOpen, onClearFilters, panelId, labelledBy }: ViewProps & { day: ScheduleDay; panelId: string; labelledBy: string }) {
  return (
    <div id={panelId} role="tabpanel" aria-labelledby={labelledBy} className="mt-5">
      <h2 className="mb-4 font-sans text-base font-semibold tracking-normal text-tinta-700">
        {capitalize(formatDate(day.date))}
      </h2>
      {day.sessions.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {day.sessions.map((session) => (
            <li key={session.id}>
              <SessionCard session={session} now={now} onOpen={onOpen} />
            </li>
          ))}
        </ul>
      ) : day.total > 0 ? (
        <NoResults onClearFilters={onClearFilters} />
      ) : (
        <EmptyState icon={CalendarX2} title="No hay clases este día">
          Mira otro día de la semana para encontrar tu clase.
        </EmptyState>
      )}
    </div>
  )
}

/** Semana en columnas (escritorio). */
export function WeekGrid({ days, now, onOpen, onClearFilters }: ViewProps & { days: ScheduleDay[] }) {
  return (
    <div className="grid grid-cols-6 gap-3">
      {days.map((day) => (
        <DayColumn key={day.weekday} day={day} now={now} onOpen={onOpen} onClearFilters={onClearFilters} />
      ))}
    </div>
  )
}

function DayColumn({ day, now, onOpen, onClearFilters }: ViewProps & { day: ScheduleDay }) {
  const headingId = useId()
  return (
    <section aria-labelledby={headingId} className="flex min-w-0 flex-col gap-3">
      <h2
        id={headingId}
        className={cn(
          'flex items-baseline justify-between gap-2 rounded-md px-3 py-2 font-sans text-sm font-semibold tracking-normal',
          day.isToday ? 'bg-terracota-600 text-white' : 'bg-arena-100 text-tinta-700',
        )}
      >
        <span aria-hidden="true">
          <span className="capitalize">{formatShortWeekday(day.date)}</span>{' '}
          <span className="font-display text-lg tabular-nums">{day.date.day}</span>
        </span>
        <span className="sr-only">
          {capitalize(formatDate(day.date))}
          {day.isToday && ', hoy'}
        </span>
        {day.isToday && (
          <span aria-hidden="true" className="text-xs tracking-wide uppercase">
            Hoy
          </span>
        )}
      </h2>
      {day.sessions.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {day.sessions.map((session) => (
            <li key={session.id}>
              <SessionCard session={session} now={now} onOpen={onOpen} variant="compact" />
            </li>
          ))}
        </ul>
      ) : day.total > 0 ? (
        <NoResults onClearFilters={onClearFilters} compact />
      ) : (
        <p className="px-1 py-3 text-sm text-piedra">Sin clases.</p>
      )}
    </section>
  )
}

/** Esqueleto de carga de las dos vistas. */
export function ScheduleSkeleton() {
  return (
    <div role="status" className="mt-6">
      <span className="sr-only">Cargando el horario…</span>
      <div className="flex flex-col gap-3 lg:hidden">
        {Array.from({ length: 4 }, (_, i) => (
          <SessionCardSkeleton key={i} />
        ))}
      </div>
      <div className="hidden grid-cols-6 gap-3 lg:grid">
        {Array.from({ length: 6 }, (_, col) => (
          <div key={col} className="flex flex-col gap-3">
            <span className="h-10 rounded-md bg-arena-100" />
            {Array.from({ length: 4 }, (_, i) => (
              <SessionCardSkeleton key={i} compact />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
