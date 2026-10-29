/** Fecha y hora en formato ISO 8601. */
export type IsoDateTime = string

export type ClassLevel = 'iniciacion' | 'intermedio' | 'avanzado' | 'todos'

/** Intensidad de 1 (suave) a 3 (alta). */
export type ClassIntensity = 1 | 2 | 3

export interface ClassType {
  id: string
  name: string
  summary: string
  level: ClassLevel
  intensity: ClassIntensity
  durationMinutes: number
}

export interface Instructor {
  id: string
  name: string
  role: string
  bio: string
  specialties: string[]
  initials: string
}

export interface ClassSession {
  id: string
  classTypeId: string
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
