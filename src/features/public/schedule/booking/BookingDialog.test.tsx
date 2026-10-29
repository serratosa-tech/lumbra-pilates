import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { ToastProvider } from '../../../../components/ui/index.ts'
import { getDataSource, resetDemoData, type ClassSession } from '../../../../data/index.ts'
import { addDays, startOfWeek, studioDate, weekRange } from '../../../../lib/dates.ts'
import { BookingDialog } from './BookingDialog.tsx'

/** Una clase de la semana que viene con plazas libres. */
async function classWithSpots(): Promise<ClassSession> {
  const { from, to } = weekRange(addDays(startOfWeek(studioDate(new Date())), 7))
  const sessions = await getDataSource().listSessions(from, to)
  return sessions.find((s) => s.status === 'scheduled' && s.bookedCount < s.capacity - 1)!
}

function renderDialog(session: ClassSession) {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <BookingDialog classId={session.id} now={new Date()} onClose={() => {}} />
      </ToastProvider>
    </MemoryRouter>,
  )
}

async function fillForm(user: ReturnType<typeof userEvent.setup>, email = 'nora.vidal@correo.example') {
  await user.type(screen.getByLabelText(/Nombre y apellidos/), 'Nora Vidal')
  await user.type(screen.getByLabelText(/^Email/), email)
  await user.type(screen.getByLabelText(/Teléfono/), '612 345 678')
  await user.click(screen.getByLabelText(/política de privacidad/))
}

describe('reserva desde el detalle de una clase', () => {
  beforeEach(async () => {
    await resetDemoData()
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
})
