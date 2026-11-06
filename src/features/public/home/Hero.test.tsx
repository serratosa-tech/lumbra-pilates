import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { ToastProvider } from '../../../components/ui/index.ts'
import type { ClassSession } from '../../../data/index.ts'
import { Hero } from './Hero.tsx'
import type { DayRelation } from './upcoming.ts'
import type { HomeData, HomeState } from './useHomeData.ts'

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
const data = (sessions: ClassSession[], relation: DayRelation = 'hoy'): HomeData => ({
  classTypes: [],
  instructors: [],
  upcoming: sessions.length ? [{ relation, sessions }] : [],
})
const LOADING: HomeState = { status: 'loading' }
const ready = (sessions: ClassSession[], relation?: DayRelation): HomeState => ({ status: 'ready', data: data(sessions, relation) })

const page = (state: HomeState) => (
  <MemoryRouter>
    <ToastProvider>
      <Hero state={state} />
    </ToastProvider>
  </MemoryRouter>
)

function renderHero(state: HomeState) {
  const view = render(page(state))
  return { ...view, rerender: (next: HomeState) => view.rerender(page(next)) }
}

// jsdom no cuenta el espacio inicial del texto oculto («ReservarMat Flow…»); el navegador, sí.
const reserveLink = () => screen.queryByRole('link', { name: /^Reservar\s*Mat Flow a las/ })
/**
 * Fin de una animación CSS. jsdom no tiene AnimationEvent y React escucha allí «webkitAnimationEnd»
 * (en el navegador, «animationend»): se envían los dos.
 */
const endAnimation = (element: Element) => {
  fireEvent(element, new Event('webkitAnimationEnd', { bubbles: true }))
  fireEvent(element, new Event('animationend', { bubbles: true }))
}
/** La caja de la tarjeta (borde, sombra): la que se desvanece al retirarse. */
const cardBox = () => screen.getByText('Cargando la próxima clase…').closest('.rounded-lg') as HTMLElement

describe('tarjeta «Próxima clase» del héroe', () => {
  it('mientras carga, anuncia la carga y el texto de ejemplo del esqueleto no se lee', () => {
    renderHero(LOADING)
    expect(screen.getByRole('status')).toHaveTextContent('Cargando la próxima clase…')
    // El texto de ejemplo está dentro de aria-hidden: no llega a los lectores de pantalla.
    expect(screen.getByText('Reformer Esencial').closest('[aria-hidden="true"]')).not.toBeNull()
    expect(screen.queryByRole('link', { name: /^Reservar\s*\S+.* a las/ })).toBeNull()
  })

  it('con datos, el contenido sustituye al esqueleto con un fundido y en la misma caja', () => {
    const { rerender } = renderHero(LOADING)
    const box = cardBox()
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

  it('el esqueleto se ve desde el primer pintado: ni la caja ni su envoltorio tienen animación de entrada', () => {
    renderHero(LOADING)
    const box = cardBox()
    expect(box.className).not.toMatch(/animate-/)
    expect(box.parentElement!.className).not.toMatch(/animate-/)
  })

  it('con la clase llena, la insignia dice solo «Completa»', () => {
    renderHero(ready([{ ...session, bookedCount: 12 }]))
    expect(screen.getByText('Completa')).toBeInTheDocument()
    expect(screen.queryByText(/lista de espera/)).toBeNull()
  })

  it('un refresco con otra clase no vuelve a montar el contenido (no repite el fundido)', () => {
    const { rerender } = renderHero(ready([session]))
    const reveal = reserveLink()!.closest('.animate-reveal')
    rerender(ready([{ ...session, bookedCount: 11 }]))
    expect(reserveLink()!.closest('.animate-reveal')).toBe(reveal)
  })

  it.each([
    ['si falla', { status: 'error', error: new Error('red') } as HomeState],
    ['si no quedan clases', ready([])],
  ])('%s, el esqueleto se desvanece y después se retira', (_, end) => {
    const { rerender } = renderHero(LOADING)
    const box = cardBox()
    rerender(end)
    expect(box).toHaveClass('animate-fade-out')
    expect(box).toBeInTheDocument()
    endAnimation(box)
    expect(box).not.toBeInTheDocument()
    expect(screen.queryByText('Cargando la próxima clase…')).toBeNull()
  })

  it('si deja de haber clases tras mostrar una, se desvanece la que se veía', () => {
    const { rerender } = renderHero(ready([session]))
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
