import { ChevronRight, Clock, Gauge, UserRound } from 'lucide-react'
import { Link } from 'react-router'
import { isBookable, type ClassSession } from '../../data/index.ts'
import { cn } from '../../lib/cn.ts'
import { formatTime } from '../../lib/dates.ts'
import { buttonClasses } from '../ui/index.ts'
import { LEVEL_LABELS, spotsStatus } from './labels.ts'
import { SpotsMeter } from './SpotsMeter.tsx'

interface SessionCardProps {
  session: ClassSession
  now: Date
  /** `row`: listas (portada, móvil). `compact`: columnas de la semana en escritorio. */
  variant?: 'row' | 'compact'
  /** Abre el detalle con un botón… */
  onOpen?: (id: string) => void
  /** …o lleva a otra página con un enlace. */
  to?: string
  headingLevel?: 'h3' | 'h4'
}

// El botón o enlace se extiende con ::after a toda la tarjeta; el anillo de foco lo pinta la tarjeta.
const STRETCHED = 'text-left after:absolute after:inset-0 after:rounded-[inherit] focus-visible:outline-none'

/** Tarjeta de una clase del horario. Las pasadas y canceladas se muestran, pero no se pueden abrir. */
export function SessionCard({ session, now, variant = 'row', onOpen, to, headingLevel: Heading = 'h3' }: SessionCardProps) {
  const status = spotsStatus(session, now)
  const interactive = isBookable(status.state) && Boolean(onOpen || to)
  const time = formatTime(session.startsAt)
  const full = status.state === 'full'
  const accessibleSuffix = `, ${time}, ${status.label}`
  const compact = variant === 'compact'

  const title = interactive ? (
    to ? (
      <Link to={to} className={STRETCHED}>
        {session.name}
        <span className="sr-only">{accessibleSuffix}</span>
      </Link>
    ) : (
      <button type="button" onClick={() => onOpen?.(session.id)} className={STRETCHED}>
        {session.name}
        <span className="sr-only">{accessibleSuffix}</span>
      </button>
    )
  ) : (
    <>
      <span className={cn(status.state === 'cancelled' && 'line-through decoration-piedra/60')}>{session.name}</span>
      <span className="sr-only">{accessibleSuffix}</span>
    </>
  )

  return (
    <article
      className={cn(
        'relative rounded-md border bg-white shadow-sm',
        'transition-[box-shadow,border-color,translate] duration-(--duration-base) ease-(--ease-out-soft)',
        'has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-terracota-700',
        interactive ? 'border-arena-200 hover:-translate-y-0.5 hover:border-arena-400 hover:shadow-md' : 'border-arena-200/70 bg-white/55 shadow-none',
        compact
          ? 'flex h-full flex-col gap-2 p-3'
          : // Con texto muy grande el contenido (mínimo en rem) baja bajo la hora en vez de desbordar.
            'flex flex-wrap items-start gap-x-4 gap-y-2 p-4 pr-10 sm:items-center sm:gap-x-5 sm:px-5',
      )}
    >
      {/* Ancho fijo en «ch» (crece con el texto) y cifras tabulares: los nombres empiezan todos a la misma altura. */}
      <p
        className={cn(
          'shrink-0 font-display leading-none tabular-nums',
          compact ? 'text-xl' : 'w-[5ch] pt-0.5 text-2xl sm:self-start sm:text-3xl',
          !interactive && 'text-tinta-700',
        )}
      >
        <time dateTime={session.startsAt}>{time}</time>
      </p>

      <div className={compact ? 'min-w-0' : 'min-w-[min(9rem,100%)] flex-1'}>
        <Heading className={cn('font-sans font-semibold tracking-normal', compact ? 'text-sm leading-snug' : 'text-lg')}>
          {title}
        </Heading>
        <ul
          className={cn(
            'mt-1 flex flex-wrap text-piedra',
            compact ? 'flex-col gap-0.5 text-xs' : 'items-center gap-x-3 gap-y-1 text-sm',
          )}
        >
          <li className="inline-flex items-center gap-1.5">
            <UserRound aria-hidden="true" strokeWidth={1.75} className="size-4 shrink-0" />
            {session.instructor}
          </li>
          <li className="inline-flex items-center gap-1.5">
            <Clock aria-hidden="true" strokeWidth={1.75} className="size-4 shrink-0" />
            {session.durationMinutes} min
          </li>
          <li className="inline-flex items-center gap-1.5">
            <Gauge aria-hidden="true" strokeWidth={1.75} className="size-4 shrink-0" />
            {LEVEL_LABELS[session.level]}
          </li>
        </ul>
        <SpotsMeter session={session} now={now} compact={compact} className="mt-3" />
      </div>

      {!compact && interactive && (
        <span aria-hidden="true" className="self-center">
          <ChevronRight
            strokeWidth={1.75}
            className="absolute top-1/2 right-3 size-5 -translate-y-1/2 text-piedra sm:hidden"
          />
          <span className="hidden sm:block">
            <span className={buttonClasses(full ? 'ghost' : 'secondary', 'md')}>{full ? 'Lista de espera' : 'Reservar'}</span>
          </span>
        </span>
      )}
    </article>
  )
}
