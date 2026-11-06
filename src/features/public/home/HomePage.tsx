import { Seo } from '../../../components/Seo.tsx'
import { ClassTypesSection } from './ClassTypesSection.tsx'
import { ClosingCta } from './ClosingCta.tsx'
import { Hero } from './Hero.tsx'
import { HowItWorksSection } from './HowItWorksSection.tsx'
import { TeamSection } from './TeamSection.tsx'
import { TodaySchedule } from './TodaySchedule.tsx'
import { useHomeData } from './useHomeData.ts'

export function HomePage() {
  const { upcoming, catalog } = useHomeData()
  return (
    <>
      <Seo
        title="Lumbra Pilates · Estudio de pilates boutique en Valencia"
        description="Reformer y pilates en esterilla en grupos reducidos en Valencia. Consulta el horario, mira las plazas libres y reserva tu clase en un minuto, sin crear cuenta."
      />
      <Hero state={upcoming.state} />
      <TodaySchedule state={upcoming.state} onRetry={upcoming.retry} />
      <ClassTypesSection state={catalog.state} onRetry={catalog.retry} />
      <HowItWorksSection />
      <TeamSection state={catalog.state} onRetry={catalog.retry} />
      <ClosingCta />
    </>
  )
}
