import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Pencil, UsersRound } from 'lucide-react'
import { useState } from 'react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { ActionMenu, Button, Field, Input, Modal, ToastProvider, useToast } from './index.ts'

describe('ActionMenu', () => {
  it('se maneja con teclado, ejecuta la acción y devuelve el foco', async () => {
    const user = userEvent.setup()
    const onEdit = vi.fn()
    render(
      <MemoryRouter>
        <ActionMenu
          label="Acciones de Mat Flow"
          items={[
            { label: 'Asistentes', icon: UsersRound, to: '/estudio/asistentes' },
            { label: 'Editar', icon: Pencil, onSelect: onEdit },
          ]}
        />
      </MemoryRouter>,
    )
    const trigger = screen.getByRole('button', { name: 'Acciones de Mat Flow' })
    trigger.focus()
    await user.keyboard('{ArrowDown}')
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('menuitem', { name: 'Asistentes' })).toHaveFocus()

    await user.keyboard('{ArrowDown}{ArrowDown}')
    expect(screen.getByRole('menuitem', { name: 'Asistentes' })).toHaveFocus()
    await user.keyboard('{End}{Enter}')
    expect(onEdit).toHaveBeenCalledOnce()
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()

    await user.click(trigger)
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })
})

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
