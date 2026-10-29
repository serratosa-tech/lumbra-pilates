import type {
  Booking,
  BookingInput,
  ClassSession,
  ClassType,
  Instructor,
  IsoDateTime,
} from './types.ts'

/**
 * Contrato de acceso a datos. La app solo depende de esta interfaz;
 * la implementación concreta (demo en memoria o Supabase) se elige en `src/data/index.ts`.
 */
export interface DataSource {
  /** Tipos de clase que ofrece el estudio. */
  listClassTypes(): Promise<ClassType[]>
  /** Equipo de instructoras. */
  listInstructors(): Promise<Instructor[]>
  /** Clases que empiezan dentro de [from, to). */
  listSessions(from: IsoDateTime, to: IsoDateTime): Promise<ClassSession[]>
  /** Reserva una plaza; si la clase está llena, la reserva entra en lista de espera. */
  createBooking(input: BookingInput): Promise<Booking>
  /** Reservas de una persona, identificada por email y código de reserva. */
  findBookings(email: string, code: string): Promise<Booking[]>
  /** Cancela una reserva y, si liberaba plaza, promociona al primero de la lista de espera. */
  cancelBooking(email: string, code: string): Promise<Booking>
}
