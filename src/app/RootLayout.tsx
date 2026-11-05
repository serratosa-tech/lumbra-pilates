import { Outlet } from 'react-router'
import { ToastProvider } from '../components/ui/index.ts'

/**
 * Común a la web pública y al panel: los avisos. El enlace de salto y la banda de demo no los pinta
 * React: van como HTML estático en index.html, delante de #root (ver StaticShell.tsx).
 */
export function RootLayout() {
  return (
    <ToastProvider>
      <Outlet />
    </ToastProvider>
  )
}
