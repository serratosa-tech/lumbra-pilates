import type { ReactNode } from 'react'
import { WeekNav } from '../public/schedule/WeekNav.tsx'
import { formatWeekRange } from '../../lib/dates.ts'
import type { useStudioWeek } from './useStudioWeek.ts'

interface PanelHeaderProps {
  title: string
  /** Si se pasa, muestra la semana y su navegación. */
  week?: ReturnType<typeof useStudioWeek>
  subtitle?: string
  actions?: ReactNode
}

/** Encabezado común de las pantallas del panel. */
export function PanelHeader({ title, week, subtitle, actions }: PanelHeaderProps) {
  return (
    <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        <h1 className="text-3xl">{title}</h1>
        <p className="mt-2 text-tinta-700" aria-live="polite">
          {week ? `Semana del ${formatWeekRange(week.monday)}` : subtitle}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {week && (
          <WeekNav
            canGoBack={week.canGoBack}
            canGoForward={week.canGoForward}
            isDefaultWeek={week.isCurrent}
            onChange={week.changeWeek}
            onToday={week.goToCurrent}
          />
        )}
        {actions}
      </div>
    </header>
  )
}
