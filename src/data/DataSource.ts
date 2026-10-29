import type {
  Attendance,
  Booking,
  BookingDetails,
  BookingInput,
  CancellationResult,
  ClassSession,
  ClassType,
  Instructor,
  IsoDateTime,
  Roster,
  SessionInput,
  StudioUser,
  WeekMetrics,
} from './types.ts'

/**
 * Contrato de acceso a datos. La app solo depende de esta interfaz;
 * la implementación concreta (demo en el navegador o Supabase) se elige en `src/data/index.ts`.
 * Los errores de negocio llegan como `DataError` con un código estable.
 */
export interface DataSource {
  // Público
  /** Tipos de clase que ofrece el estudio. */
  listClassTypes(): Promise<ClassType[]>
  /** Equipo de instructoras. */
  listInstructors(): Promise<Instructor[]>
  /** Clases (también las canceladas) que empiezan dentro de [from, to), por orden de hora. */
  listSessions(from: IsoDateTime, to: IsoDateTime): Promise<ClassSession[]>
  /** Una clase, o null si no existe. */
  getSession(id: string): Promise<ClassSession | null>
  /** Reserva una plaza; si la clase está llena, la reserva entra en lista de espera. */
  createBooking(input: BookingInput): Promise<BookingDetails>
  /** Reserva de una persona, identificada por su email y su código; null si no coinciden. */
  findBooking(email: string, code: string): Promise<BookingDetails | null>
  /** Cancela la reserva (hasta 2 h antes) y, si liberaba plaza, sube a la primera de la lista de espera. */
  cancelBooking(email: string, code: string): Promise<CancellationResult>
  /** Avisa de cualquier cambio en los datos; devuelve la función para dejar de escuchar. */
  subscribe(listener: () => void): () => void

  // Panel del estudio (requieren sesión iniciada)
  signIn(email: string, password: string): Promise<StudioUser>
  signOut(): Promise<void>
  getStudioUser(): Promise<StudioUser | null>
  getRoster(sessionId: string): Promise<Roster>
  createSession(input: SessionInput): Promise<ClassSession>
  updateSession(id: string, input: SessionInput): Promise<{ session: ClassSession; promoted: Booking[] }>
  /** Cancela la clase; devuelve las reservas afectadas. */
  cancelSession(id: string): Promise<Booking[]>
  addManualBooking(input: BookingInput): Promise<BookingDetails>
  cancelBookingById(bookingId: string): Promise<CancellationResult>
  setAttendance(bookingId: string, attendance: Attendance | null): Promise<Booking>
  getMetrics(from: IsoDateTime, to: IsoDateTime): Promise<WeekMetrics>
}
