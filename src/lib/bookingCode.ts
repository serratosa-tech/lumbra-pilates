// Sin caracteres ambiguos (0/O, 1/I/L) para que el código se pueda dictar y copiar sin errores.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

export function generateBookingCode(length = 6): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length))
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('')
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}
