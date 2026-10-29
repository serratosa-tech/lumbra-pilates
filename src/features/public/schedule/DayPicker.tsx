import { useEffect, useRef, type KeyboardEvent } from 'react'
import { plural } from '../../../components/schedule/labels.ts'
import { cn } from '../../../lib/cn.ts'
import { formatDayMonth, formatLongWeekday, formatShortWeekday } from '../../../lib/dates.ts'
import type { ScheduleDay } from './ScheduleViews.tsx'
import { dayTabId } from './useScheduleParams.ts'

interface DayPickerProps {
  days: ScheduleDay[]
  selected: number
  onSelect: (weekday: number) => void
  panelId: string
}

/** Selector de día deslizable (pestañas con flechas, Inicio y Fin). */
export function DayPicker({ days, selected, onSelect, panelId }: DayPickerProps) {
  const listRef = useRef<HTMLDivElement>(null)

  // Centra el día elegido sin mover la página en vertical.
  useEffect(() => {
    const list = listRef.current
    const tab = list?.querySelector<HTMLElement>('[aria-selected="true"]')
    if (!list || !tab) return
    list.scrollTo({ left: tab.offsetLeft - (list.clientWidth - tab.clientWidth) / 2 })
  }, [selected])

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const index = days.findIndex((d) => d.weekday === selected)
    const target = {
      ArrowRight: Math.min(days.length - 1, index + 1),
      ArrowLeft: Math.max(0, index - 1),
      Home: 0,
      End: days.length - 1,
    }[event.key]
    if (target === undefined) return
    event.preventDefault()
    onSelect(days[target].weekday)
    listRef.current?.querySelector<HTMLElement>(`#${dayTabId(days[target].weekday)}`)?.focus()
  }

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label="Día de la semana"
      onKeyDown={onKeyDown}
      className="-mx-4 flex snap-x gap-2 overflow-x-auto scroll-px-4 px-4 py-1 [scrollbar-width:none] sm:-mx-6 sm:px-6"
    >
      {days.map((day) => {
        const isSelected = day.weekday === selected
        return (
          <button
            key={day.weekday}
            id={dayTabId(day.weekday)}
            type="button"
            role="tab"
            aria-selected={isSelected}
            aria-controls={panelId}
            tabIndex={isSelected ? 0 : -1}
            aria-label={`${formatLongWeekday(day.date)} ${formatDayMonth(day.date)}${day.isToday ? ', hoy' : ''}, ${plural(day.sessions.length, 'clase')}`}
            onClick={() => onSelect(day.weekday)}
            className={cn(
              'flex min-w-[4.5rem] flex-1 shrink-0 snap-start flex-col items-center rounded-md border px-3 py-2 transition-colors duration-(--duration-fast)',
              isSelected
                ? 'border-terracota-600 bg-terracota-600 text-white shadow-md'
                : 'border-arena-200 bg-white text-tinta hover:border-arena-400 hover:bg-arena-100',
            )}
          >
            <span className={cn('text-xs font-semibold tracking-wide uppercase', !isSelected && 'text-piedra')}>
              {day.isToday ? 'Hoy' : formatShortWeekday(day.date)}
            </span>
            <span className="font-display text-2xl leading-tight tabular-nums">{day.date.day}</span>
            <span className={cn('text-xs whitespace-nowrap', isSelected ? 'text-white/90' : 'text-piedra')}>
              {plural(day.sessions.length, 'clase')}
            </span>
          </button>
        )
      })}
    </div>
  )
}
