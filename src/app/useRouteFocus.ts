import { useEffect, useRef, type RefObject } from 'react'
import { useLocation } from 'react-router'

/**
 * Enlaces con ancla: se desplaza a la sección. Al cambiar de página: arriba del todo
 * y foco en el contenido, como en una navegación real. (Se compara con la ruta anterior
 * y no con un «primer render» para que el doble efecto de StrictMode no robe el foco.)
 */
export function useRouteFocus(mainRef: RefObject<HTMLElement | null>) {
  const { pathname, hash } = useLocation()
  const lastPathname = useRef(pathname)

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
  }, [pathname, hash, mainRef])
}
