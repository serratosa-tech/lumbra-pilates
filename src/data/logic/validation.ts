export interface BookingFormValues {
  name: string
  email: string
  phone: string
  privacy: boolean
}

export type BookingFormErrors = Partial<Record<keyof BookingFormValues, string>>

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const NAME_MAX = 80

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

/** Teléfono español (móvil o fijo, con o sin +34) en formato «+34 612 345 678»; null si no es válido. */
export function normalizePhone(phone: string): string | null {
  let digits = phone.trim().replace(/[\s().-]/g, '')
  if (digits.startsWith('+34')) digits = digits.slice(3)
  else if (digits.startsWith('0034')) digits = digits.slice(4)
  if (!/^[6789]\d{8}$/.test(digits)) return null
  return `+34 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`
}

export function validateName(name: string): string | undefined {
  const value = name.trim()
  if (!value) return 'Escribe tu nombre.'
  if (value.length < 2 || !/\p{L}/u.test(value)) return 'Escribe tu nombre completo.'
  if (value.length > NAME_MAX) return `El nombre no puede pasar de ${NAME_MAX} caracteres.`
  return undefined
}

export function validateEmail(email: string): string | undefined {
  const value = email.trim()
  if (!value) return 'Escribe tu email.'
  if (!EMAIL_PATTERN.test(value)) return 'Revisa el email: debe tener la forma nombre@dominio.es.'
  return undefined
}

export function validatePhone(phone: string): string | undefined {
  if (!phone.trim()) return 'Escribe tu teléfono.'
  if (!normalizePhone(phone)) return 'Escribe un teléfono español de 9 cifras, por ejemplo 612 345 678.'
  return undefined
}

export function validateBookingForm(values: BookingFormValues): BookingFormErrors {
  const errors: BookingFormErrors = {
    name: validateName(values.name),
    email: validateEmail(values.email),
    phone: validatePhone(values.phone),
    privacy: values.privacy ? undefined : 'Necesitamos que aceptes la política de privacidad para reservar.',
  }
  return Object.fromEntries(Object.entries(errors).filter(([, message]) => message)) as BookingFormErrors
}
