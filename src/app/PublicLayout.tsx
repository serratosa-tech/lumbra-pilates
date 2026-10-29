import { useRef } from 'react'
import { Outlet } from 'react-router'
import { SiteFooter } from '../components/layout/SiteFooter.tsx'
import { SiteHeader } from '../components/layout/SiteHeader.tsx'
import { useRouteFocus } from './useRouteFocus.ts'

export function PublicLayout() {
  const mainRef = useRef<HTMLElement>(null)
  useRouteFocus(mainRef)

  return (
    <>
      <SiteHeader />
      <main ref={mainRef} id="contenido" tabIndex={-1} className="outline-none">
        <Outlet />
      </main>
      <SiteFooter />
    </>
  )
}
