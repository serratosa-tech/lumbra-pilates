import { renderToStaticMarkup } from 'react-dom/server'
import { StaticShell } from './StaticShell.tsx'

/** HTML del shell para index.html. Solo lo usa el build (vite.config.ts); no entra en el bundle de la app. */
export function staticShellMarkup(): string {
  return renderToStaticMarkup(<StaticShell />)
}
