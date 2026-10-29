import { cn } from '../../lib/cn.ts'

/** Bloque de carga decorativo; el contenedor debe anunciar «Cargando…». */
export function Skeleton({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'block animate-shimmer rounded-sm bg-linear-to-r from-arena-100 via-arena-200 to-arena-100 bg-size-[200%_100%]',
        className,
      )}
    />
  )
}
