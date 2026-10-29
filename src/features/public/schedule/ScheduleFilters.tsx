import { SlidersHorizontal, X } from 'lucide-react'
import { useState } from 'react'
import { LEVEL_LABELS, plural } from '../../../components/schedule/labels.ts'
import { Button, Field, Select, Sheet } from '../../../components/ui/index.ts'
import type { ClassType, Instructor, SessionFilters } from '../../../data/index.ts'
import { cn } from '../../../lib/cn.ts'
import { FILTER_LEVELS } from './useScheduleParams.ts'

interface ScheduleFiltersProps {
  filters: SessionFilters
  activeCount: number
  classTypes: ClassType[]
  instructors: Instructor[]
  /** Clases de la semana con los filtros aplicados. */
  resultCount: number
  onChange: (name: keyof SessionFilters, value: string) => void
  onClear: () => void
}

function FilterFields({
  filters,
  classTypes,
  instructors,
  onChange,
  className,
}: Pick<ScheduleFiltersProps, 'filters' | 'classTypes' | 'instructors' | 'onChange'> & { className?: string }) {
  return (
    <div className={className}>
      <Field label="Tipo de clase">
        {(control) => (
          <Select {...control} value={filters.classTypeId ?? ''} onChange={(e) => onChange('classTypeId', e.target.value)}>
            <option value="">Todas</option>
            {classTypes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Field label="Instructora">
        {(control) => (
          <Select {...control} value={filters.instructorId ?? ''} onChange={(e) => onChange('instructorId', e.target.value)}>
            <option value="">Todas</option>
            {instructors.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Field label="Nivel">
        {(control) => (
          <Select {...control} value={filters.level ?? ''} onChange={(e) => onChange('level', e.target.value)}>
            <option value="">Todos</option>
            {FILTER_LEVELS.map((level) => (
              <option key={level} value={level}>
                {LEVEL_LABELS[level]}
              </option>
            ))}
          </Select>
        )}
      </Field>
    </div>
  )
}

/** Filtros combinables: en línea desde 768 px y en un panel lateral en móvil. */
export function ScheduleFilters(props: ScheduleFiltersProps) {
  const { activeCount, resultCount, onClear } = props
  const [open, setOpen] = useState(false)
  const clearButton = (
    <Button variant="ghost" onClick={onClear} icon={<X aria-hidden="true" strokeWidth={1.75} className="size-4" />}>
      Quitar filtros
    </Button>
  )

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 md:hidden">
        <Button
          variant="secondary"
          onClick={() => setOpen(true)}
          aria-expanded={open}
          icon={<SlidersHorizontal aria-hidden="true" strokeWidth={1.75} className="size-4" />}
        >
          Filtros
          {activeCount > 0 && (
            <span className="grid min-w-6 place-items-center rounded-full bg-terracota-600 px-1.5 text-xs text-white">
              {activeCount}
              <span className="sr-only"> activos</span>
            </span>
          )}
        </Button>
        {activeCount > 0 && clearButton}
      </div>

      <div className="hidden items-end gap-4 md:flex">
        <FilterFields {...props} className="grid flex-1 grid-cols-3 gap-4 lg:max-w-3xl" />
        <div className={cn(activeCount === 0 && 'invisible')}>{clearButton}</div>
      </div>

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="Filtrar clases"
        footer={
          <>
            {activeCount > 0 && clearButton}
            <Button onClick={() => setOpen(false)}>Ver {plural(resultCount, 'clase')}</Button>
          </>
        }
      >
        <FilterFields {...props} className="flex flex-col gap-5" />
      </Sheet>
    </div>
  )
}
