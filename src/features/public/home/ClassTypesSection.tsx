import { Clock } from 'lucide-react'
import { Badge, Card, Skeleton } from '../../../components/ui/index.ts'
import type { ClassIntensity, ClassType } from '../../../data/index.ts'
import { cn } from '../../../lib/cn.ts'
import { INTENSITY_LABELS, LEVEL_LABELS } from '../../../components/schedule/labels.ts'
import { SectionHeading } from './SectionHeading.tsx'
import type { HomeState } from './useHomeData.ts'

function IntensityMeter({ value }: { value: ClassIntensity }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-piedra">
      <span aria-hidden="true" className="flex items-end gap-1">
        {[1, 2, 3].map((level) => (
          <span
            key={level}
            className={cn(
              'w-1.5 rounded-full',
              level === 1 ? 'h-2' : level === 2 ? 'h-3' : 'h-4',
              level <= value ? 'bg-terracota-500' : 'bg-arena-200',
            )}
          />
        ))}
      </span>
      Intensidad {INTENSITY_LABELS[value].toLowerCase()}
    </span>
  )
}

function ClassTypeCard({ classType, index }: { classType: ClassType; index: number }) {
  return (
    <Card as="li" interactive className="flex flex-col">
      <span aria-hidden="true" className="text-sm font-medium text-terracota-500 tabular-nums">
        0{index + 1}
      </span>
      <h3 className="mt-3 text-xl">{classType.name}</h3>
      <p className="mt-2 flex-1 text-tinta-700">{classType.summary}</p>
      <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-3 border-t border-arena-200 pt-4">
        <Badge tone="terracota">{LEVEL_LABELS[classType.level]}</Badge>
        <IntensityMeter value={classType.intensity} />
        <span className="inline-flex items-center gap-1.5 text-sm text-piedra">
          <Clock aria-hidden="true" strokeWidth={1.75} className="size-4" />
          {classType.durationMinutes} min
        </span>
      </div>
    </Card>
  )
}

export function ClassTypesSection({ state }: { state: HomeState }) {
  return (
    <section aria-labelledby="clases-titulo" className="py-12 sm:py-20 lg:py-24">
      <div className="container-page">
        <SectionHeading id="clases-titulo" kicker="Clases" title="Cuatro maneras de encontrar tu centro">
          <p>Del primer contacto con el reformer a sesiones que te pondrán a prueba. Elige por nivel e intensidad.</p>
        </SectionHeading>

        {state.status === 'ready' ? (
          <ul className="mt-8 grid sm:mt-12 grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {state.data.classTypes.map((classType, i) => (
              <ClassTypeCard key={classType.id} classType={classType} index={i} />
            ))}
          </ul>
        ) : (
          state.status === 'loading' && (
            <div role="status" className="mt-8 grid sm:mt-12 grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
              <span className="sr-only">Cargando las clases…</span>
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-64 rounded-lg" />
              ))}
            </div>
          )
        )}
      </div>
    </section>
  )
}
