import { Outlet } from 'react-router'
import { DemoBanner } from '../components/layout/DemoBanner.tsx'
import { SkipLink } from '../components/layout/SkipLink.tsx'
import { ToastProvider } from '../components/ui/index.ts'

/** Común a la web pública y al panel: avisos, enlace de salto y banda de demo. */
export function RootLayout() {
  return (
    <ToastProvider>
      <SkipLink />
      <DemoBanner />
      <Outlet />
    </ToastProvider>
  )
}
