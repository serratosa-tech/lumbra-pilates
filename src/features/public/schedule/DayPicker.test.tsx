import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { ClassSession } from '../../../data/index.ts'
import { addDays } from '../../../lib/dates.ts'
import { DayPicker } from './DayPicker.tsx'
import type { ScheduleDay } from './ScheduleViews.tsx'

const MONDAY = { year: 2026, month: 11, day: 2 }
const sessions = (n: number) => Array.from({ length: n }, () => ({}) as ClassSession)
const DAYS: ScheduleDay[] = [
  { weekday: 1, date: MONDAY, isToday: false, sessions: sessions(5), total: 5 },
  { weekday: 3, date: addDays(MONDAY, 2), isToday: true, sessions: sessions(1), total: 1 },
]

describe('selector de día', () => {
  it('el nombre de cada pestaña empieza por lo que se ve y termina con la fecha completa', () => {
    render(<DayPicker days={DAYS} selected={3} onSelect={vi.fn()} panelId="panel" />)
    expect(screen.getByRole('tab', { name: 'Lun 2, 5 clases: lunes 2 de noviembre' })).toHaveAttribute('aria-selected', 'false')
    const today = screen.getByRole('tab', { name: 'Hoy 4, 1 clase: miércoles 4 de noviembre' })
    expect(today).toHaveAttribute('aria-selected', 'true')

    // Lo visible (sin las mayúsculas, que son de CSS) está al principio del nombre: el control por voz lo encuentra.
    for (const tab of screen.getAllByRole('tab')) {
      const visible = [...tab.children].map((el) => el.textContent).join(' ')
      const [shortDay, number] = visible.split(' ')
      expect(tab.getAttribute('aria-label')?.toLowerCase().startsWith(`${shortDay} ${number}`.toLowerCase())).toBe(true)
    }
  })
})
