import type { Catalog } from '../../types.ts'
import { CLASS_TYPES } from './classTypes.ts'
import { INSTRUCTORS } from './instructors.ts'

export { buildSeed, DEMO_EXAMPLES } from './bookings.ts'

export const DEMO_CATALOG: Catalog = { classTypes: CLASS_TYPES, instructors: INSTRUCTORS }
