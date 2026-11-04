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
 * Clase que ya ha empezado: solo hora, nombre y estado («En curso», «Finalizada» o «Cancelada»),
 * atenuada, para que destaquen las que se pueden reservar.
 * El contraste del texto se mantiene (sin opacidad).
 */
function PastSessionCard({ session, now, compact, Heading }: { session: ClassSession; now: Date; compact: boolean; Heading: 'h3' | 'h4' }) {
  const status = spotsStatus(session, now)
  const time = formatTime(session.startsAt)
  const timeTag = <time dateTime={session.startsAt}>{time}</time>
  const heading = (
    <Heading className={cn('min-w-0 font-medium', compact ? 'text-xs leading-snug' : 'flex-1 text-base')}>
      {session.name}
      <span className="sr-only">{`, ${time}, ${status.label}`}</span>
    </Heading>
  )
  const label = (
    <span aria-hidden="true" className="text-xs font-medium [overflow-wrap:normal]">
      {status.label}
    </span>
  )
  const card = 'rounded-md border border-dashed border-arena-200 bg-crema text-piedra'

  // En las columnas de escritorio no cabe todo en una fila: hora y estado arriba, el nombre debajo.
  if (compact) {
    return (
      <article className={cn(card, 'flex flex-col gap-1 px-3 py-2')}>
        <p className="flex flex-wrap items-baseline justify-between gap-x-2">
          <span className="text-base leading-tight tabular-nums">{timeTag}</span>
          {label}
        </p>
        {heading}
      </article>
    )
  }
  // En móvil el estado va bajo el nombre, para que el nombre quepa en una línea.
  // Con el texto muy grande, si al lado de la hora no quedan 8 rem, nombre y estado bajan debajo.
  return (
    <article className={cn(card, 'flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2.5 sm:px-5')}>
      <p className="w-[5ch] shrink-0 text-xl font-medium leading-none tabular-nums">{timeTag}</p>
      <div className="flex min-w-[min(8rem,100%)] flex-1 flex-col sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-x-4">
        {heading}
        {label}
      </div>
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

  // Toda clase que ya ha empezado, cancelada o no, va en versión compacta.
  if (now.getTime() >= new Date(session.startsAt).getTime()) {
    return <PastSessionCard session={session} now={now} compact={compact} Heading={Heading} />
  }

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
          : // En móvil la hora va encima del nombre: el texto usa todo el ancho de la tarjeta.
            // Desde sm, en fila; con texto muy grande el contenido baja bajo la hora en vez de desbordar.
            'flex flex-col gap-2 p-4 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-5 sm:px-5',
      )}
    >
      {/* Desde sm, ancho fijo en «ch» (crece con el texto) y cifras tabulares: los nombres empiezan a la misma altura. */}
      <p
        className={cn(
          'shrink-0 font-medium leading-none tabular-nums',
          compact ? 'text-xl' : 'text-2xl sm:w-[5ch] sm:self-start sm:pt-0.5 sm:text-3xl',
          !interactive && 'text-tinta-700',
        )}
      >
        <time dateTime={session.startsAt}>{time}</time>
      </p>

      <div className={compact ? 'min-w-0' : 'min-w-0 sm:min-w-[min(12rem,100%)] sm:flex-1'}>
        <Heading className={cn('font-medium', compact ? 'text-sm leading-snug' : 'text-lg')}>
          {title}
        </Heading>
        {/* Cada dato es un bloque entero con su icono: si no cabe, baja completo a la línea siguiente. */}
        <ul className={cn('mt-1 text-piedra', compact ? 'flex flex-col gap-0.5 text-xs' : 'flex flex-wrap items-center gap-x-3 gap-y-1 text-sm')}>
          {[
            { icon: UserRound, text: session.instructor },
            { icon: Clock, text: `${session.durationMinutes} min` },
            { icon: Gauge, text: LEVEL_LABELS[session.level] },
          ].map(({ icon: Icon, text }) => (
            <li key={text} className="inline-flex min-w-0 items-center gap-1.5">
              <Icon aria-hidden="true" strokeWidth={1.75} className="size-4 shrink-0" />
              {text}
            </li>
          ))}
        </ul>
        <SpotsMeter session={session} now={now} compact={compact} className="mt-3" />
      </div>

      {!compact && interactive && (
        <>
          {/* En móvil, la flecha va en la fila de la hora: no resta ancho al nombre ni a los datos. */}
          <ChevronRight aria-hidden="true" strokeWidth={1.75} className="absolute top-4 right-3 size-6 text-piedra sm:hidden" />
          <span aria-hidden="true" className="hidden self-center sm:block">
            {/* Los dos textos ocupan la misma celda: todos los botones miden lo que «Lista de espera»,
                con cualquier tamaño de letra, y la columna queda alineada. */}
            <span className={buttonClasses('secondary', 'md')}>
              <span className="grid text-center">
                <span className={cn('col-start-1 row-start-1', full && 'invisible')}>Reservar</span>
                <span className={cn('col-start-1 row-start-1', !full && 'invisible')}>Lista de espera</span>
              </span>
            </span>
          </span>
        </>
      )}
    </article>
  )
}
