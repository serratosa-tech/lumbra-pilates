import { DemoBanner } from '../components/layout/DemoBanner.tsx'
import { SkipLink } from '../components/layout/SkipLink.tsx'

/**
 * Lo primero de cualquier ruta: el enlace de salto y la banda de demo. No los pinta React: vite.config.ts
 * los renderiza a HTML (en el build y en desarrollo) y los escribe en index.html, delante de #root.
 * Así la banda, que es el LCP, se pinta con el HTML y el CSS, y su nodo no se sustituye nunca al
 * arrancar la app (si React lo cambiara por uno igual, el navegador volvería a contarlo como LCP).
 */
export function StaticShell() {
  return (
    <>
      <SkipLink />
      <DemoBanner />
    </>
  )
}
