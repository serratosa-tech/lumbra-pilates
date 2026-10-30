import { CalendarX2, Clock, Gauge, RotateCcw, UserRound, UsersRound } from 'lucide-react'
import { useState } from 'react'
import { LEVEL_LABELS, plural } from '../../../../components/schedule/labels.ts'
import { SpotsMeter } from '../../../../components/schedule/SpotsMeter.tsx'
import { Alert, Button, EmptyState, ResponsiveModal, Skeleton } from '../../../../components/ui/index.ts'
import {
  CANCELLATION_LIMIT_HOURS,
  canCancelOnline,
  isBookable,
  sessionState,
  type BookingDetails,
  type ClassSession,
} from '../../../../data/index.ts'
import { formatDateTime, formatTimeRange } from '../../../../lib/dates.ts'
import { capitalize, SEP } from '../../../../lib/text.ts'
import { useAsyncData } from '../../../../lib/useAsyncData.ts'
import { BookingConfirmation } from './BookingConfirmation.tsx'
import { BookingForm } from './BookingForm.tsx'

function SessionSummary({ session, now }: { session: ClassSession; now: Date }) {
  const items = [
    { icon: Clock, text: `${formatTimeRange(session.startsAt, session.durationMinutes)}${SEP}${session.durationMinutes} min` },
    { icon: UserRound, text: `Con ${session.instructor}` },
    { icon: Gauge, text: LEVEL_LABELS[session.level] },
  ]
  return (
    <div className="mb-6 rounded-md bg-arena-100/70 p-4">
      <ul className="flex flex-col gap-2 text-sm text-tinta-700">
        {items.map(({ icon: Icon, text }) => (
          <li key={text} className="flex items-center gap-2">
            <Icon aria-hidden="true" strokeWidth={1.75} className="size-4 shrink-0 text-terracota-600" />
            {text}
          </li>
        ))}
        {session.waitlistCount > 0 && (
          <li className="flex items-center gap-2">
            <UsersRound aria-hidden="true" strokeWidth={1.75} className="size-4 shrink-0 text-terracota-600" />
            {plural(session.waitlistCount, 'persona')} en lista de espera
          </li>
        )}
      </ul>
      <SpotsMeter session={session} now={now} className="mt-4" />
    </div>
  )
}

const UNAVAILABLE = {
  past: { title: 'Esta clase ya ha empezado', text: 'Ya no se puede reservar. Elige otra clase del horario.' },
  cancelled: {
    title: 'El estudio ha cancelado esta clase',
    text: 'Si tenías plaza, tu reserva ya no cuenta. Elige otra clase del horario.',
  },
}

/** Detalle de una clase con su formulario de reserva o de lista de espera. */
export function BookingDialog({ classId, now, onClose }: { classId: string; now: Date; onClose: () => void }) {
  const { state, retry } = useAsyncData(`clase:${classId}`, (ds) => ds.getSession(classId))
  const [result, setResult] = useState<BookingDetails | null>(null)

  const session = state.status === 'ready' ? state.data : null
  const status = session ? sessionState(session, now) : null

  let title = 'Cargando la clase…'
  let description: string | undefined
  let content = (
    <div role="status" className="flex flex-col gap-3">
      <span className="sr-only">Cargando la clase…</span>
      <Skeleton className="h-28 w-full" />
      <Skeleton className="h-11 w-full" />
      <Skeleton className="h-11 w-full" />
    </div>
  )

  if (state.status === 'error') {
    title = 'No hemos podido cargar la clase'
    content = (
      <Alert
        tone="error"
        title="Algo ha fallado"
        action={
          <Button variant="secondary" onClick={retry} icon={<RotateCcw aria-hidden="true" strokeWidth={1.75} className="size-4" />}>
            Reintentar
          </Button>
        }
      >
        Comprueba tu conexión y vuelve a intentarlo.
      </Alert>
    )
  } else if (state.status === 'ready' && !session) {
    title = 'Clase no encontrada'
    content = (
      <EmptyState icon={CalendarX2} title="Esta clase ya no está en el horario" headingLevel="h3">
        Puede que el enlace sea antiguo. Cierra esta ventana y elige otra clase.
      </EmptyState>
    )
  } else if (session && status) {
    description = `${session.name}${SEP}${formatDateTime(session.startsAt)}`
    if (result) {
      title = result.booking.status === 'confirmed' ? '¡Plaza reservada!' : 'Estás en la lista de espera'
      content = <BookingConfirmation details={result} now={now} />
    } else {
      title = session.name
      description = capitalize(formatDateTime(session.startsAt))
      const unavailable = isBookable(status) ? null : UNAVAILABLE[status === 'cancelled' ? 'cancelled' : 'past']
      const waitlist = status === 'full'
      const cancellable = canCancelOnline(session, now)
      content = (
        <>
          <SessionSummary session={session} now={now} />
          {unavailable ? (
            <Alert tone={status === 'cancelled' ? 'error' : 'info'} title={unavailable.title}>
              {unavailable.text}
            </Alert>
          ) : (
            <>
              {/* Pasado el plazo de cancelación se avisa antes de reservar, no después. */}
              {!cancellable && (
                <Alert tone="aviso" title="Sin cancelación online" className="mb-5">
                  Esta clase empieza en menos de {CANCELLATION_LIMIT_HOURS} horas:{' '}
                  {waitlist
                    ? 'si consigues plaza desde la lista de espera, no podrás cancelarla online.'
                    : 'una vez reservada no podrás cancelarla online.'}
                </Alert>
              )}
              <h3 className="mb-4 font-sans text-base font-semibold tracking-normal">
                {waitlist ? 'La clase está completa: apúntate a la lista de espera' : 'Tus datos'}
              </h3>
              <BookingForm sessionId={session.id} waitlist={waitlist} cancellable={cancellable} onBooked={setResult} />
            </>
          )}
        </>
      )
    }
  }

  return (
    <ResponsiveModal open onClose={onClose} title={title} description={description}>
      {content}
    </ResponsiveModal>
  )
}
