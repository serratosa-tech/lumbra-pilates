import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Button, Field, Input, Modal, ToastProvider, useToast } from './index.ts'

describe('Button', () => {
  it('en carga anuncia aria-busy y conserva el texto', () => {
    render(<Button loading>Guardar</Button>)
    const button = screen.getByRole('button', { name: 'Guardar' })
    expect(button).toHaveAttribute('aria-busy', 'true')
  })
})

describe('Field', () => {
  it('asocia etiqueta, ayuda y error al control', () => {
    render(
      <Field label="Email" hint="Te enviaremos el código." error="Email no válido">
        {(props) => <Input {...props} />}
      </Field>,
    )
    const input = screen.getByLabelText('Email')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAccessibleDescription('Te enviaremos el código. Email no válido')
  })
})

function ModalDemo() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button onClick={() => setOpen(true)}>Abrir</Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Confirmar">
        <Button>Aceptar</Button>
      </Modal>
    </>
  )
}

describe('Modal', () => {
  it('atrapa el foco, se cierra con Esc y devuelve el foco', async () => {
    const user = userEvent.setup()
    render(<ModalDemo />)
    const trigger = screen.getByRole('button', { name: 'Abrir' })
    await user.click(trigger)

    const dialog = screen.getByRole('dialog', { name: 'Confirmar' })
    const close = screen.getByRole('button', { name: 'Cerrar' })
    const accept = screen.getByRole('button', { name: 'Aceptar' })
    close.focus()
    await user.tab()
    expect(accept).toHaveFocus()
    await user.tab()
    expect(close).toHaveFocus()

    dialog.dispatchEvent(new Event('cancel', { cancelable: true }))
    await vi.waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(trigger).toHaveFocus()
  })
})

function ToastDemo() {
  const toast = useToast()
  return <Button onClick={() => toast({ title: 'Reserva confirmada' })}>Reservar</Button>
}

describe('Toast', () => {
  it('muestra el aviso y lo retira solo a los 5 segundos', async () => {
    vi.useFakeTimers()
    render(
      <ToastProvider>
        <ToastDemo />
      </ToastProvider>,
    )
    act(() => screen.getByRole('button', { name: 'Reservar' }).click())
    expect(screen.getByText('Reserva confirmada')).toBeInTheDocument()
    act(() => vi.advanceTimersByTime(5000))
    expect(screen.queryByText('Reserva confirmada')).not.toBeInTheDocument()
    vi.useRealTimers()
  })
})
