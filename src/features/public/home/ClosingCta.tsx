import { ArrowRight } from 'lucide-react'
import { LogoMark } from '../../../components/brand/Logo.tsx'
import { ButtonLink } from '../../../components/ui/index.ts'

export function ClosingCta() {
  return (
    <section aria-labelledby="cta-titulo" className="py-12 sm:py-20 lg:py-24">
      {/* @container: con el texto muy grande (menos de 16 rem de ancho; a 320 px con el texto normal mide 18 rem),
          menos relleno lateral y el título un paso menor, para que sus palabras quepan enteras. */}
      <div className="container-page @container">
        <div className="on-dark relative overflow-hidden rounded-xl bg-tinta px-6 py-10 text-center text-crema @max-[16rem]:px-2 sm:px-12 sm:py-14">
          <div aria-hidden="true" className="ember-glow absolute -top-1/2 left-1/2 size-[36rem] max-w-none -translate-x-1/2 opacity-40" />
          <div className="relative">
            <LogoMark surface="dark" className="mx-auto size-14 text-crema" />
            <h2 id="cta-titulo" className="mx-auto mt-5 max-w-xl text-3xl @max-[16rem]:text-2xl">
              Tu primera clase te está esperando
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-arena-200">
              Cruza el umbral: reserva hoy y descubre cómo se siente moverse con calma y salir con fuerza.
            </p>
            <ButtonLink to="/clases" size="lg" className="mt-8">
              Reservar clase
              <ArrowRight aria-hidden="true" strokeWidth={1.75} className="size-5" />
            </ButtonLink>
          </div>
        </div>
      </div>
    </section>
  )
}
