import { CalendarHeart, LogOut, RotateCcw, UserRound } from 'lucide-react'
import { useState } from 'react'
import { Alert, Button, ButtonLink, EmptyState, Skeleton, useToast } from '../../../components/ui/index.ts'
import { errorMessage, getDataSource, hasEnded, type Account, type BookingDetails } from '../../../data/index.ts'
import { useAsyncData } from '../../../lib/useAsyncData.ts'
import { BookingResult } from './BookingResult.tsx'

const cancelMine = ({ booking }: BookingDetails) => getDataSource().cancelMyBooking(booking.id)

/** Próximas (activas y sin terminar) y el resto, de la más reciente a la más antigua. */
function split(list: BookingDetails[], now: Date) {
  const active = (d: BookingDetails) =>
    (d.booking.status === 'confirmed' || d.booking.status === 'waitlisted') && !hasEnded(d.session, now)
  return {
    upcoming: list.filter(active),
    past: list.filter((d) => !active(d)).reverse(),
  }
}

function BookingList({ title, items, now }: { title: string; items: BookingDetails[]; now: Date }) {
  if (items.length === 0) return null
  return (
    <section aria-label={title}>
      <h2 className="text-2xl">{title}</h2>
      <ul className="mt-4 grid grid-cols-1 gap-5 lg:grid-cols-2">
        {items.map((details) => (
          <li key={details.booking.id} className="min-w-0">
            <BookingResult details={details} now={now} onCancel={cancelMine} headingLevel="h3" />
          </li>
        ))}
      </ul>
    </section>
  )
}

/** Mis reservas con la sesión de una cuenta de cliente. Sin opciones para cambiar el email, la contraseña ni borrar la cuenta. */
export function AccountBookings({ account, now }: { account: Account; now: Date }) {
  const toast = useToast()
  const [leaving, setLeaving] = useState(false)
  const { state, retry } = useAsyncData(`mis-reservas:${account.email}`, (ds) => ds.listMyBookings())
  const isDemo = account.phone !== null

  async function signOut() {
    setLeaving(true)
    try {
      await getDataSource().signOut()
      toast({ title: 'Has cerrado la sesión', tone: 'info' })
    } catch (error) {
      toast({ title: 'No se ha podido cerrar la sesión', description: errorMessage(error), tone: 'error' })
    } finally {
      setLeaving(false)
    }
  }

  const lists = state.status === 'ready' ? split(state.data, now) : null

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 rounded-lg border border-arena-200 bg-white p-4 sm:px-5">
        <p className="flex min-w-0 items-start gap-2 text-tinta-700">
          <UserRound aria-hidden="true" strokeWidth={1.75} className="mt-1 size-4 shrink-0 text-terracota-600" />
          <span className="min-w-0 [overflow-wrap:anywhere]">
            Has entrado como <strong className="font-medium text-tinta">{account.name}</strong>
            {/* En pantallas estrechas el email va en su propia línea: ninguna empieza por «·». */}
            <span aria-hidden="true" className="hidden text-piedra sm:inline">
              {' '}
              ·{' '}
            </span>
            <span className="sr-only sm:hidden">, </span>
            <span className="block text-piedra sm:inline">{account.email}</span>
          </span>
        </p>
        <Button variant="ghost" onClick={signOut} loading={leaving} icon={<LogOut aria-hidden="true" strokeWidth={1.75} className="size-4" />}>
          Cerrar sesión
        </Button>
        {isDemo && (
          <p className="w-full text-sm text-piedra">
            La cuenta demo la comparten todos los visitantes: sus reservas vuelven a las de ejemplo cada hora.
          </p>
        )}
      </div>

      {state.status === 'loading' && (
        <div role="status" className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <span className="sr-only">Cargando tus reservas…</span>
          {[0, 1].map((i) => (
            <div key={i} className="flex flex-col gap-4 rounded-lg border border-arena-200 bg-white p-6">
              <Skeleton className="h-7 w-48" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-20 w-full" />
            </div>
          ))}
        </div>
      )}

      {state.status === 'error' && (
        <Alert
          tone="error"
          title="No hemos podido cargar tus reservas"
          action={
            <Button variant="secondary" onClick={retry} icon={<RotateCcw aria-hidden="true" strokeWidth={1.75} className="size-4" />}>
              Reintentar
            </Button>
          }
        >
          {errorMessage(state.error)}
        </Alert>
      )}

      {lists && lists.upcoming.length === 0 && lists.past.length === 0 && (
        <EmptyState
          icon={CalendarHeart}
          headingLevel="h2"
          title="Aún no tienes reservas"
          action={<ButtonLink to="/clases">Ver el horario</ButtonLink>}
        >
          Las clases que reserves con esta cuenta aparecerán aquí.
        </EmptyState>
      )}

      {lists && (
        <>
          <BookingList title="Próximas" items={lists.upcoming} now={now} />
          <BookingList title="Pasadas y canceladas" items={lists.past} now={now} />
        </>
      )}
    </div>
  )
}
