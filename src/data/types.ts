/** Fecha y hora en formato ISO 8601. */
export type IsoDateTime = string

export interface ClassSession {
  id: string
  name: string
  instructor: string
  startsAt: IsoDateTime
  durationMinutes: number
  capacity: number
  bookedCount: number
}

export interface BookingInput {
  sessionId: string
  name: string
  email: string
  phone: string
}

export type BookingStatus = 'confirmed' | 'waitlisted' | 'cancelled'

export interface Booking {
  id: string
  code: string
  sessionId: string
  name: string
  email: string
  phone: string
  status: BookingStatus
  createdAt: IsoDateTime
}
