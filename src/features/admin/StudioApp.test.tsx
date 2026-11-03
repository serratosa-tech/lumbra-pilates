import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '../../components/ui/index.ts'
import { DEMO_ACCOUNTS, getDataSource } from '../../data/index.ts'
import { resetTestData } from '../../test/dataSource.ts'
import StudioApp from './StudioApp.tsx'

const { client: CLIENT, studio: STUDIO } = DEMO_ACCOUNTS

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ToastProvider>
        <Routes>
          <Route path="estudio/*" element={<StudioApp />} />
          <Route path="mis-reservas" element={<h1>Mis reservas</h1>} />
        </Routes>
      </ToastProvider>
    </MemoryRouter>,
  )
}

/** Espía las peticiones de datos del estudio: sin permiso no debe hacerse ninguna. */
function spyStudioRequests() {
  const ds = getDataSource()
  return [
    vi.spyOn(ds, 'getMetrics'),
    vi.spyOn(ds, 'getRoster'),
    vi.spyOn(ds, 'listSessions'),
    vi.spyOn(ds, 'listClassTypes'),
  ]
}

describe('panel del estudio', () => {
  beforeEach(async () => {
    await resetTestData()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('sin sesión, una ruta del panel lleva al acceso sin pintar el panel ni pedir sus datos', async () => {
    const spies = spyStudioRequests()
    renderAt('/estudio/resumen')
    expect(await screen.findByRole('heading', { name: 'Acceso estudio' })).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Panel' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cerrar sesión' })).not.toBeInTheDocument()
    for (const spy of spies) expect(spy).not.toHaveBeenCalled()
  })

  it('con sesión de cliente, avisa sin cerrar la sesión y sin pedir datos del estudio', async () => {
    await getDataSource().signIn(CLIENT.email, CLIENT.password)
    const spies = spyStudioRequests()
    const user = userEvent.setup()
    renderAt('/estudio/resumen')

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Esta cuenta no tiene acceso al panel del estudio' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Panel' })).not.toBeInTheDocument()
    for (const spy of spies) expect(spy).not.toHaveBeenCalled()
    expect(await getDataSource().getAccount()).toMatchObject({ email: CLIENT.email })

    await user.click(screen.getByRole('link', { name: /Ir a Mis reservas/ }))
    expect(await screen.findByRole('heading', { name: 'Mis reservas' })).toBeInTheDocument()
  })

  it('en el acceso, las credenciales de cliente muestran el aviso y mantienen la sesión', async () => {
    const spies = spyStudioRequests()
    const user = userEvent.setup()
    renderAt('/estudio')
    await user.type(await screen.findByLabelText(/^Email/), CLIENT.email)
    await user.type(screen.getByLabelText(/^Contraseña/), CLIENT.password)
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByText('Esta cuenta no tiene acceso al panel del estudio')).toBeInTheDocument()
    for (const spy of spies) expect(spy).not.toHaveBeenCalled()
    expect(await getDataSource().getAccount()).toMatchObject({ role: 'client' })
  })

  it('«Probar como estudio» entra y vuelve a la pantalla pedida', async () => {
    const user = userEvent.setup()
    renderAt('/estudio/clases')
    expect(await screen.findByRole('heading', { name: 'Acceso estudio' })).toBeInTheDocument()
    await user.click(await screen.findByRole('button', { name: 'Probar como estudio' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Clases' })).toBeInTheDocument()
  })

  it('rechaza una contraseña incorrecta sin perder el email', async () => {
    const user = userEvent.setup()
    renderAt('/estudio')
    await user.type(await screen.findByLabelText(/^Email/), STUDIO.email)
    await user.type(screen.getByLabelText(/^Contraseña/), 'otra')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))
    expect(await screen.findByText('El email o la contraseña no son correctos.')).toBeInTheDocument()
    expect(screen.getByLabelText(/^Email/)).toHaveValue(STUDIO.email)
  })

  it('cerrar sesión devuelve al acceso', async () => {
    const user = userEvent.setup()
    await getDataSource().signIn(STUDIO.email, STUDIO.password)
    renderAt('/estudio/resumen')
    await user.click(await screen.findByRole('button', { name: 'Cerrar sesión' }))
    expect(await screen.findByRole('heading', { name: 'Acceso estudio' })).toBeInTheDocument()
  })
})
