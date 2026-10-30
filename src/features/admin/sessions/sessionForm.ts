import { CAPACITY_RANGE, DURATION_RANGE, type ClassSession, type ClassType, type SessionInput } from '../../../data/index.ts'
import { parseDateKey, studioDate, studioDateTime, toDateKey, toTimeKey, type CalendarDate } from '../../../lib/dates.ts'

export interface SessionFormValues {
  classTypeId: string
  instructorId: string
  /** «2026-11-04» */
  date: string
  /** «18:30» */
  time: string
  durationMinutes: string
  capacity: string
}

export type SessionFormErrors = Partial<Record<keyof SessionFormValues, string>>

/** Campos que propone el tipo de clase. */
export type TypeDefaultField = 'durationMinutes' | 'capacity'
const TYPE_DEFAULT_FIELDS: TypeDefaultField[] = ['durationMinutes', 'capacity']

export function newSessionForm(classType: ClassType | undefined, instructorId: string, date: CalendarDate): SessionFormValues {
  return {
    classTypeId: classType?.id ?? '',
    instructorId,
    date: toDateKey(date),
    time: '18:00',
    durationMinutes: String(classType?.durationMinutes ?? 50),
    capacity: String(classType?.capacity ?? 10),
  }
}

/**
 * Campos que ya no coinciden con lo que propone el tipo de clase: al editar una clase
 * existente, los que se ajustaron en su día cuentan como cambiados a mano.
 */
export function fieldsOffTypeDefaults(values: SessionFormValues, classType: ClassType | undefined): Set<TypeDefaultField> {
  return new Set(TYPE_DEFAULT_FIELDS.filter((field) => !classType || values[field] !== String(classType[field])))
}

/** Cambia el tipo de clase: la duración y el aforo pasan a los del nuevo tipo, salvo los cambiados a mano. */
export function withClassType(
  values: SessionFormValues,
  classType: ClassType | undefined,
  edited: ReadonlySet<TypeDefaultField>,
): SessionFormValues {
  const next = { ...values, classTypeId: classType?.id ?? '' }
  if (!classType) return next
  for (const field of TYPE_DEFAULT_FIELDS) {
    if (!edited.has(field)) next[field] = String(classType[field])
  }
  return next
}

export function sessionToForm(session: ClassSession): SessionFormValues {
  return {
    classTypeId: session.classTypeId,
    instructorId: session.instructorId,
    date: toDateKey(studioDate(new Date(session.startsAt))),
    time: toTimeKey(session.startsAt),
    durationMinutes: String(session.durationMinutes),
    capacity: String(session.capacity),
  }
}

function startOf(values: SessionFormValues): Date | null {
  const date = parseDateKey(values.date)
  const time = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(values.time)
  if (!date || !time) return null
  return studioDateTime(date, Number(time[1]), Number(time[2]))
}

const isIntegerIn = (raw: string, range: { min: number; max: number }) => {
  const n = Number(raw)
  return raw.trim() !== '' && Number.isInteger(n) && n >= range.min && n <= range.max
}

/** Errores del formulario; `booked` son las plazas confirmadas (al editar). */
export function validateSessionForm(values: SessionFormValues, { booked, now }: { booked: number; now: Date }): SessionFormErrors {
  const start = startOf(values)
  const errors: SessionFormErrors = {
    classTypeId: values.classTypeId ? undefined : 'Elige el tipo de clase.',
    instructorId: values.instructorId ? undefined : 'Elige la instructora.',
    date: parseDateKey(values.date) ? undefined : 'Elige una fecha.',
    time: !/^\d{2}:\d{2}$/.test(values.time)
      ? 'Elige la hora de inicio.'
      : start && start <= now
        ? 'La clase tiene que empezar en el futuro.'
        : undefined,
    durationMinutes: isIntegerIn(values.durationMinutes, DURATION_RANGE)
      ? undefined
      : `La duración va de ${DURATION_RANGE.min} a ${DURATION_RANGE.max} minutos.`,
    capacity: !isIntegerIn(values.capacity, CAPACITY_RANGE)
      ? `El aforo va de ${CAPACITY_RANGE.min} a ${CAPACITY_RANGE.max} plazas.`
      : Number(values.capacity) < booked
        ? `Hay ${booked} plazas reservadas: el aforo no puede ser menor.`
        : undefined,
  }
  return Object.fromEntries(Object.entries(errors).filter(([, message]) => message)) as SessionFormErrors
}

/** Convierte el formulario (ya validado) en los datos que espera la capa de datos. */
export function toSessionInput(values: SessionFormValues): SessionInput {
  const start = startOf(values)
  if (!start) throw new Error('Formulario de clase sin validar.')
  return {
    classTypeId: values.classTypeId,
    instructorId: values.instructorId,
    startsAt: start.toISOString(),
    durationMinutes: Number(values.durationMinutes),
    capacity: Number(values.capacity),
  }
}
