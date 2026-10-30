import { RotateCcw, SearchX, Ticket } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router'
import { Seo } from '../../../components/Seo.tsx'
import { Alert, Button, EmptyState, Skeleton } from '../../../components/ui/index.ts'
import { useAsyncData } from '../../../lib/useAsyncData.ts'
import { useNow } from '../../../lib/useNow.ts'
import { BookingResult } from './BookingResult.tsx'
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

  return (
    <div className="container-page py-10 sm:py-14 lg:py-16">
      <Seo
        title="Mis reservas"
        description="Consulta o cancela tu reserva en Lumbra Pilates con tu email y tu código de reserva."
        noindex
      />
      <div className="max-w-2xl">
        <p className="text-xs font-semibold tracking-widest text-terracota-700 uppercase">Mis reservas</p>
        <h1 className="mt-3 text-3xl">Consulta o cancela tu reserva</h1>
        <p className="mt-3 text-lg text-tinta-700">
          Escribe el email con el que reservaste y el código que te dimos al confirmar.
        </p>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:gap-12">
        <LookupForm initial={query ?? { email: '', code: '' }} searching={query !== null && state.status === 'loading'} onSearch={search} />

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
              <span className="whitespace-nowrap">LUM-7K3Q</span>).
            </EmptyState>
          )}
          {state.status === 'ready' && state.data && <BookingResult details={state.data} now={now} />}
        </div>
      </div>
    </div>
  )
}
