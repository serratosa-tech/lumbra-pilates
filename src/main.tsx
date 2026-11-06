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

// La portada llega prerenderizada en el HTML (data-prerendered="/"): React la adopta sin repintarla.
// Antes se cede un fotograma: el navegador pinta el HTML (el h1 es el LCP) y después React hidrata y
// pide los datos. Si hidratara antes, el primer pintado esperaría a la hidratación y a las primeras
// peticiones a Supabase. Cualquier otra ruta, o un HTML prerenderizado servido en otra ruta por
// error, empieza de cero.
if (root.dataset.prerendered === location.pathname) {
  requestAnimationFrame(() => setTimeout(() => hydrateRoot(root, app)))
} else {
  root.replaceChildren()
  createRoot(root).render(app)
}
