import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import type { ClassSession } from '../../data/index.ts'
import { NOW } from '../../test/fixtures.ts'
import { SessionCard } from './SessionCard.tsx'

const base: ClassSession = {
  id: 's1',
  classTypeId: 'mat-flow',
  instructorId: 'marta',
  name: 'Mat Flow',
  instructor: 'Marta Ibáñez',
  level: 'todos',
  startsAt: '2026-11-02T17:00:00.000Z', // 18:00, más tarde que NOW
  durationMinutes: 55,
  capacity: 12,
  bookedCount: 4,
  waitlistCount: 0,
  status: 'scheduled',
}
const EARLIER = '2026-11-02T06:00:00.000Z' // 7:00, ya terminada en NOW

function renderCard(session: ClassSession) {
  return render(
    <MemoryRouter>
      <SessionCard session={session} now={NOW} to="/clases" />
    </MemoryRouter>,
  )
}

describe('tarjeta de clase', () => {
  it('una clase futura muestra sus datos como elementos completos y se puede abrir', () => {
    renderCard(base)
    expect(screen.getByRole('link', { name: /Mat Flow/ })).toBeInTheDocument()
    // Cada dato es su propio bloque: si no cabe, baja entero a la línea siguiente
    // (y solo se parte por dentro si ni solo cabe, con el texto muy grande).
    for (const text of ['Marta Ibáñez', '55 min', 'Todos los niveles']) {
      expect(screen.getByText(text).closest('li')).toHaveClass('inline-flex', 'min-w-0')
    }
  })

  it('completa: «Completa» en móvil y «Completa · lista de espera» desde tablet', () => {
    renderCard({ ...base, bookedCount: 12, waitlistCount: 2 })
    expect(screen.getByText('Completa')).toHaveClass('sm:hidden')
    expect(screen.getByText(/^Completa.+lista de espera$/)).toHaveClass('hidden', 'sm:inline')
  })

  it('«Reservar» y «Lista de espera» miden lo mismo: los dos textos comparten celda y solo se ve el que toca', () => {
    const { unmount } = renderCard(base)
    const [reserve, waitlist] = ['Reservar', 'Lista de espera'].map((text) => screen.getByText(text, { exact: true }))
    expect(reserve.parentElement).toBe(waitlist.parentElement)
    expect(reserve.parentElement).toHaveClass('grid')
    for (const el of [reserve, waitlist]) expect(el).toHaveClass('col-start-1', 'row-start-1')
    expect(reserve).not.toHaveClass('invisible')
    expect(waitlist).toHaveClass('invisible')
    unmount()

    renderCard({ ...base, bookedCount: 12, waitlistCount: 2 })
    expect(screen.getByText('Reservar', { exact: true })).toHaveClass('invisible')
    expect(screen.getByText('Lista de espera', { exact: true })).not.toHaveClass('invisible')
  })

  it('una clase pasada va en versión compacta, sin datos ni enlace', () => {
    renderCard({ ...base, startsAt: EARLIER })
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(screen.queryByText('Marta Ibáñez')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Mat Flow, 07:00, Finalizada/ })).toBeInTheDocument()
  })

  it('una clase cancelada que ya ha pasado también es compacta y dice «Cancelada»', () => {
    renderCard({ ...base, startsAt: EARLIER, status: 'cancelled' })
    expect(screen.queryByText('Marta Ibáñez')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Mat Flow, 07:00, Cancelada/ })).toBeInTheDocument()
  })
})
