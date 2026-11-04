import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Seo } from '../../../components/Seo.tsx'
import { Alert } from '../../../components/ui/index.ts'
import { LEGAL_UPDATED } from '../../../lib/site.ts'

export interface LegalSection {
  /** Ancla de la sección (por ejemplo, /privacidad#cookies). */
  id: string
  title: string
  body: ReactNode
}

interface LegalPageProps {
  eyebrow: string
  title: string
  seoTitle: string
  description: string
  intro: ReactNode
  sections: LegalSection[]
}

export const LEGAL_LINK = 'font-medium text-terracota-700 underline underline-offset-4 hover:text-terracota-600'

/** Estructura común de las páginas legales: título, fecha, índice con anclas y secciones. */
export function LegalPage({ eyebrow, title, seoTitle, description, intro, sections }: LegalPageProps) {
  return (
    <div className="container-page py-10 sm:py-14 lg:py-16">
      <Seo title={seoTitle} description={description} />
      <article className="max-w-2xl">
        <p className="text-xs font-medium tracking-widest text-terracota-700 uppercase">{eyebrow}</p>
        <h1 className="mt-3 text-3xl">{title}</h1>
        <p className="mt-2 text-sm text-piedra">Última actualización: {LEGAL_UPDATED}</p>
        <div className="mt-5 text-lg text-tinta-800">{intro}</div>
        <Alert tone="info" title="Esto es una demo" className="mt-6">
          No introduzcas datos reales: usa nombres, emails y teléfonos inventados.
        </Alert>

        <nav aria-label="En esta página" className="mt-8 rounded-md border border-arena-200 bg-white p-4 sm:p-5">
          <h2 className="text-sm font-medium">En esta página</h2>
          <ol className="mt-2 grid grid-cols-1 gap-x-6 sm:grid-cols-2">
            {sections.map((section, index) => (
              <li key={section.id}>
                <Link
                  to={{ hash: section.id }}
                  className="flex min-h-11 items-center gap-2 text-sm text-tinta-700 underline decoration-arena-400 underline-offset-4 hover:text-tinta hover:decoration-terracota-600"
                >
                  <span aria-hidden="true" className="w-5 shrink-0 tabular-nums text-piedra">
                    {index + 1}.
                  </span>
                  {section.title}
                </Link>
              </li>
            ))}
          </ol>
        </nav>

        <div className="mt-10 flex flex-col gap-10 text-tinta-800">
          {sections.map((section) => (
            <section key={section.id} id={section.id} aria-labelledby={`${section.id}-titulo`} className="scroll-mt-24">
              <h2 id={`${section.id}-titulo`} className="text-xl text-tinta">
                {section.title}
              </h2>
              <div className="mt-3 flex flex-col gap-3 [&_li]:ml-5 [&_li]:list-disc [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-2">
                {section.body}
              </div>
            </section>
          ))}
        </div>
      </article>
    </div>
  )
}
