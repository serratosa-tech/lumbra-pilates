import { ArrowLeft, Check, RotateCcw, SearchX, UserPlus, X } from 'lucide-react'
import { useState } from 'react'
import { BOOKING_STATUS_LABELS, LEVEL_LABELS, plural } from '../../../components/schedule/labels.ts'
import { SpotsMeter } from '../../../components/schedule/SpotsMeter.tsx'
import { Alert, Badge, Button, ButtonLink, Card, EmptyState, Modal, Skeleton, useToast } from '../../../components/ui/index.ts'
import {
  ATTENDANCE_OPENS_MINUTES,
  canMarkAttendance,
  DataError,
  errorMessage,
  getDataSource,
  sessionState,
  type Attendance,
  type Booking,
  type Roster,
} from '../../../data/index.ts'
import { cn } from '../../../lib/cn.ts'
import { formatDateTime, formatTimeRange } from '../../../lib/dates.ts'
import { useAsyncData } from '../../../lib/useAsyncData.ts'
import { ManualBookingDialog } from './ManualBookingDialog.tsx'

const ATTENDANCE_OPTIONS: Array<{ value: Attendance; label: string; icon: typeof Check; active: string }> = [
  { value: 'attended', label: 'Asistió', icon: Check, active: 'border-exito bg-exito text-white' },
  { value: 'no_show', label: 'No vino', icon: X, active: 'border-error bg-error text-white' },
]

function AttendanceToggle({
  booking,
  value: current,
  disabled,
  onChange,
}: {
  booking: Booking
  value: Attendance | null
  disabled: boolean
  onChange: (value: Attendance | null) => void
}) {
  return (
    <div
      role="group"
      aria-label={`Asistencia de ${booking.name}`}
      className="inline-flex max-w-full flex-wrap gap-1 rounded-[1.5rem] bg-arena-100 p-1"
    >
      {ATTENDANCE_OPTIONS.map(({ value, label, icon: Icon, active }) => {
        const pressed = current === value
        return (
          <button
            key={value}
            type="button"
            aria-pressed={pressed}
            disabled={disabled}
            // Pulsar la opción marcada la desmarca.
            onClick={() => onChange(pressed ? null : value)}
            className={cn(
              'inline-flex min-h-11 items-center gap-1.5 rounded-full border px-3 text-sm font-semibold transition-colors duration-(--duration-fast)',
              'disabled:cursor-not-allowed disabled:opacity-55',
              pressed ? active : 'border-transparent text-tinta-700 hover:bg-white',
            )}
          >
            <Icon aria-hidden="true" strokeWidth={2} className="size-4" />
            {label}
          </button>
        )
      })}
    </div>
  )
}

function PersonInfo({ booking }: { booking: Booking }) {
  return (
    <div className="min-w-[min(12rem,100%)] flex-1">
      <p className="flex flex-wrap items-center gap-2 font-semibold">
        {booking.name}
        {booking.source === 'studio' && <Badge>Manual</Badge>}
        {booking.promotedAt && <Badge tone="terracota">Desde la lista</Badge>}
      </p>
      <p className="text-sm break-all text-piedra">
        {booking.email} · {booking.phone}
      </p>
    </div>
  )
}

export function RosterView({ sessionId, now }: { sessionId: string; now: Date }) {
  const toast = useToast()
  const { state, retry } = useAsyncData(`asistentes:${sessionId}`, (ds) => ds.getRoster(sessionId))
  const [adding, setAdding] = useState(false)
  const [cancelling, setCancelling] = useState<Booking | null>(null)
  const [busy, setBusy] = useState(false)
  // Marca optimista: se ve al instante y deja de usarse en cuanto los datos guardados cambian.
  const [optimistic, setOptimistic] = useState<Record<string, { from: Attendance | null; to: Attendance | null }>>({})
  const shownAttendance = (booking: Booking) => {
    const pending = optimistic[booking.id]
    return pending && pending.from === booking.attendance ? pending.to : booking.attendance
  }

  async function mark(booking: Booking, attendance: Attendance | null) {
    setOptimistic((o) => ({ ...o, [booking.id]: { from: booking.attendance, to: attendance } }))
    try {
      await getDataSource().setAttendance(booking.id, attendance)
    } catch (error) {
      setOptimistic(({ [booking.id]: _failed, ...rest }) => rest)
      toast({ title: 'No se ha podido marcar', description: errorMessage(error), tone: 'error' })
    }
  }

  async function confirmCancel() {
    if (!cancelling) return
    setBusy(true)
    try {
      const { promoted } = await getDataSource().cancelBookingById(cancelling.id)
      toast({
        title: 'Reserva cancelada',
        description: promoted
          ? `${promoted.name} ha pasado de la lista de espera a tener plaza.`
          : `${cancelling.name} ya no está en la clase.`,
      })
    } catch (error) {
      toast({ title: 'No se ha podido cancelar', description: errorMessage(error), tone: 'error' })
    } finally {
      setBusy(false)
      setCancelling(null)
    }
  }

  const back = (
    <ButtonLink to="/estudio/asistentes" variant="ghost" icon={<ArrowLeft aria-hidden="true" strokeWidth={1.75} className="size-4" />}>
      Todas las clases
    </ButtonLink>
  )

  if (state.status === 'loading') {
    return (
      <div role="status" className="flex flex-col gap-4">
        <span className="sr-only">Cargando asistentes…</span>
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }
  if (state.status === 'error') {
    const missing = state.error instanceof DataError && state.error.code === 'session_not_found'
    return missing ? (
      <EmptyState icon={SearchX} headingLevel="h1" title="Esta clase no existe" action={back}>
        Puede que el enlace sea antiguo. Elige otra clase de la lista.
      </EmptyState>
    ) : (
      <Alert
        tone="error"
        title="No hemos podido cargar los asistentes"
        action={
          <Button variant="secondary" onClick={retry} icon={<RotateCcw aria-hidden="true" strokeWidth={1.75} className="size-4" />}>
            Reintentar
          </Button>
        }
      >
        Vuelve a intentarlo en un momento.
      </Alert>
    )
  }

  const { session, confirmed, waitlist, cancelled }: Roster = state.data
  const status = sessionState(session, now)
  const isCancelled = status === 'cancelled'
  const ended = now.getTime() >= new Date(session.startsAt).getTime() + session.durationMinutes * 60_000
  const attendanceOpen = canMarkAttendance(session, now)
  const attended = confirmed.filter((b) => shownAttendance(b) === 'attended').length
  const noShow = confirmed.filter((b) => shownAttendance(b) === 'no_show').length

  return (
    <div className="flex flex-col gap-6">
      <div>{back}</div>
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <h1 className="flex flex-wrap items-center gap-3 text-3xl">
            {session.name}
            {isCancelled && <Badge tone="error">Cancelada</Badge>}
          </h1>
          <p className="mt-2 text-tinta-700">
            {formatDateTime(session.startsAt)} ({formatTimeRange(session.startsAt, session.durationMinutes)}) ·{' '}
            {session.instructor} · {LEVEL_LABELS[session.level]}
          </p>
          {!isCancelled && <SpotsMeter session={session} now={now} className="mt-3" />}
        </div>
        {!isCancelled && !ended && (
          <Button onClick={() => setAdding(true)} icon={<UserPlus aria-hidden="true" strokeWidth={1.75} className="size-4" />}>
            Añadir reserva
          </Button>
        )}
      </header>

      {isCancelled && (
        <Alert tone="error" title="El estudio canceló esta clase">
          Sus reservas aparecen abajo como «cancelada por el estudio».
        </Alert>
      )}

      {!isCancelled && (
        <Card as="section" aria-labelledby="confirmadas-titulo">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="confirmadas-titulo" className="min-w-0 text-xl">
              Plazas confirmadas{' '}
              <span className="font-sans text-base font-normal text-piedra tabular-nums">
                {confirmed.length}/{session.capacity}
              </span>
            </h2>
            {attendanceOpen && confirmed.length > 0 && (
              <p className="text-sm text-piedra">
                {attended} asistieron · {noShow} no vinieron · {confirmed.length - attended - noShow} sin marcar
              </p>
            )}
          </div>
          {!attendanceOpen && confirmed.length > 0 && (
            <p className="mt-1 text-sm text-piedra">
              La asistencia se marca a partir de {ATTENDANCE_OPENS_MINUTES} minutos antes de la clase.
            </p>
          )}
          {confirmed.length === 0 ? (
            <p className="mt-4 text-piedra">Todavía no hay reservas.</p>
          ) : (
            <ul className="mt-2 divide-y divide-arena-200">
              {confirmed.map((booking) => (
                <li key={booking.id} className="flex flex-wrap items-center gap-x-4 gap-y-3 py-3">
                  <PersonInfo booking={booking} />
                  <div className="flex max-w-full flex-wrap items-center gap-2">
                    <AttendanceToggle
                      booking={booking}
                      value={shownAttendance(booking)}
                      disabled={!attendanceOpen}
                      onChange={(value) => mark(booking, value)}
                    />
                    {!ended && (
                      <Button variant="ghost" onClick={() => setCancelling(booking)} aria-label={`Cancelar la reserva de ${booking.name}`} className="px-3">
                        <X aria-hidden="true" strokeWidth={1.75} className="size-5" />
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {!isCancelled && (
        <Card as="section" aria-labelledby="espera-titulo">
          <h2 id="espera-titulo" className="text-xl">
            Lista de espera{' '}
            <span className="font-sans text-base font-normal text-piedra tabular-nums">{waitlist.length}</span>
          </h2>
          {waitlist.length === 0 ? (
            <p className="mt-2 text-piedra">Nadie esperando plaza.</p>
          ) : (
            <ol className="mt-2 divide-y divide-arena-200">
              {waitlist.map((booking, index) => (
                <li key={booking.id} className="flex flex-wrap items-center gap-x-4 gap-y-3 py-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-aviso-50 font-semibold text-aviso tabular-nums">
                    <span className="sr-only">Puesto </span>
                    {index + 1}
                  </span>
                  <PersonInfo booking={booking} />
                  {!ended && (
                    <Button variant="ghost" onClick={() => setCancelling(booking)} aria-label={`Quitar a ${booking.name} de la lista de espera`} className="px-3">
                      <X aria-hidden="true" strokeWidth={1.75} className="size-5" />
                    </Button>
                  )}
                </li>
              ))}
            </ol>
          )}
        </Card>
      )}

      {cancelled.length > 0 && (
        <details className="group rounded-lg border border-arena-200 bg-white/60 px-5 py-1 sm:px-6">
          <summary className="flex min-h-11 cursor-pointer items-center font-semibold">
            Canceladas ({cancelled.length})
          </summary>
          <ul className="divide-y divide-arena-200 pb-2">
            {cancelled.map((booking) => (
              <li key={booking.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
                <PersonInfo booking={booking} />
                <Badge tone={BOOKING_STATUS_LABELS[booking.status].tone}>{BOOKING_STATUS_LABELS[booking.status].label}</Badge>
              </li>
            ))}
          </ul>
        </details>
      )}

      {adding && <ManualBookingDialog session={session} onClose={() => setAdding(false)} />}

      <Modal
        open={cancelling !== null}
        onClose={() => setCancelling(null)}
        title={cancelling?.status === 'waitlisted' ? '¿Quitar de la lista de espera?' : '¿Cancelar esta reserva?'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setCancelling(null)}>
              No, mantener
            </Button>
            <Button onClick={confirmCancel} loading={busy}>
              Sí, cancelar
            </Button>
          </>
        }
      >
        {cancelling && (
          <p className="text-tinta-700">
            {cancelling.name} · {session.name}, {formatDateTime(session.startsAt)}.{' '}
            {cancelling.status === 'confirmed' && waitlist.length > 0
              ? `La plaza pasará a ${waitlist[0].name}, la primera de la lista de espera.`
              : cancelling.status === 'confirmed'
                ? 'La plaza quedará libre.'
                : `Quedarán ${plural(waitlist.length - 1, 'persona')} en la lista.`}
          </p>
        )}
      </Modal>
    </div>
  )
}
