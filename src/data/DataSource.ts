import type {
  Account,
  Attendance,
  Booking,
  BookingDetails,
  BookingInput,
  CancellationResult,
  ClassSession,
  ClassType,
  ClientCancellation,
  Instructor,
  IsoDateTime,
  Roster,
  SessionInput,
  WeekMetrics,
} from './types.ts'

/**
 * Contrato de acceso a datos. La app solo depende de esta interfaz; la implementación es la de
 * Supabase (`src/data/supabase`) y, en los tests, la demo en memoria (`src/data/demo`).
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
  /**
   * Reserva una plaza; si la clase está llena, la reserva entra en lista de espera.
   * Con sesión iniciada, la reserva queda ligada a la cuenta (y el cliente demo reserva siempre con sus datos).
   */
  createBooking(input: BookingInput): Promise<BookingDetails>
  /** Reserva de una persona, identificada por su email y su código; null si no coinciden. */
  findBooking(email: string, code: string): Promise<BookingDetails | null>
  /** Cancela la reserva (hasta 2 h antes) y, si liberaba plaza, sube a la primera de la lista de espera. */
  cancelBooking(email: string, code: string): Promise<ClientCancellation>
  /** Avisa de cualquier cambio en los datos o en la sesión; devuelve la función para dejar de escuchar. */
  subscribe(listener: () => void): () => void
  /** Adelanta la descarga de lo necesario para reservar o iniciar sesión, sin esperar a que termine. */
  prepare(): void

  // Cuentas
  signIn(email: string, password: string): Promise<Account>
  /** Cierra la sesión solo en este navegador (la cuenta demo la comparten muchos visitantes). */
  signOut(): Promise<void>
  /** Cuenta con sesión iniciada, o null. */
  getAccount(): Promise<Account | null>

  // Cliente con cuenta
  /** Reservas de la cuenta, con su clase y su posición en la lista de espera. */
  listMyBookings(): Promise<BookingDetails[]>
  cancelMyBooking(bookingId: string): Promise<ClientCancellation>

  // Panel del estudio (solo miembros)
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
