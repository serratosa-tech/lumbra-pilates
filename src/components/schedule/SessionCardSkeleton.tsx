import { Skeleton } from '../ui/index.ts'

/** Silueta de carga de una SessionCard; el contenedor anuncia «Cargando…». */
export function SessionCardSkeleton({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="flex flex-col gap-2 rounded-md border border-arena-200 bg-white/70 p-3">
        <Skeleton className="h-5 w-12" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-3 w-3/4" />
        <Skeleton className="mt-2 h-6 w-16 rounded-full" />
      </div>
    )
  }
  return (
    <div className="flex items-start gap-4 rounded-md border border-arena-200 bg-white/70 p-4 sm:gap-5 sm:px-5">
      <Skeleton className="h-8 w-14 shrink-0" />
      <div className="flex flex-1 flex-col gap-2">
        <Skeleton className="h-5 w-40 max-w-full" />
        <Skeleton className="h-4 w-56 max-w-full" />
        <Skeleton className="mt-2 h-6 w-28 rounded-full" />
      </div>
    </div>
  )
}
