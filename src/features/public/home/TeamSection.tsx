import { Badge, Card, Skeleton } from '../../../components/ui/index.ts'
import type { Instructor } from '../../../data/index.ts'
import { cn } from '../../../lib/cn.ts'
import { SectionHeading } from './SectionHeading.tsx'
import type { HomeState } from './useHomeData.ts'

/** Combinaciones de fondo y texto del avatar (todas con contraste AA). */
const AVATAR_TONES = [
  'bg-terracota-600 text-white',
  'bg-arena-200 text-terracota-700',
  'bg-tinta text-terracota-300',
]

function Avatar({ initials, tone }: { initials: string; tone: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn('relative grid h-24 w-20 shrink-0 place-items-center overflow-hidden rounded-arch', tone)}
    >
      <span className="absolute -bottom-6 size-14 rounded-full bg-current opacity-15" />
      <span className="relative text-2xl font-medium">{initials}</span>
    </span>
  )
}

function InstructorCard({ instructor, index }: { instructor: Instructor; index: number }) {
  return (
    <Card as="li" className="flex flex-col gap-5 sm:flex-row lg:flex-col">
      <Avatar initials={instructor.initials} tone={AVATAR_TONES[index % AVATAR_TONES.length]} />
      <div>
        <h3 className="text-xl">{instructor.name}</h3>
        <p className="mt-0.5 text-sm font-medium text-terracota-700">{instructor.role}</p>
        <p className="mt-3 text-tinta-800">{instructor.bio}</p>
        <ul className="mt-4 flex flex-wrap gap-2" aria-label="Especialidades">
          {instructor.specialties.map((s) => (
            <li key={s}>
              <Badge>{s}</Badge>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  )
}

export function TeamSection({ state }: { state: HomeState }) {
  return (
    <section aria-labelledby="equipo-titulo" className="bg-arena-100 py-12 sm:py-20 lg:py-24">
      <div className="container-page">
        <SectionHeading id="equipo-titulo" kicker="Equipo" title="Manos expertas, ritmo tranquilo">
          <p>Tres instructoras certificadas que conocen tu nombre y cómo se mueve tu cuerpo.</p>
        </SectionHeading>

        {state.status === 'ready' ? (
          <ul className="mt-8 grid sm:mt-12 grid-cols-1 gap-5 lg:grid-cols-3">
            {state.data.instructors.map((instructor, i) => (
              <InstructorCard key={instructor.id} instructor={instructor} index={i} />
            ))}
          </ul>
        ) : (
          state.status === 'loading' && (
            <div role="status" className="mt-8 grid sm:mt-12 grid-cols-1 gap-5 lg:grid-cols-3">
              <span className="sr-only">Cargando el equipo…</span>
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-72 rounded-lg" />
              ))}
            </div>
          )
        )}
      </div>
    </section>
  )
}
