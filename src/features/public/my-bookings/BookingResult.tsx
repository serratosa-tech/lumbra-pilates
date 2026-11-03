import { CalendarPlus, Clock, Contact, Gauge, Hash, UserRound, X, type LucideIcon } from 'lucide-react'
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { BOOKING_STATUS_LABELS, LEVEL_LABELS } from '../../../components/schedule/labels.ts'
import { Alert, Badge, Button, ButtonLink, Card, Modal, useToast } from '../../../components/ui/index.ts'
import {
  CANCELLATION_LIMIT_HOURS,
  canCancelOnline,
  cancellationDeadline,
  errorMessage,
  getDataSource,
  type BookingDetails,
  type ClientCancellation,
} from '../../../data/index.ts'
import { formatDate, formatDateTime, formatDateTimeRange, formatTime } from '../../../lib/dates.ts'
import { STUDIO } from '../../../lib/site.ts'
import { capitalize } from '../../../lib/text.ts'
import { downloadBookingCalendar } from '../bookingCalendar.ts'

type ResultView =
  | 'confirmed'
  | 'promoted'
  | 'too_late'
  | 'waitlisted'
  | 'attended'
  | 'missed_waitlist'
  | 'cancelled'
  | 'class_cancelled'

function viewOf({ booking, session }: BookingDetails, now: Date): ResultView {
  const started = now.getTime() >= new Date(session.startsAt).getTime()
  if (booking.status === 'class_cancelled') return 'class_cancelled'
  if (booking.status === 'cancelled') return 'cancelled'
  if (booking.status === 'waitlisted') return started ? 'missed_waitlist' : 'waitlisted'
  if (started) return 'attended'
  if (!canCancelOnline(session, now)) return 'too_late'
  return booking.promotedAt ? 'promoted' : 'confirmed'
}

const at = (iso: string) => `${formatDate(iso)} a las ${formatTime(iso)}`

function statusMessage(view: ResultView, details: BookingDetails): ReactNode {
  const { booking, session, waitlistPosition } = details
  const deadline = cancellationDeadline(session).toISOString()
  switch (view) {
    case 'promoted':
      return (
        <Alert tone="exito" title="¡Has conseguido plaza!">
          Se liberó una plaza y pasaste de la lista de espera a confirmada. Puedes cancelar hasta el {at(deadline)}.
        </Alert>
      )
    case 'confirmed':
      return (
        <Alert tone="exito" title="Tu plaza está confirmada">
          Puedes cancelarla hasta el {at(deadline)} ({CANCELLATION_LIMIT_HOURS} horas antes de la clase).
        </Alert>
      )
    case 'too_late':
      return (
        <Alert tone="aviso" title="Ya no se puede cancelar online">
          Faltan menos de {CANCELLATION_LIMIT_HOURS} horas para la clase. Si no puedes venir, avisa al estudio
          escribiendo a {STUDIO.email} para que otra persona aproveche la plaza.
        </Alert>
      )
    case 'waitlisted':
      return (
        <Alert tone="aviso" title={`Estás en el puesto ${waitlistPosition} de la lista de espera`}>
          Si alguien cancela, la primera persona de la lista pasa a tener plaza automáticamente. Vuelve a
          consultar aquí para ver tu posición.
        </Alert>
      )
    case 'attended':
      return (
        <Alert tone="info" title="Esta clase ya se ha celebrado">
          Gracias por venir. Te esperamos en la próxima.
        </Alert>
      )
    case 'missed_waitlist':
      return (
        <Alert tone="info" title="La clase ya ha empezado">
          No llegó a liberarse ninguna plaza. Esperamos verte en otra clase.
        </Alert>
      )
    case 'cancelled':
      return (
        <Alert tone="info" title="Cancelaste esta reserva">
          {booking.cancelledAt ? `La cancelaste el ${at(booking.cancelledAt)}.` : 'Esta reserva ya no está activa.'} Si
          quieres, puedes volver a reservar desde el horario.
        </Alert>
      )
    case 'class_cancelled':
      return (
        <Alert tone="error" title="El estudio ha cancelado esta clase">
          Sentimos las molestias. Tu reserva queda anulada y no tienes que hacer nada; puedes elegir otra clase en el
          horario.
        </Alert>
      )
  }
}

interface BookingResultProps {
  details: BookingDetails
  now: Date
  /** Cómo se cancela: por defecto con email y código; con cuenta, por su id. */
  onCancel?: (details: BookingDetails) => Promise<ClientCancellation>
  headingLevel?: 'h2' | 'h3'
}

const cancelWithCode = ({ booking }: BookingDetails) => getDataSource().cancelBooking(booking.email, booking.code)

/** La reserva: estado, datos de la clase y acciones (cancelar, calendario). */
export function BookingResult({ details, now, onCancel = cancelWithCode, headingLevel: Heading = 'h2' }: BookingResultProps) {
  const { booking, session } = details
  const headingId = useId()
  const toast = useToast()
  const [confirming, setConfirming] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const view = viewOf(details, now)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const focusAfterCancel = useRef(false)

  // Al cancelar desaparece el botón que tenía el foco: se lleva al título cuando llega el nuevo estado.
  useEffect(() => {
    if (!focusAfterCancel.current) return
    focusAfterCancel.current = false
    headingRef.current?.focus()
  }, [view])
  const canCancel = view === 'confirmed' || view === 'promoted' || view === 'waitlisted'
  const isWaitlist = view === 'waitlisted'
  const status =
    view === 'attended' ? { label: 'Clase realizada', tone: 'neutral' as const } : BOOKING_STATUS_LABELS[booking.status]

  async function cancel() {
    setCancelling(true)
    try {
      const result = await onCancel(details)
      focusAfterCancel.current = true
      setConfirming(false)
      toast({
        title: isWaitlist ? 'Has salido de la lista de espera' : 'Reserva cancelada',
        description: result.promoted
          ? 'Tu plaza ha pasado a la primera persona de la lista de espera. ¡Gracias por avisar!'
          : 'Gracias por avisar con tiempo.',
      })
    } catch (error) {
      setConfirming(false)
      toast({ title: 'No se ha podido cancelar', description: errorMessage(error), tone: 'error' })
    } finally {
      setCancelling(false)
    }
  }

  const facts: Array<{ key: string; icon: LucideIcon; text: ReactNode }> = [
    { key: 'when', icon: Clock, text: capitalize(formatDateTimeRange(session.startsAt, session.durationMinutes)) },
    { key: 'instructor', icon: UserRound, text: `Con ${session.instructor}` },
    { key: 'level', icon: Gauge, text: LEVEL_LABELS[session.level] },
    { key: 'name', icon: Contact, text: `A nombre de ${booking.name}` },
    // El código baja entero a la línea siguiente; solo se parte por el guion si no cabe ni solo (texto muy grande).
    { key: 'code', icon: Hash, text: <>Código <span className="inline-block max-w-full">{booking.code}</span></> },
  ]

  return (
    <Card as="article" className="animate-rise" aria-labelledby={headingId}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <Heading
          id={headingId}
          ref={headingRef}
          tabIndex={-1}
          className={Heading === 'h3' ? 'text-xl outline-none' : 'text-2xl outline-none'}
        >
          {session.name}
        </Heading>
        <Badge tone={status.tone}>{status.label}</Badge>
      </div>
      <ul className="mt-4 flex flex-col gap-2 text-tinta-700">
        {facts.map(({ key, icon: Icon, text }) => (
          <li key={key} className="flex items-start gap-2">
            <Icon aria-hidden="true" strokeWidth={1.75} className="mt-1 size-4 shrink-0 text-terracota-600" />
            <span className="min-w-0 break-words">{text}</span>
          </li>
        ))}
      </ul>

      <div className="mt-5">{statusMessage(view, details)}</div>

      <div className="mt-5 flex flex-wrap gap-3">
        {(view === 'confirmed' || view === 'promoted' || view === 'too_late') && (
          <Button
            variant="secondary"
            onClick={() => downloadBookingCalendar(details, now)}
            icon={<CalendarPlus aria-hidden="true" strokeWidth={1.75} className="size-4" />}
          >
            Añadir al calendario
          </Button>
        )}
        {canCancel && (
          <Button variant="ghost" onClick={() => setConfirming(true)} icon={<X aria-hidden="true" strokeWidth={1.75} className="size-4" />}>
            {isWaitlist ? 'Salir de la lista de espera' : 'Cancelar reserva'}
          </Button>
        )}
        {(view === 'cancelled' || view === 'class_cancelled' || view === 'attended' || view === 'missed_waitlist') && (
          <ButtonLink to="/clases">Ver el horario</ButtonLink>
        )}
      </div>

      <Modal
        open={confirming}
        onClose={() => setConfirming(false)}
        title={isWaitlist ? '¿Salir de la lista de espera?' : '¿Cancelar tu reserva?'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirming(false)}>
              {isWaitlist ? 'Seguir esperando' : 'Mantener la reserva'}
            </Button>
            <Button onClick={cancel} loading={cancelling}>
              {isWaitlist ? 'Salir de la lista' : 'Sí, cancelar'}
            </Button>
          </>
        }
      >
        <p className="text-tinta-700">
          {session.name}, {formatDateTime(session.startsAt)}.{' '}
          {isWaitlist
            ? 'Perderás tu puesto en la lista.'
            : 'Liberarás tu plaza y, si hay lista de espera, pasará a la primera persona.'}
        </p>
      </Modal>
    </Card>
  )
}
