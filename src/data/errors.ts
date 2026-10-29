export type DataErrorCode =
  | 'not_found'
  | 'session_not_found'
  | 'duplicate'
  | 'past'
  | 'class_cancelled'
  | 'already_cancelled'
  | 'too_late'
  | 'capacity_below_booked'
  | 'overlap'
  | 'not_confirmed'
  | 'attendance_too_early'
  | 'invalid_input'
  | 'invalid_credentials'
  | 'unauthorized'

const MESSAGES: Record<DataErrorCode, string> = {
  not_found: 'No encontramos ninguna reserva con ese email y ese código.',
  session_not_found: 'Esta clase ya no existe.',
  duplicate: 'Ya tienes una reserva para esta clase con este email.',
  past: 'Esta clase ya ha empezado o ha terminado.',
  class_cancelled: 'El estudio ha cancelado esta clase.',
  already_cancelled: 'Esta reserva ya estaba cancelada.',
  too_late: 'Faltan menos de 2 horas para la clase: ya no se puede cancelar online.',
  capacity_below_booked: 'El aforo no puede ser menor que las plazas ya reservadas.',
  overlap: 'Ya hay otra clase en la sala a esa hora.',
  not_confirmed: 'Solo se puede marcar la asistencia de las plazas confirmadas.',
  attendance_too_early: 'La asistencia se marca a partir de 30 minutos antes de la clase.',
  invalid_input: 'Revisa los datos: hay algún campo incorrecto.',
  invalid_credentials: 'El email o la contraseña no son correctos.',
  unauthorized: 'Tu sesión ha caducado. Vuelve a entrar.',
}

/** Error de negocio con un código estable; el mensaje ya está en español para mostrarlo tal cual. */
export class DataError extends Error {
  readonly code: DataErrorCode

  constructor(code: DataErrorCode, message = MESSAGES[code]) {
    super(message)
    this.name = 'DataError'
    this.code = code
  }
}

/** Mensaje para la interfaz a partir de cualquier error. */
export function errorMessage(error: unknown): string {
  return error instanceof DataError ? error.message : 'Algo ha fallado. Vuelve a intentarlo en un momento.'
}
