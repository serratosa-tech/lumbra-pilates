import { cn } from '../../lib/cn.ts'

/**
 * Bloque de carga decorativo; el contenedor debe anunciar «Cargando…». Si `className` trae su propio
 * redondeado (rounded-full, rounded-lg…), sustituye al de serie: cn no resuelve conflictos de clases.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'block animate-shimmer bg-linear-to-r from-arena-100 via-arena-200 to-arena-100 bg-size-[200%_100%]',
        !/(^|\s)rounded-/.test(className ?? '') && 'rounded-sm',
        className,
      )}
    />
  )
}
