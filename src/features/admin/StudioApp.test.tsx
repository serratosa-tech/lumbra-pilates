import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { ToastProvider } from '../../components/ui/index.ts'
import { DEMO_ACCOUNTS, getDataSource } from '../../data/index.ts'

const DEMO_CREDENTIALS = DEMO_ACCOUNTS.studio
import StudioApp from './StudioApp.tsx'

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ToastProvider>
        <Routes>
          <Route path="estudio/*" element={<StudioApp />} />
        </Routes>
      </ToastProvider>
    </MemoryRouter>,
  )
}

describe('panel del estudio', () => {
  beforeEach(async () => {
    await getDataSource().signOut()
  })

  it('sin sesión lleva al login y, al entrar, vuelve a la pantalla pedida', async () => {
    const user = userEvent.setup()
    renderAt('/estudio/clases')
    expect(await screen.findByRole('heading', { name: 'Acceso estudio' })).toBeInTheDocument()

    await user.click(await screen.findByRole('button', { name: 'Entrar con la cuenta demo' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Clases' })).toBeInTheDocument()
  })

  it('rechaza una contraseña incorrecta sin perder el email', async () => {
    const user = userEvent.setup()
    renderAt('/estudio')
    await user.type(await screen.findByLabelText(/^Email/), DEMO_CREDENTIALS.email)
    await user.type(screen.getByLabelText(/^Contraseña/), 'otra')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))
    expect(await screen.findByText('El email o la contraseña no son correctos.')).toBeInTheDocument()
    expect(screen.getByLabelText(/^Email/)).toHaveValue(DEMO_CREDENTIALS.email)
  })

  it('cerrar sesión devuelve al login', async () => {
    const user = userEvent.setup()
    await getDataSource().signIn(DEMO_CREDENTIALS.email, DEMO_CREDENTIALS.password)
    renderAt('/estudio/resumen')
    await user.click(await screen.findByRole('button', { name: 'Cerrar sesión' }))
    expect(await screen.findByRole('heading', { name: 'Acceso estudio' })).toBeInTheDocument()
  })
})
