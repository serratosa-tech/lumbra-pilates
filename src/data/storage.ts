/** Única clave de la app en el almacenamiento del navegador: ahí guarda supabase-js la sesión. */
export const STORAGE_KEY = 'lumbra-pilates:v1'

/** localStorage o sessionStorage, o null si el navegador los bloquea. */
export function browserStorage(kind: 'localStorage' | 'sessionStorage'): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window[kind]
  } catch {
    return null
  }
}
