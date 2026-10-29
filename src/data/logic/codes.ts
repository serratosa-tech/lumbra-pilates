// Sin caracteres ambiguos (0/O, 1/I/L) para que el código se pueda dictar y copiar sin errores.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
const PREFIX = 'LUM'
const LENGTH = 4
const MAX_ATTEMPTS = 1000

const CODE_PATTERN = new RegExp(`^${PREFIX}-[${ALPHABET}]{${LENGTH}}$`)

/** Número aleatorio en [0, 1) con el generador criptográfico del navegador. */
function secureRandom(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32
}

/** Código de reserva legible, como «LUM-7K3Q», que no coincide con ninguno de `taken`. */
export function generateBookingCode(taken: ReadonlySet<string> = new Set(), random: () => number = secureRandom): string {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const body = Array.from({ length: LENGTH }, () => ALPHABET[Math.floor(random() * ALPHABET.length)]).join('')
    const code = `${PREFIX}-${body}`
    if (!taken.has(code)) return code
  }
  throw new Error('No se ha podido generar un código de reserva libre.')
}

/** Acepta «lum-7k3q», «LUM 7K3Q», «lum7k3q» o solo «7K3Q» y devuelve «LUM-7K3Q». */
export function normalizeCode(input: string): string {
  const compact = input.toUpperCase().replace(/[^A-Z0-9]/g, '')
  const body = compact.startsWith(PREFIX) && compact.length > LENGTH ? compact.slice(PREFIX.length) : compact
  return `${PREFIX}-${body}`
}

export function isBookingCode(code: string): boolean {
  return CODE_PATTERN.test(code)
}
