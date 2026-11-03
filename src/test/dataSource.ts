import { createDemoDataSource } from '../data/demo/demoDataSource.ts'
import { memoryStorage } from './fixtures.ts'

/** La fuente de datos que reciben los componentes en los tests: la demo en memoria, sin red. */
export const testDataSource = createDemoDataSource({ authStorage: memoryStorage() })

/** Vuelve a los datos de ejemplo y cierra la sesión. */
export async function resetTestData(): Promise<void> {
  await testDataSource.reset()
  await testDataSource.signOut()
}
