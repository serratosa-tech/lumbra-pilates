import { StrictMode } from 'react'
import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router'
import { AppRoutes } from './App.tsx'

/** Ruta que se prerenderiza: el HTML del build la trae pintada y main.tsx la hidrata. */
export const PRERENDERED_PATH = '/'

/**
 * HTML de la portada en su primer estado (esqueletos mientras llegan los datos), para escribirlo dentro de
 * #root en el build. Es el mismo árbol que monta main.tsx, con StaticRouter en vez de BrowserRouter: así
 * el héroe se pinta con el HTML y el CSS, sin esperar al JavaScript, y React lo adopta al hidratar sin
 * sustituir los nodos (el h1 no vuelve a contar como LCP). Solo lo usa el build (vite.config.ts); no
 * entra en el bundle de la app.
 */
export function homeMarkup(): string {
  return renderToString(
    <StrictMode>
      <StaticRouter location={PRERENDERED_PATH}>
        <AppRoutes />
      </StaticRouter>
    </StrictMode>,
  )
}
