/**
 * Cuentas demo de Supabase. Las credenciales son públicas a propósito: la app las muestra para que
 * cualquiera pueda explorar la demo. Nombre y teléfono del cliente son los de `register_demo_account`
 * (supabase/README.md, apartado 5): el backend los impone en cada reserva de esta cuenta.
 */
export const DEMO_PASSWORD = 'demo1234'

export const DEMO_ACCOUNTS = {
  client: { email: 'cliente@lumbra.example', password: DEMO_PASSWORD, name: 'Ana Demo', phone: '+34 600 000 900' },
  studio: { email: 'estudio@lumbra.example', password: DEMO_PASSWORD, name: 'Lucía Ferrer' },
} as const

export type DemoAccountKind = keyof typeof DEMO_ACCOUNTS

/** Reservas de ejemplo sin cuenta que siembra supabase/seed.sql y repone la restauración cada hora. */
export const DEMO_EXAMPLES = [
  { email: 'ana.lopez@correo.example', code: 'LUM-7K3Q', label: 'Plaza confirmada' },
  { email: 'pablo.ruiz@correo.example', code: 'LUM-W8HT', label: 'En lista de espera' },
] as const
