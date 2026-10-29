import type { DataSource } from './DataSource.ts'
import { createDemoDataSource } from './demo/demoDataSource.ts'
import { CLASS_TYPES } from './demo/seed/classTypes.ts'
import { INSTRUCTORS } from './demo/seed/instructors.ts'
import { buildSeedSessions } from './demo/seed/weeklySchedule.ts'

export type { DataSource } from './DataSource.ts'
export type * from './types.ts'

let instance: DataSource | undefined

/** Punto único de elección de la implementación de datos (de momento, la demo en memoria). */
export function getDataSource(): DataSource {
  instance ??= createDemoDataSource({
    classTypes: CLASS_TYPES,
    instructors: INSTRUCTORS,
    sessions: buildSeedSessions(new Date()),
  })
  return instance
}
