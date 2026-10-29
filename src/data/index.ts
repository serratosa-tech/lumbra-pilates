import type { DataSource } from './DataSource.ts'
import { createDemoDataSource } from './demo/demoDataSource.ts'

export type { DataSource } from './DataSource.ts'
export type * from './types.ts'

let instance: DataSource | undefined

/** Punto único de elección de la implementación de datos (de momento, la demo en memoria). */
export function getDataSource(): DataSource {
  instance ??= createDemoDataSource()
  return instance
}
