import { ArrowRight, Clock, Sparkles, UserRound } from 'lucide-react'
import { Link } from 'react-router'
import { DemoTryButtons } from '../../../components/account/DemoTryButtons.tsx'
import { spotsStatus } from '../../../components/schedule/labels.ts'
import { Badge, ButtonLink, buttonClasses, Skeleton } from '../../../components/ui/index.ts'
import { formatTime } from '../../../lib/dates.ts'
import { SLOGAN } from '../../../lib/site.ts'
import { SEP } from '../../../lib/text.ts'
import { useNow } from '../../../lib/useNow.ts'
import { scheduleLink } from '../schedule/useScheduleParams.ts'
import { dayHeading } from './upcoming.ts'
import type { HomeState } from './useHomeData.ts'

const HIGHLIGHTS = ['Grupos reducidos de 8 a 12', 'Reserva sin crear cuenta', 'Lista de espera automática']

function NextClassCard({ state }: { state: HomeState }) {
  const now = useNow()
  if (state.status === 'error') return null

  const firstDay = state.status === 'ready' ? state.data.upcoming[0] : undefined
  const next = firstDay?.sessions[0]
  if (state.status === 'ready' && !next) return null
  const spots = next ? spotsStatus(next, now) : undefined

  return (
    <div className="relative mx-auto -mt-16 w-[calc(100%-2rem)] max-w-xs rounded-lg border border-arena-200 bg-white/95 p-5 shadow-lg backdrop-blur lg:absolute lg:-bottom-8 lg:left-0 lg:mt-0 lg:w-80 lg:max-w-none animate-rise [animation-delay:200ms]">
      {firstDay && next && spots ? (
        <>
          <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-terracota-700 uppercase">
            <Sparkles aria-hidden="true" strokeWidth={1.75} className="size-4 shrink-0" />
            {firstDay.relation === 'hoy' ? 'Próxima clase hoy' : `Próxima clase${SEP}${dayHeading(firstDay)}`}
          </p>
          <p className="mt-3 flex flex-wrap items-baseline gap-x-3">
            <span className="font-display text-3xl">{formatTime(next.startsAt)}</span>
            <span className="font-semibold">{next.name}</span>
          </p>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-piedra">
            <span className="inline-flex items-center gap-1.5">
              <UserRound aria-hidden="true" strokeWidth={1.75} className="size-4" />
              {next.instructor}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock aria-hidden="true" strokeWidth={1.75} className="size-4" />
              {next.durationMinutes} min
            </span>
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            <Badge tone={spots.tone}>{spots.label}</Badge>
            <Link
              to={scheduleLink(next)}
              className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-terracota-600 underline-offset-4 hover:underline"
            >
              Reservar
              <span className="sr-only">
                {' '}
                {next.name} a las {formatTime(next.startsAt)}
              </span>
              <ArrowRight aria-hidden="true" strokeWidth={1.75} className="size-4" />
            </Link>
          </div>
        </>
      ) : (
        <div role="status" className="flex flex-col gap-3">
          <span className="sr-only">Cargando la próxima clase…</span>
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-8 w-44" />
          <Skeleton className="h-4 w-40" />
        </div>
      )}
    </div>
  )
}

function ArchArt() {
  return (
    <div
      aria-hidden="true"
      className="relative mx-auto aspect-[4/5] w-full max-w-[12rem] sm:max-w-[18rem] lg:max-w-md"
    >
      <div className="arch-fill absolute inset-0 overflow-hidden rounded-arch shadow-lg">
        <div className="ember-glow absolute top-[52%] left-1/2 aspect-square w-[95%] -translate-1/2 animate-breathe" />
        <div className="absolute top-[52%] left-1/2 aspect-square w-[18%] -translate-1/2 rounded-full bg-terracota-500 shadow-[0_0_3rem_0.75rem_var(--color-terracota-300)]" />
        <div className="absolute inset-x-0 bottom-0 h-[22%] bg-linear-to-t from-terracota-300/45 to-transparent" />
      </div>
      <div className="absolute inset-[6%] rounded-arch border-2 border-crema/70" />
    </div>
  )
}

export function Hero({ state }: { state: HomeState }) {
  return (
    <section aria-labelledby="hero-titulo" className="hero-backdrop overflow-hidden">
      <div className="container-page grid grid-cols-1 items-center gap-8 pt-8 pb-12 sm:gap-14 sm:pt-16 sm:pb-20 lg:grid-cols-[1.1fr_0.9fr] lg:gap-10 lg:pt-20 lg:pb-28">
        <div className="animate-rise">
          {/* En pantallas estrechas «Valencia» va en su propia línea: ninguna empieza por «·». */}
          <p className="text-xs font-semibold tracking-widest text-terracota-700 uppercase">
            <span>Estudio boutique de pilates</span>
            <span aria-hidden="true" className="hidden sm:inline">
              {' '}
              ·{' '}
            </span>
            <span className="sr-only sm:hidden">, </span>
            <span className="block sm:inline">Valencia</span>
          </p>
          <h1 id="hero-titulo" className="mt-4 text-display sm:mt-5">
            Muévete despacio.{' '}
            <em className="font-display text-terracota-600">Hazte</em> fuerte.
          </h1>
          <p className="mt-6 max-w-xl font-display text-2xl text-tinta-700 italic">{SLOGAN}</p>
          <p className="mt-4 max-w-xl text-lg text-tinta-700">
            Clases de reformer y esterilla en grupos pequeños, con instructoras que corrigen cada
            detalle. Reserva tu plaza en un minuto, sin registros.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink to="/clases" size="lg">
              Reservar clase
              <ArrowRight aria-hidden="true" strokeWidth={1.75} className="size-5" />
            </ButtonLink>
            <a href="#horario-hoy" className={buttonClasses('secondary', 'lg')}>
              Ver horario
            </a>
          </div>
          <ul className="mt-6 flex flex-wrap sm:mt-10 gap-x-6 gap-y-2 text-sm text-piedra">
            {HIGHLIGHTS.map((item) => (
              <li key={item} className="flex items-center gap-2">
                <span aria-hidden="true" className="size-1.5 rounded-full bg-terracota-500" />
                {item}
              </li>
            ))}
          </ul>
          <DemoTryButtons className="mt-4 sm:mt-5" />
        </div>

        <div className="relative">
          <ArchArt />
          <NextClassCard state={state} />
        </div>
      </div>
    </section>
  )
}
