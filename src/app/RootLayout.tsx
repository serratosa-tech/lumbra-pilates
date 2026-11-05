import { Outlet } from 'react-router'
import { ToastProvider } from '../components/ui/index.ts'
import { StaticShell } from './StaticShell.tsx'

/** Común a la web pública y al panel: avisos, enlace de salto y banda de demo. */
export function RootLayout() {
  return (
    <ToastProvider>
      {/* Primero, igual que el HTML estático de index.html: React lo sustituye sin que se mueva nada. */}
      <StaticShell />
      <Outlet />
    </ToastProvider>
  )
}
