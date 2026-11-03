import { Clock, Mail, MapPin } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { SLOGAN, STUDIO } from '../../lib/site.ts'
import { LogoFull } from '../brand/Logo.tsx'
import { PRIMARY_NAV } from './navigation.ts'

const LINK_CLASSES =
  'inline-flex min-h-11 items-center text-arena-200 underline decoration-arena-200/40 underline-offset-4 transition-colors hover:text-white hover:decoration-terracota-300'

function FooterColumn({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h2 className="font-sans text-xs font-semibold tracking-widest text-terracota-300 uppercase">{title}</h2>
      <div className="mt-3">{children}</div>
    </div>
  )
}

const YEAR = new Date().getFullYear()

const LEGAL_NAV = [
  { to: '/aviso-legal', label: 'Aviso legal' },
  { to: '/privacidad', label: 'Privacidad' },
  { to: '/privacidad#cookies', label: 'Cookies' },
]

export function SiteFooter() {
  return (
    <footer className="on-dark bg-tinta text-arena-200">
      <div className="container-page grid grid-cols-1 gap-8 py-10 sm:grid-cols-2 sm:gap-10 sm:py-14 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <LogoFull surface="dark" title="Lumbra Pilates" className="h-11 w-auto text-crema" />
          <p className="mt-4 max-w-xs font-display text-lg text-crema italic">{SLOGAN}</p>
        </div>

        <FooterColumn title="Visítanos">
          <address className="flex flex-col gap-2 not-italic">
            <span className="flex items-start gap-2">
              <MapPin aria-hidden="true" strokeWidth={1.75} className="mt-0.5 size-5 shrink-0 text-terracota-300" />
              <span>
                {STUDIO.street}
                <br />
                {STUDIO.postalCode} {STUDIO.city}
              </span>
            </span>
            <span className="flex items-center gap-2">
              <Mail aria-hidden="true" strokeWidth={1.75} className="size-5 shrink-0 text-terracota-300" />
              <a href={`mailto:${STUDIO.email}`} className={`${LINK_CLASSES} break-all`}>
                {STUDIO.email}
              </a>
            </span>
          </address>
        </FooterColumn>

        <FooterColumn title="Horario">
          <dl className="flex flex-col gap-2">
            {STUDIO.hours.map((h) => (
              <div key={h.days} className="flex items-start gap-2">
                <Clock aria-hidden="true" strokeWidth={1.75} className="mt-0.5 size-5 shrink-0 text-terracota-300" />
                <div>
                  <dt className="text-crema">{h.days}</dt>
                  <dd>{h.time}</dd>
                </div>
              </div>
            ))}
          </dl>
        </FooterColumn>

        <FooterColumn title="Explora">
          <ul>
            {PRIMARY_NAV.map((item) => (
              <li key={item.to}>
                <Link to={item.to} className={LINK_CLASSES}>
                  {item.label}
                </Link>
              </li>
            ))}
            <li>
              <Link to="/sistema" className={LINK_CLASSES}>
                Sistema de diseño
              </Link>
            </li>
          </ul>
        </FooterColumn>
      </div>

      <div className="border-t border-arena-200/15">
        <div className="container-page flex flex-col gap-x-8 gap-y-1 py-4 text-sm md:flex-row md:items-center md:justify-between">
          <p className="py-2">© {YEAR} Lumbra Pilates. Estudio ficticio: demo de portafolio de Helena Serratosa.</p>
          <nav aria-label="Legal">
            <ul className="flex flex-wrap gap-x-5">
              {LEGAL_NAV.map((item) => (
                <li key={item.to}>
                  <Link to={item.to} className={LINK_CLASSES}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>
    </footer>
  )
}
