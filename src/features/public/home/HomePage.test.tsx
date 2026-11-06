import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '../../../components/ui/index.ts'
import { DataError } from '../../../data/index.ts'
import { testDataSource } from '../../../test/dataSource.ts'
import { HomePage } from './HomePage.tsx'

const renderHome = () =>
  render(
    <MemoryRouter>
      <ToastProvider>
        <HomePage />
      </ToastProvider>
    </MemoryRouter>,
  )

/** Una promesa que no se resuelve nunca: la petición «se queda colgada». */
const never = <T,>() => new Promise<T>(() => {})

afterEach(() => vi.restoreAllMocks())

describe('portada: cargas independientes', () => {
  it('la tarjeta «Próxima clase» y el horario no esperan a los tipos de clase ni al equipo', async () => {
    vi.spyOn(testDataSource, 'listClassTypes').mockImplementation(never)
    vi.spyOn(testDataSource, 'listInstructors').mockImplementation(never)
    renderHome()
    // Llegan las próximas clases aunque el catálogo siga cargando.
    expect(await screen.findByRole('link', { name: /^Reservar\s*\S.* a las/ })).toBeInTheDocument()
    expect(screen.getByText('Cargando las clases…')).toBeInTheDocument()
    expect(screen.getByText('Cargando el equipo…')).toBeInTheDocument()
  })

  it('si falla el catálogo, sus secciones lo dicen y «Reintentar» vuelve a pedirlo', async () => {
    const types = vi.spyOn(testDataSource, 'listClassTypes').mockRejectedValueOnce(new DataError('network'))
    renderHome()
    expect(await screen.findByText('No hemos podido cargar las clases')).toBeInTheDocument()
    expect(screen.getByText('No hemos podido cargar el equipo')).toBeInTheDocument()
    // El horario no se ve afectado: llegan las próximas clases.
    expect(await screen.findByRole('link', { name: /^Reservar\s*\S.* a las/ })).toBeInTheDocument()
    expect(screen.queryByText('No hemos podido cargar el horario')).toBeNull()

    await userEvent.click(screen.getAllByRole('button', { name: 'Reintentar' })[0])
    await vi.waitFor(() => expect(screen.queryByText('No hemos podido cargar las clases')).toBeNull())
    expect(types).toHaveBeenCalledTimes(2)
    expect(screen.queryByText('Cargando las clases…')).toBeNull()
    expect(screen.queryByText('No hemos podido cargar el equipo')).toBeNull()
  })
})
