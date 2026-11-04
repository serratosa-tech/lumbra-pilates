import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '../../../components/ui/index.ts'
import { DataError, DEMO_ACCOUNTS, DEMO_EXAMPLES, getDataSource, type BookingDetails } from '../../../data/index.ts'
import { resetTestData } from '../../../test/dataSource.ts'
import { addDays, formatDateTimeRange, startOfWeek, studioDate, weekRange } from '../../../lib/dates.ts'
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
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('«Probar como cliente» entra y muestra las reservas de la cuenta, sin opciones de cuenta', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(await screen.findByRole('button', { name: 'Probar como cliente' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Tus reservas' })).toBeInTheDocument()
    expect(screen.getByText(DEMO_ACCOUNTS.client.name)).toBeInTheDocument()
    expect(await screen.findByText('Aún no tienes reservas')).toBeInTheDocument()
    expect(screen.queryByText(/contraseña/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Probar como cliente' })).not.toBeInTheDocument()
  })

  it('con sesión de cliente, lista sus reservas y cancela con la cuenta', async () => {
    const user = userEvent.setup()
    const ds = getDataSource()
    const { from, to } = weekRange(addDays(startOfWeek(studioDate(new Date())), 7))
    const next = (await ds.listSessions(from, to)).find((s) => s.status === 'scheduled' && s.bookedCount < s.capacity)!
    await ds.signIn(DEMO_ACCOUNTS.client.email, DEMO_ACCOUNTS.client.password)
    await ds.createBooking({ sessionId: next.id, name: 'x', email: 'x@y.example', phone: '612345678' })

    renderPage()
    expect(await screen.findByRole('heading', { level: 2, name: 'Próximas' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: next.name })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Cancelar reserva' }))
    await user.click(screen.getByRole('button', { name: 'Sí, cancelar' }))
    expect(await screen.findByRole('heading', { level: 2, name: 'Pasadas y canceladas' })).toBeInTheDocument()
    expect(screen.getByText('Cancelaste esta reserva')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Cerrar sesión' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Consulta o cancela tu reserva' })).toBeInTheDocument()
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

  async function searchExample(user: ReturnType<typeof userEvent.setup>) {
    const [confirmed] = DEMO_EXAMPLES
    await user.type(screen.getByLabelText(/^Email/), confirmed.email)
    await user.type(screen.getByLabelText(/Código de reserva/), confirmed.code)
    await user.click(screen.getByRole('button', { name: 'Consultar reserva' }))
  }

  it('con demasiados intentos lo dice claro, sin culpar a la conexión', async () => {
    const user = userEvent.setup()
    vi.spyOn(getDataSource(), 'findBooking').mockRejectedValue(new DataError('too_many_attempts'))
    renderPage()
    await searchExample(user)
    expect(await screen.findByText('No hemos podido consultar tu reserva')).toBeInTheDocument()
    expect(screen.getByText(/Demasiados intentos/)).toBeInTheDocument()
    expect(screen.queryByText(/Comprueba tu conexión/)).not.toBeInTheDocument()
  })

  it('sin conexión avisa y «Reintentar» vuelve a buscar sin reescribir nada', async () => {
    const user = userEvent.setup()
    vi.spyOn(getDataSource(), 'findBooking').mockRejectedValueOnce(new DataError('network'))
    renderPage()
    await searchExample(user)
    expect(await screen.findByText(/Sin conexión/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByText('Tu plaza está confirmada')).toBeInTheDocument()
  })

  it('si falla la cancelación, avisa y la reserva sigue igual', async () => {
    const user = userEvent.setup()
    vi.spyOn(getDataSource(), 'cancelBooking').mockRejectedValueOnce(new DataError('too_late'))
    renderPage()
    await user.click(screen.getByRole('button', { name: /Plaza confirmada/ }))
    await user.click(await screen.findByRole('button', { name: 'Cancelar reserva' }))
    await user.click(screen.getByRole('button', { name: 'Sí, cancelar' }))
    expect(await screen.findByText('No se ha podido cancelar')).toBeInTheDocument()
    expect(screen.getByText('Tu plaza está confirmada')).toBeInTheDocument()
  })

  it('sale de la lista de espera sin subir a nadie', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: /En lista de espera/ }))
    await user.click(await screen.findByRole('button', { name: 'Salir de la lista de espera' }))
    expect(screen.getByRole('dialog', { name: '¿Salir de la lista de espera?' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Salir de la lista' }))
    expect(await screen.findByText('Cancelaste esta reserva')).toBeInTheDocument()
    expect(screen.queryByText(/ha pasado a la primera persona/)).not.toBeInTheDocument()
  })

  it('si no se cargan las reservas de la cuenta, avisa y se puede reintentar', async () => {
    const user = userEvent.setup()
    await getDataSource().signIn(DEMO_ACCOUNTS.client.email, DEMO_ACCOUNTS.client.password)
    vi.spyOn(getDataSource(), 'listMyBookings').mockRejectedValueOnce(new DataError('unavailable'))
    renderPage()
    expect(await screen.findByText('No hemos podido cargar tus reservas')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByText('Aún no tienes reservas')).toBeInTheDocument()
  })

  it('muestra la posición en la lista de espera', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: /En lista de espera/ }))
    expect(await screen.findByText('Estás en el puesto 2 de la lista de espera')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Salir de la lista de espera' })).toBeInTheDocument()
  })
})
