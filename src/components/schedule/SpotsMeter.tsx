import type { ClassSession } from '../../data/index.ts'
import { cn } from '../../lib/cn.ts'
import { Badge } from '../ui/index.ts'
import { spotsStatus, type SpotsStatus } from './labels.ts'

const BAR_COLORS: Record<SpotsStatus['state'], string> = {
  available: 'bg-terracota-500',
  last_spots: 'bg-aviso',
  full: 'bg-error',
  past: 'bg-arena-400',
  cancelled: 'bg-arena-400',
}

/**
 * Distintivo de plazas con la barra de ocupación siempre debajo y del mismo ancho,
 * para que todas las tarjetas tengan la misma disposición sea cual sea el texto.
 */
export function SpotsMeter({
  session,
  now,
  compact = false,
  className,
}: {
  session: ClassSession
  now: Date
  /** Textos cortos y ancho completo, para las columnas de la semana. */
  compact?: boolean
  className?: string
}) {
  const status = spotsStatus(session, now, compact)
  // Solo «Completa · lista de espera» es demasiado largo para móvil; el resto cabe entero.
  const short = status.state === 'full' ? spotsStatus(session, now, true).label : status.label
  const occupancy =
    status.state === 'cancelled' ? 0 : Math.min(100, Math.round((session.bookedCount / session.capacity) * 100))

  return (
    <div className={cn('flex w-full flex-col items-start gap-2', !compact && 'max-w-44', className)}>
      {/* El distintivo nunca se parte; en móvil, una clase completa dice solo «Completa». */}
      <Badge tone={status.tone} className="whitespace-nowrap">
        {short === status.label ? (
          status.label
        ) : (
          <>
            <span className="sm:hidden">{short}</span>
            <span className="hidden sm:inline">{status.label}</span>
          </>
        )}
      </Badge>
      <span
        role="img"
        aria-label={`${session.bookedCount} de ${session.capacity} plazas ocupadas`}
        className="block h-1.5 w-full overflow-hidden rounded-full bg-arena-200"
      >
        <span
          className={cn('block h-full rounded-full transition-[width] duration-(--duration-slow)', BAR_COLORS[status.state])}
          style={{ width: `${occupancy}%` }}
        />
      </span>
    </div>
  )
}
