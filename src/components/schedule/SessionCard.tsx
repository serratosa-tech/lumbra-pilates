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

/**
 * Clase que ya ha empezado: solo hora, nombre y estado, atenuada, para que destaquen las que se pueden reservar.
 * El contraste del texto se mantiene (sin opacidad).
 */
function PastSessionCard({ session, now, compact, Heading }: { session: ClassSession; now: Date; compact: boolean; Heading: 'h3' | 'h4' }) {
  const status = spotsStatus(session, now)
  const time = formatTime(session.startsAt)
  const timeTag = <time dateTime={session.startsAt}>{time}</time>
  const heading = (
    <Heading className={cn('min-w-0 font-sans font-semibold tracking-normal', compact ? 'text-xs leading-snug' : 'flex-1 text-base')}>
      {session.name}
      <span className="sr-only">{`, ${time}, ${status.label}`}</span>
    </Heading>
  )
  const label = (
    <span aria-hidden="true" className="text-xs font-semibold whitespace-nowrap">
      {status.label}
    </span>
  )
  const card = 'rounded-md border border-dashed border-arena-200 bg-crema text-piedra'

  // En las columnas de escritorio no cabe todo en una fila: hora y estado arriba, el nombre debajo.
  if (compact) {
    return (
      <article className={cn(card, 'flex flex-col gap-1 px-3 py-2')}>
        <p className="flex flex-wrap items-baseline justify-between gap-x-2">
          <span className="font-display text-base leading-tight tabular-nums">{timeTag}</span>
          {label}
        </p>
        {heading}
      </article>
    )
  }
  return (
    <article className={cn(card, 'flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2.5 sm:px-5')}>
      <p className="w-[5ch] shrink-0 font-display text-xl leading-none tabular-nums">{timeTag}</p>
      {heading}
      {label}
    </article>
  )
}

/** Tarjeta de una clase del horario. Las pasadas y canceladas se muestran, pero no se pueden abrir. */
export function SessionCard({ session, now, variant = 'row', onOpen, to, headingLevel: Heading = 'h3' }: SessionCardProps) {
  const status = spotsStatus(session, now)
  const interactive = isBookable(status.state) && Boolean(onOpen || to)
  const time = formatTime(session.startsAt)
  const full = status.state === 'full'
  const accessibleSuffix = `, ${time}, ${status.label}`
  const compact = variant === 'compact'

  if (status.state === 'past') return <PastSessionCard session={session} now={now} compact={compact} Heading={Heading} />

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
        {/* En móvil, la instructora en su fila y debajo duración y nivel siempre lado a lado, igual en todas las tarjetas. */}
        <ul
          className={cn(
            'mt-1 text-piedra',
            compact
              ? 'flex flex-col gap-0.5 text-xs'
              : 'grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-sm sm:flex sm:flex-wrap sm:items-center',
          )}
        >
          <li className={cn('inline-flex items-center gap-1.5', !compact && 'col-span-2')}>
            <UserRound aria-hidden="true" strokeWidth={1.75} className="size-4 shrink-0" />
            {session.instructor}
          </li>
          <li className="inline-flex items-center gap-1.5 whitespace-nowrap">
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

      {/* La flecha móvil va en posición absoluta, fuera del flujo: no resta ancho al contenido. */}
      {!compact && interactive && (
        <>
          <ChevronRight
            aria-hidden="true"
            strokeWidth={1.75}
            className="absolute top-1/2 right-3 size-5 -translate-y-1/2 text-piedra sm:hidden"
          />
          <span aria-hidden="true" className="hidden self-center sm:block">
            <span className={buttonClasses(full ? 'ghost' : 'secondary', 'md')}>{full ? 'Lista de espera' : 'Reservar'}</span>
          </span>
        </>
      )}
    </article>
  )
}
