import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { ToastProvider } from '../../../components/ui/index.ts'
import type { ClassSession } from '../../../data/index.ts'
import { Hero } from './Hero.tsx'
import type { DayRelation, UpcomingDay } from './upcoming.ts'
import type { UpcomingState } from './useHomeData.ts'

const session: ClassSession = {
  id: 's1',
  classTypeId: 'mat-flow',
  instructorId: 'marta',
  name: 'Mat Flow',
  instructor: 'Marta Ibáñez',
  level: 'todos',
  startsAt: '2099-11-02T17:00:00.000Z',
  durationMinutes: 55,
  capacity: 12,
  bookedCount: 4,
  waitlistCount: 0,
  status: 'scheduled',
}
const data = (sessions: ClassSession[], relation: DayRelation = 'hoy'): UpcomingDay[] => (sessions.length ? [{ relation, sessions }] : [])
const LOADING: UpcomingState = { status: 'loading' }
const ready = (sessions: ClassSession[], relation?: DayRelation): UpcomingState => ({ status: 'ready', data: data(sessions, relation) })

const page = (state: UpcomingState) => (
  <MemoryRouter>
    <ToastProvider>
      <Hero state={state} />
    </ToastProvider>
  </MemoryRouter>
)

function renderHero(state: UpcomingState) {
  const view = render(page(state))
  return { ...view, rerender: (next: UpcomingState) => view.rerender(page(next)) }
}

// jsdom no cuenta el espacio inicial del texto oculto («ReservarMat Flow…»); el navegador, sí.
const reserveLink = () => screen.queryByRole('link', { name: /^Reservar\s*Mat Flow a las/ })
/**
 * Inicio y fin de una animación CSS. jsdom no tiene AnimationEvent y React escucha allí
 * «webkitAnimationStart/End» (en el navegador, «animationstart/end»): se envían los dos.
 */
const startAnimation = (element: Element) => {
  fireEvent(element, new Event('webkitAnimationStart', { bubbles: true }))
  fireEvent(element, new Event('animationstart', { bubbles: true }))
}
const endAnimation = (element: Element) => {
  fireEvent(element, new Event('webkitAnimationEnd', { bubbles: true }))
  fireEvent(element, new Event('animationend', { bubbles: true }))
}
/** La caja de la tarjeta (borde, sombra): la que entra con el héroe y se desvanece al retirarse. */
const cardBox = () => screen.getByText('Cargando la próxima clase…').closest('.rounded-lg') as HTMLElement
/** Completa la entrada de la caja (su paso de hero-step). */
const enter = (box: Element) => {
  startAnimation(box)
  endAnimation(box)
}

describe('tarjeta «Próxima clase» del héroe', () => {
  it('mientras carga, anuncia la carga y el texto de ejemplo del esqueleto no se lee', () => {
    renderHero(LOADING)
    expect(screen.getByRole('status')).toHaveTextContent('Cargando la próxima clase…')
    // El texto de ejemplo está dentro de aria-hidden: no llega a los lectores de pantalla.
    expect(screen.getByText('Reformer Esencial').closest('[aria-hidden="true"]')).not.toBeNull()
    expect(screen.queryByRole('link', { name: /^Reservar\s*\S+.* a las/ })).toBeNull()
  })

  it('con datos tras la entrada, el contenido sustituye al esqueleto con un fundido y en la misma caja', () => {
    const { rerender } = renderHero(LOADING)
    const box = cardBox()
    enter(box)
    rerender(ready([session]))
    expect(screen.queryByText('Cargando la próxima clase…')).toBeNull()
    const link = reserveLink()
    expect(link).not.toBeNull()
    expect(link!.closest('.animate-reveal')).not.toBeNull()
    expect(link!.closest('.rounded-lg')).toBe(box)
  })

  it.each([
    ['hoy', /^Próxima clase hoy$/],
    ['manana', /^Próxima clase mañana$/],
    // 2 de noviembre de 2099: solo el día de la semana y el número, sin mes (cabe en una línea).
    ['otro', /^Próxima clase el \p{L}+ 2$/u],
  ] as const)('la etiqueta es corta para caber en una línea (%s)', (relation, label) => {
    renderHero(ready([session], relation))
    expect(screen.getByText(label)).toBeInTheDocument()
  })

  it('la caja, con el esqueleto dentro, es el último paso de la entrada del héroe', () => {
    const { container } = renderHero(LOADING)
    const steps = [...container.querySelectorAll('.hero-step')].map((el) => Number(/\[--step:(\d+)\]/.exec(el.className)?.[1]))
    expect(steps).toEqual(steps.map((_, index) => index))
    expect(container.querySelectorAll('.hero-step')[steps.length - 1]).toBe(cardBox())
    expect(container.querySelector('.animate-rise')).toBeNull()
  })

  it('si los datos llegan antes de que la caja se vea, el contenido entra con ella, sin fundido propio', () => {
    const { rerender } = renderHero(LOADING)
    const box = cardBox()
    rerender(ready([session]))
    expect(reserveLink()!.closest('.rounded-lg')).toBe(box)
    expect(reserveLink()!.closest('.animate-reveal')).toBeNull()
    enter(box)
    expect(reserveLink()!.closest('.animate-reveal')).toBeNull()
  })

  it('si los datos llegan mientras la caja entra, el esqueleto sigue hasta el final y luego se funde el contenido', () => {
    const { rerender } = renderHero(LOADING)
    const box = cardBox()
    startAnimation(box)
    rerender(ready([session]))
    expect(reserveLink()).toBeNull()
    expect(screen.getByText('Cargando la próxima clase…')).toBeInTheDocument()
    endAnimation(box)
    expect(reserveLink()!.closest('.animate-reveal')).not.toBeNull()
    expect(reserveLink()!.closest('.rounded-lg')).toBe(box)
  })

  it('si falla antes de que la caja se vea, se retira sin fundido', () => {
    const { rerender, container } = renderHero(LOADING)
    rerender({ status: 'error', error: new Error('red') })
    expect(container.querySelector('.animate-fade-out')).toBeNull()
    expect(screen.queryByText('Cargando la próxima clase…')).toBeNull()
  })

  it('si falla mientras la caja entra, termina la entrada y después se desvanece', () => {
    const { rerender } = renderHero(LOADING)
    const box = cardBox()
    startAnimation(box)
    rerender({ status: 'error', error: new Error('red') })
    expect(box).toHaveClass('hero-step')
    endAnimation(box)
    expect(box).toHaveClass('animate-fade-out')
    expect(box).not.toHaveClass('hero-step')
    endAnimation(box)
    expect(box).not.toBeInTheDocument()
  })

  it('con la clase llena, la insignia dice solo «Completa»', () => {
    renderHero(ready([{ ...session, bookedCount: 12 }]))
    expect(screen.getByText('Completa')).toBeInTheDocument()
    expect(screen.queryByText(/lista de espera/)).toBeNull()
  })

  it('un refresco con otra clase no vuelve a montar el contenido (no repite el fundido)', () => {
    const { rerender } = renderHero(LOADING)
    enter(cardBox())
    rerender(ready([session]))
    const reveal = reserveLink()!.closest('.animate-reveal')
    expect(reveal).not.toBeNull()
    rerender(ready([{ ...session, bookedCount: 11 }]))
    expect(reserveLink()!.closest('.animate-reveal')).toBe(reveal)
  })

  it.each([
    ['si falla', { status: 'error', error: new Error('red') } as UpcomingState],
    ['si no quedan clases', ready([])],
  ])('%s, el esqueleto se desvanece y después se retira', (_, end) => {
    const { rerender } = renderHero(LOADING)
    const box = cardBox()
    enter(box)
    rerender(end)
    expect(box).toHaveClass('animate-fade-out')
    expect(box).toBeInTheDocument()
    endAnimation(box)
    expect(box).not.toBeInTheDocument()
    expect(screen.queryByText('Cargando la próxima clase…')).toBeNull()
  })

  it('si deja de haber clases tras mostrar una, se desvanece la que se veía', () => {
    const { rerender } = renderHero(LOADING)
    enter(cardBox())
    rerender(ready([session]))
    const box = reserveLink()!.closest('.rounded-lg') as HTMLElement
    rerender(ready([]))
    expect(box).toHaveClass('animate-fade-out')
    expect(reserveLink()).not.toBeNull()
    // El fin del fundido del contenido (un hijo) no retira la tarjeta: solo el de la caja.
    endAnimation(reserveLink()!.closest('.animate-reveal')!)
    expect(box).toBeInTheDocument()
    endAnimation(box)
    expect(reserveLink()).toBeNull()
  })
})
