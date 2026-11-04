import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '../../../../components/ui/index.ts'
import { DataError, DEMO_ACCOUNTS, getDataSource, type ClassSession } from '../../../../data/index.ts'
import { resetTestData } from '../../../../test/dataSource.ts'
import { addDays, startOfWeek, studioDate, weekRange } from '../../../../lib/dates.ts'
import { BookingDialog } from './BookingDialog.tsx'

/** Una clase de la semana que viene con plazas libres. */
async function classWithSpots(): Promise<ClassSession> {
  const { from, to } = weekRange(addDays(startOfWeek(studioDate(new Date())), 7))
  const sessions = await getDataSource().listSessions(from, to)
  return sessions.find((s) => s.status === 'scheduled' && s.bookedCount < s.capacity - 1)!
}

function renderDialog(session: ClassSession, now = new Date()) {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <BookingDialog classId={session.id} now={now} onClose={() => {}} />
      </ToastProvider>
    </MemoryRouter>,
  )
}

const minutesBefore = (session: ClassSession, minutes: number) =>
  new Date(new Date(session.startsAt).getTime() - minutes * 60_000)

async function fillForm(user: ReturnType<typeof userEvent.setup>, email = 'nora.vidal@correo.example') {
  await user.type(screen.getByLabelText(/Nombre y apellidos/), 'Nora Vidal')
  await user.type(screen.getByLabelText(/^Email/), email)
  await user.type(screen.getByLabelText(/Teléfono/), '612 345 678')
  await user.click(screen.getByLabelText(/política de privacidad/))
}

describe('reserva desde el detalle de una clase', () => {
  beforeEach(async () => {
    await resetTestData()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('valida en vivo sin perder lo escrito', async () => {
    const user = userEvent.setup()
    renderDialog(await classWithSpots())
    await user.click(await screen.findByRole('button', { name: /Reservar plaza/ }))

    expect(screen.getByText('Escribe tu nombre.')).toBeInTheDocument()
    expect(screen.getByLabelText(/Nombre y apellidos/)).toHaveFocus()

    const phone = screen.getByLabelText(/Teléfono/)
    await user.type(phone, '512')
    expect(screen.getByText(/teléfono español de 9 cifras/)).toBeInTheDocument()
    await user.clear(phone)
    await user.type(phone, '612345678')
    expect(screen.queryByText(/teléfono español de 9 cifras/)).not.toBeInTheDocument()
    expect(phone).toHaveValue('612345678')
  })

  it('confirma la plaza con un código y no deja repetir la reserva', async () => {
    const user = userEvent.setup()
    const session = await classWithSpots()
    const first = renderDialog(session)
    await screen.findByRole('button', { name: /Reservar plaza/ })
    await fillForm(user)
    await user.click(screen.getByRole('button', { name: /Reservar plaza/ }))

    const dialog = await screen.findByRole('dialog', { name: '¡Plaza reservada!' })
    expect(within(dialog).getByText(/^LUM-[A-Z2-9]{4}$/)).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: /Añadir al calendario/ })).toBeInTheDocument()
    first.unmount()

    renderDialog(session)
    await screen.findByRole('button', { name: /Reservar plaza/ })
    await fillForm(user, 'NORA.vidal@correo.example')
    await user.click(screen.getByRole('button', { name: /Reservar plaza/ }))
    expect(await screen.findByText('Ya tienes esta clase reservada')).toBeInTheDocument()
    expect(screen.getByLabelText(/Nombre y apellidos/)).toHaveValue('Nora Vidal')
  })

  it('con más de 2 horas de margen no avisa y la confirmación ofrece cancelar hasta 2 horas antes', async () => {
    const user = userEvent.setup()
    const session = await classWithSpots()
    renderDialog(session, minutesBefore(session, 180))
    await screen.findByRole('button', { name: /Reservar plaza/ })
    expect(screen.queryByText('Sin cancelación online')).not.toBeInTheDocument()
    expect(screen.getByText(/Puedes cancelar hasta 2 horas antes/)).toBeInTheDocument()

    await fillForm(user)
    await user.click(screen.getByRole('button', { name: /Reservar plaza/ }))
    const dialog = await screen.findByRole('dialog', { name: '¡Plaza reservada!' })
    expect(within(dialog).getByText(/cancelarla hasta 2 horas antes/)).toBeInTheDocument()
  })

  it('con la cuenta de cliente demo, los datos van rellenados y bloqueados y la reserva queda en la cuenta', async () => {
    const user = userEvent.setup()
    const { email, password, name, phone } = DEMO_ACCOUNTS.client
    await getDataSource().signIn(email, password)
    renderDialog(await classWithSpots())

    const nameInput = await screen.findByLabelText(/Nombre y apellidos/)
    expect(nameInput).toHaveValue(name)
    expect(nameInput).toHaveAttribute('readonly')
    expect(screen.getByLabelText(/^Email/)).toHaveValue(email)
    expect(screen.getByLabelText(/^Email/)).toHaveAttribute('readonly')
    expect(screen.getByLabelText(/Teléfono/)).toHaveValue(phone)
    expect(screen.getByLabelText(/Teléfono/)).toHaveAttribute('readonly')

    await user.click(screen.getByLabelText(/política de privacidad/))
    await user.click(screen.getByRole('button', { name: /Reservar plaza/ }))
    await screen.findByRole('dialog', { name: '¡Plaza reservada!' })
    expect(await getDataSource().listMyBookings()).toHaveLength(1)
  })

  it('con la clase completa, apunta a la lista de espera y da el puesto', async () => {
    const user = userEvent.setup()
    const { from, to } = weekRange(addDays(startOfWeek(studioDate(new Date())), 7))
    const full = (await getDataSource().listSessions(from, to)).find(
      (s) => s.status === 'scheduled' && s.bookedCount >= s.capacity,
    )!
    renderDialog(full)
    expect(await screen.findByText('La clase está completa: apúntate a la lista de espera')).toBeInTheDocument()
    await fillForm(user)
    await user.click(screen.getByRole('button', { name: /Apuntarme a la lista de espera/ }))

    const dialog = await screen.findByRole('dialog', { name: 'Estás en la lista de espera' })
    expect(within(dialog).getByText(`Estás en el puesto ${full.waitlistCount + 1} de la lista de espera.`)).toBeInTheDocument()
  })

  it('sin conexión al reservar, avisa sin perder lo escrito y se puede volver a enviar', async () => {
    const user = userEvent.setup()
    const createBooking = vi.spyOn(getDataSource(), 'createBooking').mockRejectedValueOnce(new DataError('network'))
    renderDialog(await classWithSpots())
    await screen.findByRole('button', { name: /Reservar plaza/ })
    await fillForm(user)
    await user.click(screen.getByRole('button', { name: /Reservar plaza/ }))

    expect(await screen.findByText('No hemos podido completar la reserva')).toBeInTheDocument()
    expect(screen.getByText(/Sin conexión/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Nombre y apellidos/)).toHaveValue('Nora Vidal')
    expect(screen.getByLabelText(/Teléfono/)).toHaveValue('612 345 678')

    await user.click(screen.getByRole('button', { name: /Reservar plaza/ }))
    expect(await screen.findByRole('dialog', { name: '¡Plaza reservada!' })).toBeInTheDocument()
    expect(createBooking).toHaveBeenCalledTimes(2)
  })

  it('si no se puede cargar la clase, avisa y «Reintentar» la vuelve a pedir', async () => {
    const user = userEvent.setup()
    const session = await classWithSpots()
    vi.spyOn(getDataSource(), 'getSession').mockRejectedValueOnce(new DataError('unavailable'))
    renderDialog(session)
    expect(await screen.findByRole('dialog', { name: 'No hemos podido cargar la clase' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByRole('button', { name: /Reservar plaza/ })).toBeInTheDocument()
  })

  it('una clase que ya no existe muestra «Clase no encontrada»', async () => {
    const session = await classWithSpots()
    renderDialog({ ...session, id: 'no-existe' })
    expect(await screen.findByRole('dialog', { name: 'Clase no encontrada' })).toBeInTheDocument()
    expect(screen.getByText('Esta clase ya no está en el horario')).toBeInTheDocument()
  })

  it('si la clase empieza en menos de 2 horas, avisa antes de reservar y no promete cancelar', async () => {
    const user = userEvent.setup()
    const session = await classWithSpots()
    renderDialog(session, minutesBefore(session, 90))
    await screen.findByRole('button', { name: /Reservar plaza/ })

    expect(screen.getByText('Sin cancelación online')).toBeInTheDocument()
    expect(
      screen.getByText(/Esta clase empieza en menos de 2 horas: una vez reservada no podrás cancelarla online/),
    ).toBeInTheDocument()
    expect(screen.queryByText(/Puedes cancelar hasta/)).not.toBeInTheDocument()

    await fillForm(user)
    await user.click(screen.getByRole('button', { name: /Reservar plaza/ }))
    const dialog = await screen.findByRole('dialog', { name: '¡Plaza reservada!' })
    expect(within(dialog).getByText(/ya no se puede cancelar online/)).toBeInTheDocument()
    expect(within(dialog).queryByText(/cancelarla hasta/)).not.toBeInTheDocument()
  })
})
