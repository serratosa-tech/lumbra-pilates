import type { DataSource } from './DataSource.ts'
import { browserStorage } from './storage.ts'
import { readConfig } from './supabase/config.ts'
import { cleanLegacyStorage } from './supabase/storedSession.ts'
import { createSupabaseDataSource } from './supabase/supabaseDataSource.ts'

/** La fuente de datos de la app: Supabase. Los tests la sustituyen por la demo en memoria (src/test/setup.ts). */
export function createAppDataSource(): DataSource {
  const storage = browserStorage('localStorage')
  // Antes de que supabase-js lea la clave: fuera el estado que guardaba la demo en el navegador.
  cleanLegacyStorage(storage)
  return createSupabaseDataSource({ config: readConfig(), storage })
}
