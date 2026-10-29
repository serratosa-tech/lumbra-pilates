import { CalendarCheck, KeyRound, UserRoundPen } from 'lucide-react'
import { SectionHeading } from './SectionHeading.tsx'

const STEPS = [
  {
    icon: CalendarCheck,
    title: 'Elige tu clase',
    text: 'Mira el horario de la semana y las plazas libres de cada clase en tiempo real.',
  },
  {
    icon: UserRoundPen,
    title: 'Reserva sin crear cuenta',
    text: 'Solo te pedimos nombre, email y teléfono. Si la clase está llena, entras en la lista de espera.',
  },
  {
    icon: KeyRound,
    title: 'Guarda tu código',
    text: 'Con tu email y el código de reserva puedes consultar o cancelar desde «Mis reservas».',
  },
]

export function HowItWorksSection() {
  return (
    <section aria-labelledby="como-titulo" className="py-20 sm:py-24">
      <div className="container-page">
        <SectionHeading id="como-titulo" kicker="Cómo funciona" title="Reservar es tan sencillo como respirar" />
        <ol className="mt-12 grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-8">
          {STEPS.map(({ icon: Icon, title, text }, i) => (
            <li key={title} className="relative">
              <div className="flex items-center gap-4">
                <span className="grid size-16 shrink-0 place-items-center rounded-arch bg-arena-200 text-terracota-700">
                  <Icon aria-hidden="true" strokeWidth={1.75} className="size-6" />
                </span>
                <span aria-hidden="true" className="font-display text-3xl text-arena-400">
                  {i + 1}
                </span>
              </div>
              <h3 className="mt-5 text-xl">
                <span className="sr-only">Paso {i + 1}: </span>
                {title}
              </h3>
              <p className="mt-2 text-tinta-700">{text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
