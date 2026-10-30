import type { DataSource } from './DataSource.ts'
import { createDemoDataSource, type DemoDataSource } from './demo/demoDataSource.ts'
import { DEMO_EXAMPLES as SEED_EXAMPLES } from './demo/seed/index.ts'

export type { DataSource } from './DataSource.ts'
export type * from './types.ts'
export { DataError, errorMessage, type DataErrorCode } from './errors.ts'
export { DEMO_CREDENTIALS } from './demo/demoDataSource.ts'
export { CANCELLATION_LIMIT_HOURS, canCancelOnline, cancellationDeadline } from './logic/booking.ts'
export { isBookingCode, normalizeCode } from './logic/codes.ts'
export { freeSpots, filterSessions, isBookable, sessionState, type SessionFilters, type SessionState } from './logic/schedule.ts'
export { ATTENDANCE_OPENS_MINUTES, CAPACITY_RANGE, DURATION_RANGE, canMarkAttendance } from './logic/sessions.ts'
export {
  validateBookingForm,
  validateEmail,
  validateName,
  validatePhone,
  type BookingFormErrors,
  type BookingFormValues,
} from './logic/validation.ts'

/** Reservas de ejemplo que la demo enseña en «Mis reservas». */
export const DEMO_EXAMPLES = SEED_EXAMPLES.map(({ customer, code, label }) => ({ email: customer.email, code, label }))

function browserStorage(kind: 'localStorage' | 'sessionStorage'): Storage | null {
  try {
    return window[kind]
  } catch {
    return null
  }
}

let instance: DemoDataSource | undefined

function demo(): DemoDataSource {
  instance ??= createDemoDataSource({
    storage: browserStorage('localStorage'),
    authStorage: browserStorage('sessionStorage'),
    latencyMs: import.meta.env.MODE === 'test' ? 0 : 300,
    syncTabs: true,
  })
  return instance
}

/** Punto único de elección de la implementación de datos (de momento, la demo en el navegador). */
export function getDataSource(): DataSource {
  return demo()
}

/** Restablece la demo a sus datos de ejemplo (solo existe en la demo). */
export function resetDemoData(): Promise<void> {
  return demo().reset()
}
