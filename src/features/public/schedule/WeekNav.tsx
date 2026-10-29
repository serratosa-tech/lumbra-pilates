import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '../../../components/ui/index.ts'
import { cn } from '../../../lib/cn.ts'

interface WeekNavProps {
  canGoBack: boolean
  canGoForward: boolean
  isDefaultWeek: boolean
  onChange: (delta: number) => void
  onToday: () => void
  className?: string
}

/** Semana anterior · Hoy · Semana siguiente. En móvil, las flechas sin texto. */
export function WeekNav({ canGoBack, canGoForward, isDefaultWeek, onChange, onToday, className }: WeekNavProps) {
  return (
    <nav aria-label="Cambiar de semana" className={cn('flex flex-wrap items-center gap-2', className)}>
      <Button
        variant="secondary"
        onClick={() => onChange(-1)}
        disabled={!canGoBack}
        aria-label="Semana anterior"
        className="px-3 sm:px-4"
        icon={<ChevronLeft aria-hidden="true" strokeWidth={1.75} className="size-5" />}
      >
        <span className="hidden sm:inline">Anterior</span>
      </Button>
      <Button variant="ghost" onClick={onToday} disabled={isDefaultWeek}>
        Hoy
      </Button>
      <Button
        variant="secondary"
        onClick={() => onChange(1)}
        disabled={!canGoForward}
        aria-label="Semana siguiente"
        className="px-3 sm:px-4"
      >
        <span className="hidden sm:inline">Siguiente</span>
        <ChevronRight aria-hidden="true" strokeWidth={1.75} className="size-5" />
      </Button>
    </nav>
  )
}
