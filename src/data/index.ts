import { createAppDataSource } from './appDataSource.ts'
import type { DataSource } from './DataSource.ts'

export type { DataSource } from './DataSource.ts'
export type * from './types.ts'
export { DataError, errorMessage, type DataErrorCode } from './errors.ts'
export { DEMO_ACCOUNTS, DEMO_EXAMPLES, type DemoAccountKind } from './demoAccounts.ts'
export { CANCELLATION_LIMIT_HOURS, canCancelOnline, cancellationDeadline } from './logic/booking.ts'
export { isBookingCode, normalizeCode } from './logic/codes.ts'
export {
  freeSpots,
  filterSessions,
  hasEnded,
  isBookable,
  sessionState,
  type SessionFilters,
  type SessionState,
} from './logic/schedule.ts'
export { ATTENDANCE_OPENS_MINUTES, CAPACITY_RANGE, DURATION_RANGE, canMarkAttendance } from './logic/sessions.ts'
export {
  validateBookingForm,
  validateEmail,
  validateName,
  validatePhone,
  type BookingFormErrors,
  type BookingFormValues,
} from './logic/validation.ts'

let instance: DataSource | undefined

/** Punto único de acceso a los datos. */
export function getDataSource(): DataSource {
  instance ??= createAppDataSource()
  return instance
}
