import { ArrowRight, Clock, Sparkles, UserRound } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { DemoTryButtons } from '../../../components/account/DemoTryButtons.tsx'
import { spotsStatus } from '../../../components/schedule/labels.ts'
import { Badge, ButtonLink, buttonClasses, Skeleton } from '../../../components/ui/index.ts'
import { cn } from '../../../lib/cn.ts'
import { formatDate, formatTime } from '../../../lib/dates.ts'
import { SLOGAN } from '../../../lib/site.ts'
import { useNow } from '../../../lib/useNow.ts'
import { scheduleLink } from '../schedule/useScheduleParams.ts'
import type { UpcomingDay } from './upcoming.ts'
import type { UpcomingState } from './useHomeData.ts'

const HIGHLIGHTS = ['Grupos reducidos de 8 a 12', 'Reserva sin crear cuenta', 'Lista de espera automática']

/** Primera clase de las próximas, si la hay. */
function nextOf(state: UpcomingState) {
  if (state.status !== 'ready') return undefined
  const day = state.data[0]
  const session = day?.sessions[0]
  return day && session ? { day, session } : undefined
}

/**
 * «Próxima clase hoy», «… mañana» o «… el lunes 9»: corta para que quepa en una línea, como el texto de
 * ejemplo del esqueleto (si no, la tarjeta crecería al llegar los datos). La fecha completa está en el horario.
 */
function nextLabel(day: UpcomingDay): string {
  if (day.relation === 'hoy') return 'Próxima clase hoy'
  if (day.relation === 'manana') return 'Próxima clase mañana'
  return `Próxima clase el ${formatDate(day.sessions[0].startsAt, { month: false })}`
}

/**
 * Texto de ejemplo invisible con una barra de esqueleto encima: ocupa exactamente lo que ocupará el
 * texto real con las mismas clases, así que la tarjeta no cambia de tamaño al llegar los datos.
 */
function Ghost({ children, className, bar = 'inset-x-0 top-1/2 h-[0.8em] -translate-y-1/2' }: { children: ReactNode; className?: string; bar?: string }) {
  return (
    <span className={cn('relative', className)}>
      <span className="invisible">{children}</span>
      <Skeleton className={cn('absolute', bar)} />
    </span>
  )
}

/** El esqueleto de la tarjeta: las mismas filas y clases que NextClassContent, con texto de ejemplo. */
function NextClassSkeleton() {
  return (
    <div role="status">
      <span className="sr-only">Cargando la próxima clase…</span>
      <div aria-hidden="true">
        <p className="flex items-center gap-1.5 text-xs font-medium tracking-wide uppercase">
          <Skeleton className="size-4 shrink-0 rounded-full" />
          <Ghost>Próxima clase mañana</Ghost>
        </p>
        <p className="mt-3 flex flex-wrap items-baseline gap-x-3">
          <Ghost className="text-3xl font-medium">18:00</Ghost>
          <Ghost className="font-medium">Reformer Esencial</Ghost>
        </p>
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <span className="inline-flex items-center gap-1.5">
            <Skeleton className="size-4 rounded-full" />
            <Ghost>Lucía Ferrer</Ghost>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Skeleton className="size-4 rounded-full" />
            <Ghost>50 min</Ghost>
          </span>
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <Ghost bar="inset-0 rounded-full">
            <Badge>Últimas 3 plazas</Badge>
          </Ghost>
          <span className="inline-flex min-h-11 items-center gap-1 text-sm font-medium">
            <Ghost>Reservar</Ghost>
            <Skeleton className="size-4 rounded-full" />
          </span>
        </div>
      </div>
    </div>
  )
}

function NextClassContent({ next }: { next: NonNullable<ReturnType<typeof nextOf>> }) {
  const now = useNow()
  const { day: firstDay, session } = next
  const spots = spotsStatus(session, now)
  // Llena: solo «Completa». «Completa · lista de espera» no cabe en una línea junto a «Reservar» en 320 px
  // (la tarjeta crecería respecto al esqueleto); la lista de espera se ve al reservar y en el horario.
  const spotsLabel = spots.state === 'full' ? 'Completa' : spots.label
  return (
    <>
      <p className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-terracota-700 uppercase">
        <Sparkles aria-hidden="true" strokeWidth={1.75} className="size-4 shrink-0" />
        {nextLabel(firstDay)}
      </p>
      <p className="mt-3 flex flex-wrap items-baseline gap-x-3">
        <span className="text-3xl font-medium">{formatTime(session.startsAt)}</span>
        <span className="font-medium">{session.name}</span>
      </p>
      <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-piedra">
        <span className="inline-flex items-center gap-1.5">
          <UserRound aria-hidden="true" strokeWidth={1.75} className="size-4" />
          {session.instructor}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Clock aria-hidden="true" strokeWidth={1.75} className="size-4" />
          {session.durationMinutes} min
        </span>
      </p>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <Badge tone={spots.tone}>{spotsLabel}</Badge>
        <Link
          to={scheduleLink(session)}
          className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-terracota-600 underline-offset-4 hover:underline"
        >
          Reservar
          <span className="sr-only">
            {' '}
            {session.name} a las {formatTime(session.startsAt)}
          </span>
          <ArrowRight aria-hidden="true" strokeWidth={1.75} className="size-4" />
        </Link>
      </div>
    </>
  )
}

/** Entrada de la caja: esperando su paso (aún invisible), subiendo o ya en su sitio. */
type Entry = 'waiting' | 'entering' | 'entered'

/**
 * Tarjeta «Próxima clase» del héroe. La caja, con el esqueleto dentro, es el último paso de la
 * entrada del héroe (hero-step). Los datos nunca suman un segundo efecto al de la caja:
 * - si llegan antes de que la caja empiece a verse, el contenido sube con ella, sin fundido propio;
 * - si llegan mientras sube, el esqueleto sigue hasta que termina y entonces el contenido se funde;
 * - si llegan después, solo el contenido se funde (200 ms), sin mover la caja.
 * Si falla o no quedan clases, la tarjeta se desvanece y se retira; si aún no se veía, se retira sin
 * más. Con prefers-reduced-motion la regla global anula duraciones y retrasos: nada se mueve.
 */
function NextClassCard({ state }: { state: UpcomingState }) {
  const next = nextOf(state)
  // Lo último que se mostró con datos: si después no quedan clases, se desvanece eso y no un esqueleto.
  const [lastShown, setLastShown] = useState<UpcomingState | null>(null)
  // El estado (error o sin clases) cuyo fundido de salida ya terminó.
  const [goneFor, setGoneFor] = useState<UpcomingState | null>(null)
  const [entry, setEntry] = useState<Entry>('waiting')
  // Cómo aparece el contenido, decidido la primera vez que puede mostrarse: con la caja o con su fundido.
  const [contentIn, setContentIn] = useState<'withBox' | 'reveal' | null>(null)
  if (next && lastShown !== state) setLastShown(state)

  const leaving = state.status === 'error' || (state.status === 'ready' && !next)
  if (leaving && (entry === 'waiting' || goneFor === state)) return null
  const shown = next ?? (leaving && lastShown ? nextOf(lastShown) : undefined)
  const mode = contentIn ?? (shown && entry !== 'entering' ? (entry === 'waiting' ? 'withBox' : 'reveal') : null)
  if (mode !== contentIn) setContentIn(mode)
  // La salida espera a que termine la entrada: cambiar de animación a media subida daría un salto.
  const fading = leaving && entry === 'entered'

  return (
    // Ancho: 2rem menos que la columna, pero nunca menos de 18rem (sin pasar de la columna). En 320 px y
    // con el texto del navegador muy grande ocupa toda la columna: así no parte palabras y la hora y el
    // nombre de la clase caben en una línea, igual que en el esqueleto.
    <div className="relative mx-auto -mt-16 w-[min(100%,max(calc(100%-2rem),18rem))] max-w-xs lg:absolute lg:-bottom-8 lg:left-0 lg:mt-0 lg:w-80 lg:max-w-none">
      <div
        className={cn(
          'rounded-lg border border-arena-200 bg-white/95 p-5 shadow-lg backdrop-blur',
          fading ? 'animate-fade-out' : 'hero-step [--step:8]',
        )}
        onAnimationStart={(event) => {
          if (event.target === event.currentTarget && entry === 'waiting') setEntry('entering')
        }}
        onAnimationEnd={(event) => {
          if (event.target !== event.currentTarget) return
          if (entry !== 'entered') setEntry('entered')
          else if (leaving) setGoneFor(state)
        }}
      >
        {shown && mode ? (
          <div className={mode === 'reveal' ? 'animate-reveal' : undefined}>
            <NextClassContent next={shown} />
          </div>
        ) : (
          <NextClassSkeleton />
        )}
      </div>
    </div>
  )
}

function ArchArt() {
  return (
    <div
      aria-hidden="true"
      className="hero-step relative mx-auto aspect-[4/5] w-full max-w-[12rem] [--step:7] sm:max-w-[18rem] lg:max-w-md"
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

export function Hero({ state }: { state: UpcomingState }) {
  return (
    <section aria-labelledby="hero-titulo" className="hero-backdrop overflow-hidden">
      <div className="container-page grid grid-cols-1 items-center gap-8 pt-8 pb-12 sm:gap-14 sm:pt-16 sm:pb-20 lg:grid-cols-[1.1fr_0.9fr] lg:gap-10 lg:pt-20 lg:pb-28">
        {/* Entrada escalonada (hero-step, 60 ms por paso): texto de arriba abajo, el arco y la tarjeta. */}
        <div>
          {/* En pantallas estrechas «Valencia» va en su propia línea: ninguna empieza por «·». */}
          <p className="hero-step text-xs font-medium tracking-widest text-terracota-700 uppercase [--step:0]">
            <span>Estudio boutique de pilates</span>
            <span aria-hidden="true" className="hidden sm:inline">
              {' '}
              ·{' '}
            </span>
            <span className="sr-only sm:hidden">, </span>
            <span className="block sm:inline">Valencia</span>
          </p>
          <h1 id="hero-titulo" className="hero-step mt-4 text-display [--step:1] sm:mt-5">
            Muévete despacio.{' '}
            <em className="text-terracota-600 not-italic">Hazte</em> fuerte.
          </h1>
          <p className="hero-step mt-6 max-w-xl text-2xl font-medium text-tinta-800 [--step:2]">{SLOGAN}</p>
          <p className="hero-step mt-4 max-w-xl text-lg text-tinta-800 [--step:3]">
            Clases de reformer y esterilla en grupos pequeños, con instructoras que corrigen cada
            detalle. Reserva tu plaza en un minuto, sin registros.
          </p>
          <div className="hero-step mt-8 flex flex-wrap gap-3 [--step:4]">
            <ButtonLink to="/clases" size="lg">
              Reservar clase
              <ArrowRight aria-hidden="true" strokeWidth={1.75} className="size-5" />
            </ButtonLink>
            <a href="#horario-hoy" className={buttonClasses('secondary', 'lg')}>
              Ver horario
            </a>
          </div>
          <ul className="hero-step mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-piedra [--step:5] sm:mt-10">
            {HIGHLIGHTS.map((item) => (
              <li key={item} className="flex items-center gap-2">
                <span aria-hidden="true" className="size-1.5 rounded-full bg-terracota-500" />
                {item}
              </li>
            ))}
          </ul>
          <DemoTryButtons className="hero-step mt-4 [--step:6] sm:mt-5" />
        </div>

        <div className="relative">
          <ArchArt />
          <NextClassCard state={state} />
        </div>
      </div>
    </section>
  )
}
