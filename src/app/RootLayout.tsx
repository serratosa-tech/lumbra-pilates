import { useEffect, useRef } from 'react'
import { Outlet, useLocation } from 'react-router'
import { DemoBanner } from '../components/layout/DemoBanner.tsx'
import { SiteFooter } from '../components/layout/SiteFooter.tsx'
import { SiteHeader } from '../components/layout/SiteHeader.tsx'
import { SkipLink } from '../components/layout/SkipLink.tsx'
import { ToastProvider } from '../components/ui/index.ts'

export function RootLayout() {
  const { pathname, hash } = useLocation()
  const mainRef = useRef<HTMLElement>(null)
  const lastPathname = useRef(pathname)

  // Enlaces con ancla: se desplaza a la sección. Al cambiar de página: arriba del todo
  // y foco en el contenido, como en una navegación real. (Se compara con la ruta anterior
  // y no con un «primer render» para que el doble efecto de StrictMode no robe el foco.)
  useEffect(() => {
    const pageChanged = lastPathname.current !== pathname
    lastPathname.current = pathname
    if (hash) {
      document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView()
      return
    }
    if (!pageChanged) return
    window.scrollTo({ top: 0 })
    mainRef.current?.focus({ preventScroll: true })
  }, [pathname, hash])

  return (
    <ToastProvider>
      <SkipLink />
      <DemoBanner />
      <SiteHeader />
      <main ref={mainRef} id="contenido" tabIndex={-1} className="outline-none">
        <Outlet />
      </main>
      <SiteFooter />
    </ToastProvider>
  )
}
