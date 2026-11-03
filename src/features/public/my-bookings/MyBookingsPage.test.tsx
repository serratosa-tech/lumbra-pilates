import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { ToastProvider } from '../../../components/ui/index.ts'
import { DEMO_EXAMPLES, getDataSource, type BookingDetails } from '../../../data/index.ts'
import { resetTestData } from '../../../test/dataSource.ts'
import { formatDateTimeRange } from '../../../lib/dates.ts'
import { capitalize } from '../../../lib/text.ts'
import { BookingResult } from './BookingResult.tsx'
import { MyBookingsPage } from './MyBookingsPage.tsx'

function renderPage() {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <MyBookingsPage />
      </ToastProvider>
    </MemoryRouter>,
  )
}

/** La reserva encontrada, vista en un momento concreto. */
function renderResult(details: BookingDetails, now: Date) {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <BookingResult details={details} now={now} />
      </ToastProvider>
    </MemoryRouter>,
  )
}

describe('Mis reservas', () => {
  beforeEach(async () => {
    await resetTestData()
  })

  it('pide un código con formato válido antes de buscar', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.type(screen.getByLabelText(/^Email/), 'ana@correo.example')
    await user.type(screen.getByLabelText(/Código de reserva/), 'ABC')
    await user.click(screen.getByRole('button', { name: 'Consultar reserva' }))
    const code = screen.getByLabelText(/Código de reserva/)
    expect(code).toHaveAccessibleDescription(/El código tiene la forma LUM-XXXX/)
    expect(code).toHaveAttribute('placeholder', 'LUM-XXXX')
    expect(code).toHaveFocus()
  })

  it('avisa si no hay ninguna reserva con esos datos', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.type(screen.getByLabelText(/^Email/), 'nadie@correo.example')
    await user.type(screen.getByLabelText(/Código de reserva/), 'lum7k3q')
    await user.click(screen.getByRole('button', { name: 'Consultar reserva' }))
    expect(await screen.findByText('No encontramos ninguna reserva')).toBeInTheDocument()
  })

  it('cancela una plaza confirmada y sube a la primera persona de la lista de espera', async () => {
    const user = userEvent.setup()
    const [confirmed] = DEMO_EXAMPLES
    const before = await getDataSource().findBooking(confirmed.email, confirmed.code)
    expect(before?.session.waitlistCount).toBe(1)

    renderPage()
    await user.click(screen.getByRole('button', { name: /Plaza confirmada/ }))
    expect(await screen.findByText('Tu plaza está confirmada')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Cancelar reserva' }))
    await user.click(screen.getByRole('button', { name: 'Sí, cancelar' }))
    expect(await screen.findByText('Cancelaste esta reserva')).toBeInTheDocument()
    expect(screen.getByText(/Tu plaza ha pasado a la primera persona/)).toBeInTheDocument()

    const after = await getDataSource().findBooking(confirmed.email, confirmed.code)
    expect(after?.session).toMatchObject({ waitlistCount: 0, bookedCount: before?.session.bookedCount })
  })

  it('muestra la fecha con la franja horaria una sola vez y sin coma tras el día de la semana', async () => {
    const [confirmed] = DEMO_EXAMPLES
    const details = (await getDataSource().findBooking(confirmed.email, confirmed.code))!
    const { startsAt, durationMinutes } = details.session
    renderResult(details, new Date(new Date(startsAt).getTime() - 24 * 60 * 60_000))
    const when = capitalize(formatDateTimeRange(startsAt, durationMinutes))
    expect(when).toMatch(/^[A-Z][a-zé]+ \d{1,2} de [a-z]+\s·\s\d\d:\d\d–\d\d:\d\d$/)
    expect(screen.getByText(when)).toBeInTheDocument()
  })

  it('pasado el plazo de 2 horas no ofrece cancelar ni dice hasta cuándo se puede', async () => {
    const [confirmed] = DEMO_EXAMPLES
    const details = (await getDataSource().findBooking(confirmed.email, confirmed.code))!
    renderResult(details, new Date(new Date(details.session.startsAt).getTime() - 90 * 60_000))
    expect(screen.getByText('Ya no se puede cancelar online')).toBeInTheDocument()
    expect(screen.queryByText(/Puedes cancelar/)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cancelar reserva' })).not.toBeInTheDocument()
  })

  it('muestra la posición en la lista de espera', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: /En lista de espera/ }))
    expect(await screen.findByText('Estás en el puesto 2 de la lista de espera')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Salir de la lista de espera' })).toBeInTheDocument()
  })
})
