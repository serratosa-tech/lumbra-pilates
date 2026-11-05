import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '../../components/ui/index.ts'
import { DataError, DEMO_ACCOUNTS, getDataSource, type ClassSession } from '../../data/index.ts'
import { addDays, formatTime, startOfWeek, studioDate, toDateKey, weekRange } from '../../lib/dates.ts'
import { resetTestData } from '../../test/dataSource.ts'
import StudioApp from './StudioApp.tsx'

const { studio: STUDIO } = DEMO_ACCOUNTS

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

/** Lunes de la semana a `weeks` semanas de la actual. */
const mondayIn = (weeks: number) => addDays(startOfWeek(studioDate(new Date())), weeks * 7)

async function sessionsIn(weeks: number): Promise<ClassSession[]> {
  const { from, to } = weekRange(mondayIn(weeks))
  return getDataSource().listSessions(from, to)
}

/** Clase de esa semana que cumple `match` y cuyo nombre y hora no se repiten (para encontrar su fila). */
async function uniqueSession(weeks: number, match: (s: ClassSession) => boolean): Promise<ClassSession> {
  const sessions = await sessionsIn(weeks)
  const key = (s: ClassSession) => `${s.name}|${formatTime(s.startsAt)}`
  const found = sessions.find((s) => match(s) && sessions.filter((o) => key(o) === key(s)).length === 1)
  if (!found) throw new Error('La semilla no tiene la clase que necesita el test')
  return found
}

/** Fila de una clase en la lista de «Clases». */
function rowOf(session: ClassSession): HTMLElement {
  const row = screen
    .getAllByRole('listitem')
    .find(
      (li) =>
        // Tras cancelarla, el título lleva además el distintivo «Cancelada».
        within(li).queryByRole('heading', { level: 3, name: (name) => name.startsWith(session.name) }) &&
        li.textContent?.includes(formatTime(session.startsAt)),
    )
  if (!row) throw new Error(`No se encuentra la fila de ${session.name}`)
  return row
}

describe('páginas del panel', () => {
  beforeEach(async () => {
    await resetTestData()
    await getDataSource().signIn(STUDIO.email, STUDIO.password)
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Resumen', () => {
    it('muestra las métricas de la semana con las clases de hoy', async () => {
      const { from, to } = weekRange(mondayIn(0))
      const metrics = await getDataSource().getMetrics(from, to)
      renderAt('/estudio/resumen')

      const cards = await screen.findByRole('region', { name: 'Métricas de la semana' })
      expect(await within(cards).findByText('Ocupación media')).toBeInTheDocument()
      expect(within(cards).getByText(`${Math.round(metrics.occupancy * 100)} %`)).toBeInTheDocument()
      expect(within(cards).getByText(String(metrics.fullSessions))).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: 'Hoy en el estudio' })).toBeInTheDocument()
    })

    it('una semana sin clases da un estado vacío, no ceros sueltos', async () => {
      const { from, to } = weekRange(mondayIn(0))
      const metrics = await getDataSource().getMetrics(from, to)
      vi.spyOn(getDataSource(), 'getMetrics').mockResolvedValue({ ...metrics, sessions: 0, slots: [] })
      renderAt('/estudio/resumen')
      expect(await screen.findByText('No hay clases esta semana')).toBeInTheDocument()
      expect(screen.getByText('Sin clases programadas esta semana.')).toBeInTheDocument()
    })

    it('si fallan las métricas, avisa y «Reintentar» las carga', async () => {
      const user = userEvent.setup()
      vi.spyOn(getDataSource(), 'getMetrics').mockRejectedValueOnce(new DataError('unavailable'))
      renderAt('/estudio/resumen')
      expect(await screen.findByText('No hemos podido cargar los datos')).toBeInTheDocument()
      expect(screen.getByText('No se han podido cargar las franjas. Usa «Reintentar» arriba.')).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'Reintentar' }))
      expect(await screen.findByText('Ocupación media')).toBeInTheDocument()
    })

    it('las franjas se escriben con dos cifras y guion medio', async () => {
      const { from, to } = weekRange(mondayIn(0))
      const metrics = await getDataSource().getMetrics(from, to)
      vi.spyOn(getDataSource(), 'getMetrics').mockResolvedValue({
        ...metrics,
        slots: [{ fromHour: 7, toHour: 9, sessions: 2, occupancy: 0.5 }],
      })
      renderAt('/estudio/resumen')
      expect((await screen.findAllByText('07–09 h')).length).toBeGreaterThan(0)
    })

    it('«Listas de espera» enseña las próximas clases con gente esperando y enlaza a sus asistentes', async () => {
      // Clases de la semana que viene: todas son futuras, sea cual sea la hora del test.
      const upcoming = (await sessionsIn(1)).filter((s) => s.status === 'scheduled')
      const [full, other] = upcoming
      vi.spyOn(getDataSource(), 'listSessions').mockResolvedValue([
        { ...full, bookedCount: full.capacity, waitlistCount: 3 },
        { ...other, waitlistCount: 0 },
      ])
      renderAt('/estudio/resumen')

      const card = await screen.findByRole('region', { name: 'Listas de espera' })
      const link = await within(card).findByRole('link', { name: `${full.name}: ver asistentes` })
      expect(link).toHaveAttribute('href', `/estudio/asistentes?clase=${full.id}`)
      expect(within(card).getByText('3 en espera')).toBeInTheDocument()
      expect(within(card).queryByRole('link', { name: `${other.name}: ver asistentes` })).not.toBeInTheDocument()
      expect(within(card).getByRole('link', { name: 'Ver todas en Asistentes' })).toHaveAttribute('href', '/estudio/asistentes')
    })

    it('sin nadie esperando, «Listas de espera» lo dice', async () => {
      const upcoming = (await sessionsIn(1)).map((s) => ({ ...s, waitlistCount: 0 }))
      vi.spyOn(getDataSource(), 'listSessions').mockResolvedValue(upcoming)
      renderAt('/estudio/resumen')
      const card = await screen.findByRole('region', { name: 'Listas de espera' })
      expect(await within(card).findByText('Nadie espera plaza esta semana.')).toBeInTheDocument()
    })

    it('si fallan las listas de espera, avisa y «Reintentar» las carga', async () => {
      const user = userEvent.setup()
      const ds = getDataSource()
      const original = ds.listSessions.bind(ds)
      const weekFrom = weekRange(mondayIn(0)).from
      let failed = false
      // Solo falla la primera carga de la semana (la de las esperas), no la de «Hoy».
      vi.spyOn(ds, 'listSessions').mockImplementation((from, to) => {
        if (from === weekFrom && !failed) {
          failed = true
          return Promise.reject(new DataError('unavailable'))
        }
        return original(from, to)
      })
      renderAt('/estudio/resumen')

      const card = await screen.findByRole('region', { name: 'Listas de espera' })
      expect(await within(card).findByText('No hemos podido cargar los datos')).toBeInTheDocument()
      await user.click(within(card).getByRole('button', { name: 'Reintentar' }))
      expect(await within(card).findByRole('link', { name: 'Ver todas en Asistentes' })).toBeInTheDocument()
    })
  })

  describe('Clases', () => {
    const nextWeek = () => `/estudio/clases?semana=${toDateKey(mondayIn(1))}`

    it('crea una clase y aparece en la lista', async () => {
      const user = userEvent.setup()
      renderAt(nextWeek())
      await user.click(await screen.findByRole('button', { name: 'Nueva clase' }))
      const dialog = screen.getByRole('dialog', { name: 'Nueva clase' })
      fireEvent.change(within(dialog).getByLabelText(/Hora de inicio/), { target: { value: '06:30' } })
      await user.click(within(dialog).getByRole('button', { name: 'Crear clase' }))

      expect(await screen.findByText('Clase creada')).toBeInTheDocument()
      expect(screen.queryByRole('dialog', { name: 'Nueva clase' })).not.toBeInTheDocument()
      expect(await screen.findByText('06:30')).toBeInTheDocument()
      expect((await sessionsIn(1)).some((s) => formatTime(s.startsAt) === '06:30')).toBe(true)
    })

    it('cerrar el formulario con Esc no guarda nada', async () => {
      const user = userEvent.setup()
      const createSession = vi.spyOn(getDataSource(), 'createSession')
      renderAt(nextWeek())
      await user.click(await screen.findByRole('button', { name: 'Nueva clase' }))
      const dialog = screen.getByRole('dialog', { name: 'Nueva clase' })
      // jsdom no convierte Esc en el evento «cancel» del <dialog> nativo: se lanza a mano (en Edge se prueba con la tecla).
      dialog.dispatchEvent(new Event('cancel', { cancelable: true }))
      await vi.waitFor(() => expect(screen.queryByRole('dialog', { name: 'Nueva clase' })).not.toBeInTheDocument())
      expect(createSession).not.toHaveBeenCalled()
    })

    it('no deja bajar el aforo por debajo de las confirmadas y muestra el error del servidor', async () => {
      const user = userEvent.setup()
      const session = await uniqueSession(1, (s) => s.status === 'scheduled' && s.bookedCount >= 2)
      const updateSession = vi.spyOn(getDataSource(), 'updateSession')
      renderAt(nextWeek())
      await screen.findAllByText(session.name, { selector: 'h3' })
      await user.click(within(rowOf(session)).getByRole('button', { name: /^Editar/ }))

      const dialog = screen.getByRole('dialog', { name: 'Editar clase' })
      const capacity = within(dialog).getByLabelText(/Aforo/)
      await user.clear(capacity)
      await user.type(capacity, '1')
      await user.click(within(dialog).getByRole('button', { name: 'Guardar cambios' }))
      expect(capacity).toHaveAttribute('aria-invalid', 'true')
      expect(updateSession).not.toHaveBeenCalled()

      // Lo que solo sabe el servidor (por ejemplo, un solape) también se explica.
      updateSession.mockRejectedValueOnce(new DataError('overlap'))
      await user.clear(capacity)
      await user.type(capacity, String(session.capacity))
      await user.click(within(dialog).getByRole('button', { name: 'Guardar cambios' }))
      expect(await within(dialog).findByText('No se ha podido guardar')).toBeInTheDocument()
      expect(within(dialog).getByText('Ya hay otra clase en la sala a esa hora.')).toBeInTheDocument()
    })

    it('cancelar una clase pide confirmación y pasa sus reservas a «cancelada por el estudio»', async () => {
      const user = userEvent.setup()
      const session = await uniqueSession(1, (s) => s.status === 'scheduled' && s.bookedCount > 0)
      renderAt(nextWeek())
      await screen.findAllByText(session.name, { selector: 'h3' })
      await user.click(within(rowOf(session)).getByRole('button', { name: /^Cancelar/ }))
      await user.click(screen.getByRole('button', { name: 'Sí, cancelar la clase' }))

      expect(await screen.findByText('Clase cancelada')).toBeInTheDocument()
      expect(await within(rowOf(session)).findByText('Cancelada')).toBeInTheDocument()
      const roster = await getDataSource().getRoster(session.id)
      expect(roster.confirmed).toHaveLength(0)
      expect(roster.cancelled.length).toBeGreaterThan(0)
      expect(roster.cancelled.every((b) => b.status === 'class_cancelled' || b.status === 'cancelled')).toBe(true)
    })
  })

  describe('Asistentes', () => {
    it('desde la lista de clases se abre el roster de una', async () => {
      const user = userEvent.setup()
      const session = await uniqueSession(1, (s) => s.status === 'scheduled')
      renderAt(`/estudio/asistentes?semana=${toDateKey(mondayIn(1))}`)
      const link = (await screen.findAllByRole('link', { name: new RegExp(session.name) })).find((a) =>
        a.getAttribute('href')?.endsWith(session.id),
      )!
      await user.click(link)
      expect(await screen.findByRole('heading', { level: 1, name: session.name })).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: /Plazas confirmadas/ })).toBeInTheDocument()
    })

    it('marca la asistencia y queda guardada', async () => {
      const user = userEvent.setup()
      const session = await uniqueSession(-1, (s) => s.status === 'scheduled' && s.bookedCount > 0)
      const [first] = (await getDataSource().getRoster(session.id)).confirmed
      renderAt(`/estudio/asistentes?clase=${session.id}`)

      const group = await screen.findByRole('group', { name: `Asistencia de ${first.name}` })
      const attended = within(group).getByRole('button', { name: 'Asistió' })
      const next = attended.getAttribute('aria-pressed') === 'true' ? null : 'attended'
      await user.click(attended)
      expect(attended).toHaveAttribute('aria-pressed', next ? 'true' : 'false')
      const saved = (await getDataSource().getRoster(session.id)).confirmed.find((b) => b.id === first.id)
      expect(saved?.attendance).toBe(next)
    })

    it('añade una reserva manual a la lista de espera y, al cancelar una plaza, sube la primera', async () => {
      const user = userEvent.setup()
      const session = await uniqueSession(1, (s) => s.status === 'scheduled' && s.waitlistCount > 0)
      const roster = await getDataSource().getRoster(session.id)
      renderAt(`/estudio/asistentes?clase=${session.id}`)

      await user.click(await screen.findByRole('button', { name: 'Añadir reserva' }))
      const dialog = screen.getByRole('dialog', { name: 'Añadir reserva' })
      await user.type(within(dialog).getByLabelText(/Nombre y apellidos/), 'Olga Ruiz')
      await user.type(within(dialog).getByLabelText(/^Email/), 'olga.ruiz@correo.example')
      await user.type(within(dialog).getByLabelText(/Teléfono/), '612 345 600')
      await user.click(within(dialog).getByRole('button', { name: 'Añadir a la lista de espera' }))
      expect(await screen.findByText('Añadida a la lista de espera')).toBeInTheDocument()

      const [confirmed] = roster.confirmed
      await user.click(screen.getByRole('button', { name: `Cancelar la reserva de ${confirmed.name}` }))
      await user.click(screen.getByRole('button', { name: 'Sí, cancelar' }))
      expect(await screen.findByText('Reserva cancelada')).toBeInTheDocument()
      expect(screen.getByText(`${roster.waitlist[0].name} ha pasado de la lista de espera a tener plaza.`)).toBeInTheDocument()
    })

    it('si falla la carga, avisa y «Reintentar» la repite; una clase que no existe lo dice', async () => {
      const user = userEvent.setup()
      const session = await uniqueSession(1, (s) => s.status === 'scheduled')
      vi.spyOn(getDataSource(), 'getRoster').mockRejectedValueOnce(new DataError('network'))
      const { unmount } = renderAt(`/estudio/asistentes?clase=${session.id}`)
      expect(await screen.findByText('No hemos podido cargar los asistentes')).toBeInTheDocument()
      expect(screen.getByText(/Sin conexión/)).toBeInTheDocument()
      expect(screen.getByRole('heading', { level: 1, name: 'Asistentes de la clase' })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Todas las clases' })).toHaveAttribute('href', '/estudio/asistentes')
      await user.click(screen.getByRole('button', { name: 'Reintentar' }))
      expect(await screen.findByRole('heading', { level: 1, name: session.name })).toBeInTheDocument()
      unmount()

      renderAt('/estudio/asistentes?clase=no-existe')
      expect(await screen.findByRole('heading', { level: 1, name: 'Esta clase no existe' })).toBeInTheDocument()
    })
  })
})
