import { DemoBanner } from '../components/layout/DemoBanner.tsx'
import { SkipLink } from '../components/layout/SkipLink.tsx'

/**
 * Lo primero que pinta cualquier ruta: el enlace de salto y la banda de demo. El build lo escribe
 * también como HTML dentro de #root (vite.config.ts) para que la banda, que es el LCP, se vea antes
 * de que cargue el JavaScript. Es idéntico en todas las rutas, así que React lo sustituye sin cambio visible.
 */
export function StaticShell() {
  return (
    <>
      <SkipLink />
      <DemoBanner />
    </>
  )
}
