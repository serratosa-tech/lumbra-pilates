import { Ban, CalendarPlus, CalendarX2, Pencil, RotateCcw, UsersRound } from 'lucide-react'
import { useState } from 'react'
import { plural, spotsStatus } from '../../../components/schedule/labels.ts'
import { SpotsMeter } from '../../../components/schedule/SpotsMeter.tsx'
import { Seo } from '../../../components/Seo.tsx'
import {
  ActionMenu,
  Alert,
  Badge,
  Button,
  ButtonLink,
  EmptyState,
  Modal,
  Skeleton,
  useToast,
} from '../../../components/ui/index.ts'
import { errorMessage, getDataSource, hasEnded, type ClassSession } from '../../../data/index.ts'
import {
  addDays,
  formatDate,
  formatDateTime,
  formatTime,
  formatTimeRange,
  isSameDate,
  studioDate,
} from '../../../lib/dates.ts'
import { capitalize, SEP } from '../../../lib/text.ts'
import { useAsyncData } from '../../../lib/useAsyncData.ts'
import { useNow } from '../../../lib/useNow.ts'
import { PanelHeader } from '../PanelHeader.tsx'
import { groupByDay, useScrollToToday, useStudioWeek } from '../useStudioWeek.ts'
import { SessionFormDialog } from './SessionFormDialog.tsx'

function CancelSummary({ session }: { session: ClassSession }) {
  const affected = session.bookedCount + session.waitlistCount
  return (
    <p className="text-tinta-700">
      {session.name}, {formatDateTime(session.startsAt)}.{' '}
      {affected === 0
        ? 'No tiene reservas.'
        : affected === 1
          ? 'Su única reserva pasará a «cancelada por el estudio».'
          : `Sus ${affected} reservas (plazas y lista de espera) pasarán a «cancelada por el estudio».`}{' '}
      No se puede deshacer.
    </p>
  )
}

type Editing ={ mode: 'create' } | { mode: 'edit'; session: ClassSession } | null

function SessionRow({
  session,
  now,
  onEdit,
  onCancel,
}: {
  session: ClassSession
  now: Date
  onEdit: () => void
  onCancel: () => void
}) {
  const { state } = spotsStatus(session, now)
  const editable = state !== 'past' && state !== 'cancelled'
  const ended = hasEnded(session, now)
  const attendeesLink = `/estudio/asistentes?clase=${session.id}`
  return (
    // En móvil las acciones van en un menú de tres puntos, arriba a la derecha y a la altura de la hora.
    // Con el texto muy grande (la lista, con `@container`, mide menos de 12 rem), el menú entra en el flujo junto
    // a la hora y los datos bajan a ancho completo, sin reservar el hueco del menú.
    <li className="relative flex flex-wrap items-start gap-x-5 gap-y-3 py-4 pr-12 md:pr-0 @max-[12rem]:pr-0">
      <p className="w-[5ch] shrink-0 text-2xl font-light leading-none tabular-nums">
        {formatTime(session.startsAt)}
      </p>
      <div className="min-w-[min(12rem,100%)] flex-1 @max-[12rem]:order-last @max-[12rem]:basis-full">
        <h3 className="flex flex-wrap items-center gap-2 text-base font-medium">
          {session.name}
          {state === 'cancelled' && <Badge tone="error">Cancelada</Badge>}
        </h3>
        <p className="text-sm text-piedra">
          {session.instructor}
          {SEP}
          {formatTimeRange(session.startsAt, session.durationMinutes)}
        </p>
        <p className="mt-1 text-sm text-tinta-700">
          {session.bookedCount} de {session.capacity} plazas
          {/* Como en Asistentes: terminada la clase, nadie sigue esperando plaza. */}
          {!ended && session.waitlistCount > 0 && `${SEP}${session.waitlistCount} en espera`}
        </p>
        {state !== 'cancelled' && <SpotsMeter session={session} now={now} className="mt-2" />}
      </div>
      <div className="absolute top-1.5 right-0 md:hidden @max-[12rem]:static @max-[12rem]:ml-auto">
        <ActionMenu
          label={`Acciones de ${session.name}, ${formatTime(session.startsAt)}`}
          items={[
            { label: 'Asistentes', icon: UsersRound, to: attendeesLink },
            ...(editable
              ? [
                  { label: 'Editar', icon: Pencil, onSelect: onEdit },
                  { label: 'Cancelar clase', icon: Ban, onSelect: onCancel },
                ]
              : []),
          ]}
        />
      </div>
      <div className="hidden max-w-full flex-wrap gap-1 md:flex md:justify-end">
        <ButtonLink
          to={attendeesLink}
          variant="ghost"
          icon={<UsersRound aria-hidden="true" strokeWidth={1.75} className="size-4" />}
        >
          Asistentes<span className="sr-only">: {session.name}</span>
        </ButtonLink>
        {editable && (
          <>
            <Button variant="ghost" onClick={onEdit} icon={<Pencil aria-hidden="true" strokeWidth={1.75} className="size-4" />}>
              Editar<span className="sr-only"> {session.name}</span>
            </Button>
            <Button variant="ghost" onClick={onCancel} icon={<Ban aria-hidden="true" strokeWidth={1.75} className="size-4" />}>
              Cancelar<span className="sr-only"> {session.name}</span>
            </Button>
          </>
        )}
      </div>
    </li>
  )
}

export function SessionsPage() {
  const now = useNow()
  const toast = useToast()
  const week = useStudioWeek(now)
  const [editing, setEditing] = useState<Editing>(null)
  const [cancelling, setCancelling] = useState<ClassSession | null>(null)
  const [busy, setBusy] = useState(false)

  const { state, retry } = useAsyncData(`panel-clases:${week.weekKey}`, async (ds) => {
    const [sessions, classTypes, instructors] = await Promise.all([
      ds.listSessions(week.range.from, week.range.to),
      ds.listClassTypes(),
      ds.listInstructors(),
    ])
    return { sessions, classTypes, instructors }
  })
  const data = state.status === 'ready' ? state.data : undefined
  const today = studioDate(now)
  // Al crear, la fecha propuesta es mañana si estamos en la semana actual; si no, el lunes de esa semana.
  const defaultDate = week.isCurrent ? addDays(today, 1) : week.monday
  const hasToday = Boolean(week.isCurrent && data?.sessions.some((s) => isSameDate(studioDate(new Date(s.startsAt)), today)))
  useScrollToToday(hasToday ? `dia-${today.day}` : null)

  async function confirmCancel() {
    if (!cancelling) return
    setBusy(true)
    try {
      const affected = await getDataSource().cancelSession(cancelling.id)
      toast({
        title: 'Clase cancelada',
        description: affected.length
          ? `${plural(affected.length, 'reserva')} ${affected.length === 1 ? 'pasa' : 'pasan'} a «cancelada por el estudio».`
          : 'No tenía reservas.',
      })
    } catch (error) {
      toast({ title: 'No se ha podido cancelar', description: errorMessage(error), tone: 'error' })
    } finally {
      setBusy(false)
      setCancelling(null)
    }
  }

  return (
    <div className="container-page py-8 sm:py-12">
      <Seo title="Clases · Panel del estudio" description="Gestión de clases y horarios de Lumbra Pilates." noindex />
      <PanelHeader
        title="Clases"
        week={week}
        actions={
          <Button
            onClick={() => setEditing({ mode: 'create' })}
            disabled={!data}
            icon={<CalendarPlus aria-hidden="true" strokeWidth={1.75} className="size-4" />}
          >
            Nueva clase
          </Button>
        }
      />

      <div className="mt-6">
        {state.status === 'loading' && (
          <div role="status" className="flex flex-col gap-3">
            <span className="sr-only">Cargando las clases…</span>
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        )}
        {state.status === 'error' && (
          <Alert
            tone="error"
            title="No hemos podido cargar las clases"
            action={
              <Button variant="secondary" onClick={retry} icon={<RotateCcw aria-hidden="true" strokeWidth={1.75} className="size-4" />}>
                Reintentar
              </Button>
            }
          >
            Vuelve a intentarlo en un momento.
          </Alert>
        )}
        {data && data.sessions.length === 0 && (
          <EmptyState
            icon={CalendarX2}
            headingLevel="h2"
            title="No hay clases esta semana"
            action={<Button onClick={() => setEditing({ mode: 'create' })}>Crear clase</Button>}
          >
            Programa la primera clase de la semana para que aparezca en el horario público.
          </EmptyState>
        )}
        {data && data.sessions.length > 0 && (
          <div className="flex flex-col gap-6">
            {groupByDay(data.sessions).map((day) => (
              <section
                key={day.date.day}
                aria-labelledby={`dia-${day.date.day}`}
                className="rounded-lg border border-arena-200 bg-white px-4 shadow-sm sm:px-6"
              >
                {/* El número de clases va a la derecha, sin separador: ninguna línea empieza por «·». */}
                <h2
                  id={`dia-${day.date.day}`}
                  className="flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-arena-200 py-3 text-base font-medium"
                >
                  {capitalize(formatDate(day.date))}
                  {isSameDate(day.date, today) && <Badge tone="terracota">Hoy</Badge>}
                  <span className="ml-auto text-sm font-normal whitespace-nowrap text-piedra">
                    <span className="sr-only">, </span>
                    {plural(day.sessions.length, 'clase')}
                  </span>
                </h2>
                <ul className="@container divide-y divide-arena-200">
                  {day.sessions.map((session) => (
                    <SessionRow
                      key={session.id}
                      session={session}
                      now={now}
                      onEdit={() => setEditing({ mode: 'edit', session })}
                      onCancel={() => setCancelling(session)}
                    />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>

      {editing && data && (
        <SessionFormDialog
          session={editing.mode === 'edit' ? editing.session : null}
          defaultDate={defaultDate}
          classTypes={data.classTypes}
          instructors={data.instructors}
          now={now}
          onClose={() => setEditing(null)}
        />
      )}

      <Modal
        open={cancelling !== null}
        onClose={() => setCancelling(null)}
        title="¿Cancelar esta clase?"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCancelling(null)}>
              Mantener la clase
            </Button>
            <Button onClick={confirmCancel} loading={busy}>
              Sí, cancelar la clase
            </Button>
          </>
        }
      >
        {cancelling && <CancelSummary session={cancelling} />}
      </Modal>
    </div>
  )
}
