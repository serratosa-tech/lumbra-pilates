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

/** Tipos de clase e instructoras: el catálogo fijo del estudio. */
export interface Catalog {
  classTypes: ClassType[]
  instructors: Instructor[]
}

export type SessionStatus = 'scheduled' | 'cancelled'

/** Clase tal como se guarda. */
export interface SessionRecord {
  id: string
  classTypeId: string
  instructorId: string
  startsAt: IsoDateTime
  durationMinutes: number
  capacity: number
  status: SessionStatus
}

/** Clase lista para mostrar: con su tipo, su instructora y las plazas calculadas a partir de las reservas. */
export interface ClassSession extends SessionRecord {
  name: string
  instructor: string
  level: ClassLevel
  bookedCount: number
  waitlistCount: number
}

/** Datos que el estudio rellena al crear o editar una clase. */
export interface SessionInput {
  classTypeId: string
  instructorId: string
  startsAt: IsoDateTime
  durationMinutes: number
  capacity: number
}

export interface BookingInput {
  sessionId: string
  name: string
  email: string
  phone: string
}

/** `class_cancelled`: la clase la canceló el estudio. */
export type BookingStatus = 'confirmed' | 'waitlisted' | 'cancelled' | 'class_cancelled'
export type BookingSource = 'web' | 'studio'
export type Attendance = 'attended' | 'no_show'

export interface Booking {
  id: string
  code: string
  sessionId: string
  name: string
  email: string
  phone: string
  status: BookingStatus
  source: BookingSource
  createdAt: IsoDateTime
  cancelledAt?: IsoDateTime
  /** Momento en que pasó de la lista de espera a plaza confirmada. */
  promotedAt?: IsoDateTime
  attendance: Attendance | null
}

/** Estado completo del estudio: lo que se guarda y lo que reciben las funciones de negocio. */
export interface StudioState {
  sessions: SessionRecord[]
  bookings: Booking[]
}

/** Una reserva con su clase y, si está en lista de espera, su posición. */
export interface BookingDetails {
  booking: Booking
  session: ClassSession
  waitlistPosition: number | null
}

/** Resultado de una cancelación: la reserva cancelada y, si la hubo, la persona que sube de la lista. */
export interface CancellationResult {
  booking: Booking
  promoted: Booking | null
}

export interface Roster {
  session: ClassSession
  confirmed: Booking[]
  waitlist: Booking[]
  cancelled: Booking[]
}

export interface StudioUser {
  email: string
  name: string
}

export interface SlotOccupancy {
  /** Hora de inicio de la franja (incluida) y de fin (excluida), en hora del estudio. */
  fromHour: number
  toHour: number
  sessions: number
  /** De 0 a 1. */
  occupancy: number
}

export interface WeekMetrics {
  /** Clases programadas (sin contar las canceladas). */
  sessions: number
  /** De 0 a 1. */
  occupancy: number
  fullSessions: number
  waitlisted: number
  cancellations: number
  /** De 0 a 1, sobre las reservas de la semana (sin contar las de clases canceladas). */
  cancellationRate: number
  slots: SlotOccupancy[]
}
