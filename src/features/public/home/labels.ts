import type { BadgeTone } from '../../../components/ui/index.ts'
import type { ClassIntensity, ClassLevel, ClassSession } from '../../../data/index.ts'

export const LEVEL_LABELS: Record<ClassLevel, string> = {
  iniciacion: 'Iniciación',
  intermedio: 'Intermedio',
  avanzado: 'Avanzado',
  todos: 'Todos los niveles',
}

export const INTENSITY_LABELS: Record<ClassIntensity, string> = {
  1: 'Suave',
  2: 'Media',
  3: 'Alta',
}

/** Texto y tono del estado de plazas de una clase. */
export function spotsStatus(session: ClassSession): { label: string; tone: BadgeTone; full: boolean } {
  const free = session.capacity - session.bookedCount
  if (free <= 0) return { label: 'Completa · lista de espera', tone: 'error', full: true }
  if (free === 1) return { label: 'Última plaza', tone: 'aviso', full: false }
  if (free === 2) return { label: 'Últimas 2 plazas', tone: 'aviso', full: false }
  return { label: `${free} plazas libres`, tone: 'exito', full: false }
}
