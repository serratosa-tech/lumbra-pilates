import { RotateCcw, SearchX, Ticket } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router'
import { Seo } from '../../../components/Seo.tsx'
import { Alert, Button, EmptyState, Skeleton } from '../../../components/ui/index.ts'
import { useAsyncData } from '../../../lib/useAsyncData.ts'
import { useNow } from '../../../lib/useNow.ts'
import { AccountBookings } from './AccountBookings.tsx'
import { BookingResult } from './BookingResult.tsx'
import { ClientAccess } from './ClientAccess.tsx'
import { LookupForm, type LookupQuery } from './LookupForm.tsx'

function isQuery(value: unknown): value is LookupQuery {
  const v = value as Partial<LookupQuery> | null
  return typeof v?.email === 'string' && typeof v.code === 'string'
}

export function MyBookingsPage() {
  const now = useNow()
  // Al llegar desde la confirmación de una reserva, el email y el código vienen en el estado de la navegación.
  const fromBooking = useLocation().state
  const [query, setQuery] = useState<LookupQuery | null>(isQuery(fromBooking) ? fromBooking : null)
  const [searchCount, setSearchCount] = useState(0)

  const { state, retry } = useAsyncData(query ? `reserva:${query.email}:${query.code}:${searchCount}` : 'sin-consulta', (ds) =>
    query ? ds.findBooking(query.email, query.code) : Promise.resolve(null),
  )

  const session = useAsyncData('cuenta', (ds) => ds.getAccount())
  const account = session.state.status === 'ready' ? session.state.data : null
  const client = account?.role === 'client' ? account : null
  const studio = account?.role === 'studio' ? account : null
  // Mientras se comprueba la sesión no se ofrece entrar (evita un parpadeo del acceso con cuenta).
  const signedIn = session.state.status !== 'ready' || account !== null

  const resultRef = useRef<HTMLDivElement>(null)

  // En móvil el resultado queda bajo el formulario: se acerca a la vista al buscar.
  useEffect(() => {
    const result = resultRef.current
    if (searchCount === 0 || !result || result.getBoundingClientRect().top < window.innerHeight * 0.6) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    result.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
  }, [searchCount])

  function search(next: LookupQuery) {
    setQuery(next)
    setSearchCount((n) => n + 1)
  }

  const lookupIntro = 'Escribe el email con el que reservaste y el código que te dimos al confirmar.'

  return (
    <div className="container-page py-10 sm:py-14 lg:py-16">
      <Seo
        title="Mis reservas"
        description="Consulta o cancela tu reserva en Lumbra Pilates con tu email y tu código de reserva."
        noindex
      />
      <div className="max-w-2xl">
        <p className="text-xs font-medium tracking-widest text-terracota-700 uppercase">Mis reservas</p>
        <h1 className="mt-3 text-3xl">{client ? 'Tus reservas' : 'Consulta o cancela tu reserva'}</h1>
        <p className="mt-3 text-lg text-tinta-800">
          {client ? 'Las clases que has reservado con tu cuenta. Puedes cancelarlas desde aquí.' : lookupIntro}
        </p>
      </div>

      {client && (
        <div className="mt-8">
          <AccountBookings account={client} now={now} />
        </div>
      )}

      {studio && (
        <Alert tone="info" title="Has entrado con la cuenta del estudio" className="mt-8">
          Las reservas se gestionan en el{' '}
          <Link to="/estudio/resumen" className="font-medium text-terracota-700 underline underline-offset-4">
            panel del estudio
          </Link>
          . Aquí puedes consultar una reserva con su email y su código.
        </Alert>
      )}

      {client && (
        <div className="mt-12 max-w-2xl border-t border-arena-200 pt-10">
          <h2 className="text-2xl">¿Reservaste sin cuenta?</h2>
          <p className="mt-2 text-tinta-800">{lookupIntro}</p>
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:gap-12">
        <LookupForm
          initial={query ?? { email: '', code: '' }}
          searching={query !== null && state.status === 'loading'}
          onSearch={search}
          accountAccess={signedIn ? undefined : <ClientAccess />}
        />

        <div ref={resultRef} aria-live="polite">
          {!query && (
            <EmptyState icon={Ticket} headingLevel="h2" title="Tu reserva aparecerá aquí">
              Verás el estado de tu plaza o tu puesto en la lista de espera, y podrás cancelarla si lo necesitas.
            </EmptyState>
          )}
          {query && state.status === 'loading' && (
            <div role="status" className="flex flex-col gap-4 rounded-lg border border-arena-200 bg-white p-6">
              <span className="sr-only">Buscando tu reserva…</span>
              <Skeleton className="h-7 w-48" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-20 w-full" />
            </div>
          )}
          {query && state.status === 'error' && (
            <Alert
              tone="error"
              title="No hemos podido consultar tu reserva"
              action={
                <Button variant="secondary" onClick={retry} icon={<RotateCcw aria-hidden="true" strokeWidth={1.75} className="size-4" />}>
                  Reintentar
                </Button>
              }
            >
              Comprueba tu conexión y vuelve a intentarlo.
            </Alert>
          )}
          {query && state.status === 'ready' && !state.data && (
            <EmptyState icon={SearchX} headingLevel="h2" title="No encontramos ninguna reserva">
              Revisa que el email sea el mismo que usaste al reservar y que el código esté bien escrito (por ejemplo,{' '}
              <span className="inline-block max-w-full">LUM-XXXX</span>).
            </EmptyState>
          )}
          {state.status === 'ready' && state.data && <BookingResult details={state.data} now={now} />}
        </div>
      </div>
    </div>
  )
}
