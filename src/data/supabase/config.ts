export interface SupabaseConfig {
  url: string
  /** Clave publishable: la única que conoce la app. */
  key: string
}

/** Configuración de .env.local; null si falta (la app muestra sus estados de error, no se rompe). */
export function readConfig(env: ImportMetaEnv = import.meta.env): SupabaseConfig | null {
  const url = env.VITE_SUPABASE_URL?.trim()
  const key = env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()
  return url && key ? { url: url.replace(/\/+$/, ''), key } : null
}
