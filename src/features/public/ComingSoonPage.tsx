import { ArrowLeft, type LucideIcon } from 'lucide-react'
import { Seo } from '../../components/Seo.tsx'
import { ButtonLink, EmptyState } from '../../components/ui/index.ts'

interface ComingSoonPageProps {
  title: string
  description: string
  icon: LucideIcon
}

/** Página provisional de una sección que se construye en una fase posterior. */
export function ComingSoonPage({ title, description, icon }: ComingSoonPageProps) {
  return (
    <div className="container-page py-16 sm:py-24">
      <Seo title={title} description={description} noindex />
      <h1 className="text-3xl">{title}</h1>
      <EmptyState
        icon={icon}
        headingLevel="h2"
        title="Muy pronto, aquí"
        className="mt-8"
        action={
          <ButtonLink to="/#horario-hoy" variant="secondary" icon={<ArrowLeft aria-hidden="true" strokeWidth={1.75} className="size-4" />}>
            Ver las clases de hoy
          </ButtonLink>
        }
      >
        {description}
      </EmptyState>
    </div>
  )
}
