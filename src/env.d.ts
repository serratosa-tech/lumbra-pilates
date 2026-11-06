/** Año en que se hizo el build (vite.config.ts): el del pie de la portada prerenderizada. */
declare const __BUILD_YEAR__: number

interface ImportMetaEnv {
  /** URL del proyecto de Supabase (https://<proyecto>.supabase.co). */
  readonly VITE_SUPABASE_URL?: string
  /** Clave publishable (sb_publishable_…): pública por diseño. Nunca la secreta. */
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string
}
