import { CalendarPlus, CircleCheck, Copy, Hourglass, Ticket } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { Button, ButtonLink, useToast } from '../../../../components/ui/index.ts'
import { CANCELLATION_LIMIT_HOURS, canCancelOnline, type BookingDetails } from '../../../../data/index.ts'
import { cn } from '../../../../lib/cn.ts'
import { formatDate, formatTime, formatTimeRange } from '../../../../lib/dates.ts'
import { STUDIO } from '../../../../lib/site.ts'
import { capitalize } from '../../../../lib/text.ts'
import { downloadBookingCalendar } from '../../bookingCalendar.ts'

/** Resultado de la reserva: código, resumen y siguientes pasos. */
export function BookingConfirmation({ details, now }: { details: BookingDetails; now: Date }) {
  const { booking, session, waitlistPosition } = details
  const toast = useToast()
  const headingRef = useRef<HTMLParagraphElement>(null)
  const confirmed = booking.status === 'confirmed'

  // El foco pasa al mensaje para que los lectores de pantalla lo anuncien.
  useEffect(() => headingRef.current?.focus(), [])

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(booking.code)
      toast({ title: 'Código copiado', description: booking.code })
    } catch {
      toast({ title: 'No se ha podido copiar', description: 'Apunta el código a mano.', tone: 'error' })
    }
  }

  const summary = [
    ['Clase', session.name],
    ['Día', capitalize(formatDate(session.startsAt))],
    ['Hora', formatTimeRange(session.startsAt, session.durationMinutes)],
    ['Instructora', session.instructor],
    ['A nombre de', booking.name],
    ['Email', booking.email],
  ]

  return (
    <div className="flex flex-col items-center text-center">
      <span
        className={cn(
          'grid size-16 place-items-center rounded-arch animate-rise',
          confirmed ? 'bg-exito-50 text-exito' : 'bg-aviso-50 text-aviso',
        )}
      >
        {confirmed ? (
          <CircleCheck aria-hidden="true" strokeWidth={1.75} className="size-7" />
        ) : (
          <Hourglass aria-hidden="true" strokeWidth={1.75} className="size-7" />
        )}
      </span>
      <p ref={headingRef} tabIndex={-1} className="mt-4 max-w-sm text-lg font-semibold outline-none">
        {confirmed
          ? `Te esperamos el ${formatDate(session.startsAt)} a las ${formatTime(session.startsAt)}.`
          : `Estás en el puesto ${waitlistPosition} de la lista de espera.`}
      </p>
      {!confirmed && (
        <p className="mt-2 max-w-sm text-sm text-tinta-700">
          Si alguien cancela, la primera persona de la lista pasa a tener plaza automáticamente. Consulta tu
          posición cuando quieras en «Mis reservas».
        </p>
      )}

      <div className="mt-5 w-full rounded-md border border-dashed border-terracota-300 bg-arena-100/60 px-4 py-4">
        <p className="text-xs font-semibold tracking-widest text-terracota-700 uppercase">Tu código de reserva</p>
        {/* El código nunca se parte; en pantallas estrechas (o con texto muy grande) baja un tamaño. */}
        <p className="mt-1 font-display text-2xl tracking-[0.06em] whitespace-nowrap tabular-nums min-[22rem]:text-3xl min-[22rem]:tracking-[0.12em]">
          {booking.code}
        </p>
        <Button variant="ghost" onClick={copyCode} className="mt-1" icon={<Copy aria-hidden="true" strokeWidth={1.75} className="size-4" />}>
          Copiar código
        </Button>
      </div>

      <dl className="mt-5 grid w-full grid-cols-1 gap-x-4 gap-y-2 rounded-md border border-arena-200 bg-white p-4 text-left text-sm min-[22rem]:grid-cols-[auto_minmax(0,1fr)]">
        {summary.map(([term, value]) => (
          <div key={term} className="contents">
            <dt className="text-piedra">{term}</dt>
            <dd className="mb-1 font-semibold break-words min-[22rem]:mb-0">{value}</dd>
          </div>
        ))}
      </dl>

      <p className="mt-4 max-w-sm text-sm text-piedra">
        {!confirmed
          ? 'Guarda el código: junto con tu email te permite consultar tu puesto y salir de la lista de espera hasta que empiece la clase.'
          : canCancelOnline(session, now)
            ? `Guarda el código: junto con tu email te permite consultar la reserva y cancelarla hasta ${CANCELLATION_LIMIT_HOURS} horas antes.`
            : `Guarda el código: junto con tu email te permite consultar la reserva. Como la clase empieza en menos de ${CANCELLATION_LIMIT_HOURS} horas, ya no se puede cancelar online; si no puedes venir, escribe a ${STUDIO.email}.`}
      </p>

      <div className="mt-5 flex w-full flex-wrap justify-center gap-3">
        {confirmed && (
          <Button
            variant="secondary"
            onClick={() => {
              downloadBookingCalendar(details, now)
              toast({ title: 'Evento descargado', description: 'Ábrelo para añadir la clase a tu calendario.' })
            }}
            icon={<CalendarPlus aria-hidden="true" strokeWidth={1.75} className="size-4" />}
          >
            Añadir al calendario
          </Button>
        )}
        <ButtonLink
          to="/mis-reservas"
          state={{ email: booking.email, code: booking.code }}
          icon={<Ticket aria-hidden="true" strokeWidth={1.75} className="size-4" />}
        >
          Ver mis reservas
        </ButtonLink>
      </div>
    </div>
  )
}
