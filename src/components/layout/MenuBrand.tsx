import { Clock, Mail } from 'lucide-react'
import { SLOGAN, STUDIO } from '../../lib/site.ts'
import { LogoMark } from '../brand/Logo.tsx'

/** Cierre de marca del menú móvil: símbolo, eslogan, horario y email (mismos datos que el pie). */
export function MenuBrand() {
  return (
    <section aria-label="Sobre el estudio" className="border-t border-arena-200 pt-6 text-sm text-piedra">
      <LogoMark className="size-10 text-tinta" />
      <p className="mt-3 text-lg text-tinta-800">{SLOGAN}</p>
      <dl className="mt-4 flex flex-col gap-2">
        {STUDIO.hours.map((h) => (
          <div key={h.days} className="flex items-start gap-2">
            <Clock aria-hidden="true" strokeWidth={1.75} className="mt-0.5 size-4 shrink-0 text-terracota-600" />
            <div className="flex flex-wrap gap-x-2">
              <dt className="font-medium text-tinta-700">{h.days}</dt>
              <dd>{h.time}</dd>
            </div>
          </div>
        ))}
      </dl>
      <p className="mt-1 flex items-center gap-2">
        <Mail aria-hidden="true" strokeWidth={1.75} className="size-4 shrink-0 text-terracota-600" />
        <a
          href={`mailto:${STUDIO.email}`}
          className="inline-flex min-h-11 items-center font-medium break-all text-terracota-600 underline decoration-terracota-600/40 underline-offset-4 hover:decoration-terracota-600"
        >
          {STUDIO.email}
        </a>
      </p>
    </section>
  )
}
