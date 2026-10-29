import { addDays, startOfWeek, studioDate, studioDateTime } from '../../../lib/dates.ts'
import type { ClassSession } from '../../types.ts'
import { CLASS_TYPES } from './classTypes.ts'
import { INSTRUCTORS } from './instructors.ts'

interface ScheduleSlot {
  /** 1 = lunes … 6 = sábado (el domingo el estudio cierra). */
  weekday: number
  time: string
  classTypeId: string
  instructorId: string
  capacity: number
  /** Plazas ocupadas en la semana actual; la siguiente semana va algo más libre. */
  booked: number
}

const SLOTS: ScheduleSlot[] = [
  { weekday: 1, time: '08:00', classTypeId: 'reformer-esencial', instructorId: 'lucia-ferrer', capacity: 8, booked: 6 },
  { weekday: 1, time: '10:00', classTypeId: 'mat-flow', instructorId: 'marta-ibanez', capacity: 12, booked: 7 },
  { weekday: 1, time: '14:00', classTypeId: 'respira-y-estira', instructorId: 'nerea-soler', capacity: 10, booked: 4 },
  { weekday: 1, time: '18:30', classTypeId: 'reformer-intenso', instructorId: 'lucia-ferrer', capacity: 8, booked: 8 },
  { weekday: 1, time: '20:00', classTypeId: 'mat-flow', instructorId: 'marta-ibanez', capacity: 12, booked: 11 },

  { weekday: 2, time: '07:30', classTypeId: 'reformer-intenso', instructorId: 'lucia-ferrer', capacity: 8, booked: 7 },
  { weekday: 2, time: '09:30', classTypeId: 'respira-y-estira', instructorId: 'nerea-soler', capacity: 10, booked: 5 },
  { weekday: 2, time: '13:30', classTypeId: 'reformer-esencial', instructorId: 'lucia-ferrer', capacity: 8, booked: 3 },
  { weekday: 2, time: '19:00', classTypeId: 'mat-flow', instructorId: 'marta-ibanez', capacity: 12, booked: 12 },
  { weekday: 2, time: '20:15', classTypeId: 'respira-y-estira', instructorId: 'nerea-soler', capacity: 10, booked: 8 },

  { weekday: 3, time: '08:00', classTypeId: 'reformer-esencial', instructorId: 'lucia-ferrer', capacity: 8, booked: 5 },
  { weekday: 3, time: '10:00', classTypeId: 'mat-flow', instructorId: 'marta-ibanez', capacity: 12, booked: 6 },
  { weekday: 3, time: '14:00', classTypeId: 'reformer-intenso', instructorId: 'lucia-ferrer', capacity: 8, booked: 4 },
  { weekday: 3, time: '18:30', classTypeId: 'reformer-esencial', instructorId: 'lucia-ferrer', capacity: 8, booked: 8 },
  { weekday: 3, time: '20:00', classTypeId: 'respira-y-estira', instructorId: 'nerea-soler', capacity: 10, booked: 9 },

  { weekday: 4, time: '07:30', classTypeId: 'mat-flow', instructorId: 'marta-ibanez', capacity: 12, booked: 5 },
  { weekday: 4, time: '09:30', classTypeId: 'reformer-esencial', instructorId: 'lucia-ferrer', capacity: 8, booked: 7 },
  { weekday: 4, time: '13:30', classTypeId: 'respira-y-estira', instructorId: 'nerea-soler', capacity: 10, booked: 2 },
  { weekday: 4, time: '18:00', classTypeId: 'reformer-intenso', instructorId: 'lucia-ferrer', capacity: 8, booked: 8 },
  { weekday: 4, time: '19:15', classTypeId: 'mat-flow', instructorId: 'marta-ibanez', capacity: 12, booked: 10 },
  { weekday: 4, time: '20:30', classTypeId: 'respira-y-estira', instructorId: 'nerea-soler', capacity: 10, booked: 6 },

  { weekday: 5, time: '08:00', classTypeId: 'reformer-intenso', instructorId: 'lucia-ferrer', capacity: 8, booked: 6 },
  { weekday: 5, time: '10:00', classTypeId: 'respira-y-estira', instructorId: 'nerea-soler', capacity: 10, booked: 7 },
  { weekday: 5, time: '14:00', classTypeId: 'mat-flow', instructorId: 'marta-ibanez', capacity: 12, booked: 4 },
  { weekday: 5, time: '18:00', classTypeId: 'reformer-esencial', instructorId: 'lucia-ferrer', capacity: 8, booked: 7 },

  { weekday: 6, time: '09:30', classTypeId: 'mat-flow', instructorId: 'marta-ibanez', capacity: 12, booked: 12 },
  { weekday: 6, time: '11:00', classTypeId: 'reformer-esencial', instructorId: 'lucia-ferrer', capacity: 8, booked: 8 },
  { weekday: 6, time: '12:15', classTypeId: 'respira-y-estira', instructorId: 'nerea-soler', capacity: 10, booked: 6 },
]

const WEEKS = 2

/** Genera las clases de esta semana y la siguiente a partir de la plantilla semanal. */
export function buildSeedSessions(now: Date): ClassSession[] {
  const monday = startOfWeek(studioDate(now))
  const sessions: ClassSession[] = []

  for (let week = 0; week < WEEKS; week++) {
    for (const slot of SLOTS) {
      const classType = CLASS_TYPES.find((t) => t.id === slot.classTypeId)
      const instructor = INSTRUCTORS.find((i) => i.id === slot.instructorId)
      if (!classType || !instructor) throw new Error(`Plantilla incoherente: ${slot.classTypeId}`)

      const date = addDays(monday, week * 7 + slot.weekday - 1)
      const [hour, minute] = slot.time.split(':').map(Number)
      const startsAt = studioDateTime(date, hour, minute).toISOString()

      sessions.push({
        id: `${slot.classTypeId}-${startsAt.slice(0, 16)}`,
        classTypeId: classType.id,
        name: classType.name,
        instructor: instructor.name,
        startsAt,
        durationMinutes: classType.durationMinutes,
        capacity: slot.capacity,
        bookedCount: week === 0 ? slot.booked : Math.max(0, slot.booked - 3),
      })
    }
  }
  return sessions
}
