import { STORAGE_KEY } from '../storage.ts'

function parse(raw: string): unknown {
  try {
    return JSON.parse(raw)
  } catch {
    return undefined
  }
}

/** ¿Es una sesión de supabase-js (con sus dos tokens)? */
function isSession(value: unknown): boolean {
  const v = value as { access_token?: unknown; refresh_token?: unknown } | null | undefined
  return typeof v?.access_token === 'string' && typeof v.refresh_token === 'string'
}

/** Hay una sesión guardada: se puede saber sin descargar supabase-js. */
export function hasStoredSession(storage: Storage | null): boolean {
  try {
    const raw = storage?.getItem(STORAGE_KEY)
    return raw != null && isSession(parse(raw))
  } catch {
    return false
  }
}

/**
 * Borra de la clave de la app lo que no sea una sesión, como el estado que guardaba la demo
 * en el navegador (fase 3). Solo toca esa clave: nunca el resto del almacenamiento.
 */
export function cleanLegacyStorage(storage: Storage | null): void {
  try {
    const raw = storage?.getItem(STORAGE_KEY)
    if (raw != null && !isSession(parse(raw))) storage?.removeItem(STORAGE_KEY)
  } catch {
    // Almacenamiento bloqueado: no hay nada que limpiar.
  }
}
