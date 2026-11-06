import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import './index.css'
import App from './app/App.tsx'

const root = document.getElementById('root')!
const app = (
  <StrictMode>
    <App />
  </StrictMode>
)

/**
 * Ejecuta `run` cuando el navegador ya ha pintado el primer contenido, o al cabo de 1 s si no lo
 * avisa (pestaña en segundo plano, navegador sin Paint Timing).
 */
function afterFirstPaint(run: () => void) {
  let done = false
  let observer: PerformanceObserver | undefined
  const once = () => {
    if (done) return
    done = true
    observer?.disconnect()
    window.clearTimeout(timer)
    run()
  }
  const timer = window.setTimeout(once, 1000)
  if (PerformanceObserver.supportedEntryTypes?.includes('paint')) {
    observer = new PerformanceObserver((list) => {
      if (list.getEntriesByName('first-contentful-paint').length) once()
    })
    observer.observe({ type: 'paint', buffered: true })
  }
}

// La portada llega prerenderizada en el HTML (data-prerendered="/"): React la adopta sin repintarla.
// Se hidrata después del primer pintado: así el h1 (el LCP) se pinta con el HTML y el CSS, y las
// peticiones a Supabase, que salen al hidratar, no se cuelan antes. Cualquier otra ruta, o un HTML
// prerenderizado servido en otra ruta por error, empieza de cero.
if (root.dataset.prerendered === location.pathname) {
  afterFirstPaint(() => hydrateRoot(root, app))
} else {
  root.replaceChildren()
  createRoot(root).render(app)
}
