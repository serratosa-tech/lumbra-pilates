import { ArrowLeft, CalendarDays } from 'lucide-react'
import { ARCH_PATH, THRESHOLD_PATH } from '../../components/brand/logoPaths.ts'
import { Seo } from '../../components/Seo.tsx'
import { ButtonLink } from '../../components/ui/index.ts'

export function NotFoundPage() {
  return (
    <div className="container-page flex flex-col items-center py-20 text-center sm:py-28">
      <Seo
        title="Página no encontrada"
        description="La página que buscas no existe o ha cambiado de sitio."
        noindex
      />
      {/* El umbral sin su punto de luz. */}
      <svg viewBox="0 0 48 48" aria-hidden="true" className="size-28 text-tinta-700">
        <circle cx="24" cy="30" r="4.5" className="fill-none stroke-arena-400" strokeWidth="1.5" strokeDasharray="2 2.5" />
        <path d={ARCH_PATH} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        <path d={THRESHOLD_PATH} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <p className="mt-6 text-xs font-medium tracking-widest text-terracota-700 uppercase">Error 404</p>
      <h1 className="mt-3 max-w-xl text-3xl">Esta puerta no lleva a ninguna parte</h1>
      <p className="mt-4 max-w-md text-lg text-tinta-700">
        La página que buscas no existe o ha cambiado de sitio. Respira hondo: volvemos al inicio en un
        momento.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <ButtonLink to="/" icon={<ArrowLeft aria-hidden="true" strokeWidth={1.75} className="size-4" />}>
          Volver al inicio
        </ButtonLink>
        <ButtonLink
          to="/#horario-hoy"
          variant="secondary"
          icon={<CalendarDays aria-hidden="true" strokeWidth={1.75} className="size-4" />}
        >
          Ver el horario
        </ButtonLink>
      </div>
    </div>
  )
}
