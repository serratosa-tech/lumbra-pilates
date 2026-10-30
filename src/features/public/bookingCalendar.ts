import { CANCELLATION_LIMIT_HOURS, canCancelOnline, type BookingDetails } from '../../data/index.ts'
import { buildIcs, downloadFile } from '../../lib/ics.ts'
import { SITE_URL, STUDIO } from '../../lib/site.ts'

/** Descarga la clase reservada como evento de calendario (.ics). */
export function downloadBookingCalendar({ booking, session }: BookingDetails, now: Date): void {
  const ics = buildIcs({
    uid: `${booking.code}@lumbra-pilates`,
    title: `${session.name} · Lumbra Pilates`,
    description: [
      `Código de reserva: ${booking.code}`,
      `Instructora: ${session.instructor}`,
      canCancelOnline(session, now)
        ? `Consulta o cancela hasta ${CANCELLATION_LIMIT_HOURS} horas antes en ${SITE_URL}/mis-reservas`
        : `Consulta tu reserva en ${SITE_URL}/mis-reservas`,
    ].join('\n'),
    location: `Lumbra Pilates, ${STUDIO.street}, ${STUDIO.postalCode} ${STUDIO.city}`,
    start: session.startsAt,
    durationMinutes: session.durationMinutes,
    stamp: new Date(),
  })
  downloadFile(`lumbra-${booking.code}.ics`, ics, 'text/calendar;charset=utf-8')
}
