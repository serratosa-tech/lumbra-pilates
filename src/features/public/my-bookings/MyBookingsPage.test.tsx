import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { ToastProvider } from '../../../components/ui/index.ts'
import { DEMO_EXAMPLES, getDataSource, resetDemoData } from '../../../data/index.ts'
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

describe('Mis reservas', () => {
  beforeEach(async () => {
    await resetDemoData()
  })

  it('pide un código con formato válido antes de buscar', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.type(screen.getByLabelText(/^Email/), 'ana@correo.example')
    await user.type(screen.getByLabelText(/Código de reserva/), 'ABC')
    await user.click(screen.getByRole('button', { name: 'Consultar reserva' }))
    expect(screen.getByText(/El código tiene la forma LUM-7K3Q/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Código de reserva/)).toHaveFocus()
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

  it('muestra la posición en la lista de espera', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: /En lista de espera/ }))
    expect(await screen.findByText('Estás en el puesto 2 de la lista de espera')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Salir de la lista de espera' })).toBeInTheDocument()
  })
})
