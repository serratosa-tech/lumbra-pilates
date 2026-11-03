import { RotateCcw } from 'lucide-react'
import type { ReactNode } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router'
import { NoStudioAccess } from '../../components/account/NoStudioAccess.tsx'
import { Seo } from '../../components/Seo.tsx'
import { Alert, Button, Spinner } from '../../components/ui/index.ts'
import { errorMessage, type Account } from '../../data/index.ts'
import { useAsyncData } from '../../lib/useAsyncData.ts'

/** Página sin el diseño del panel: nada del panel se pinta ni se pide hasta saber que la cuenta es del estudio. */
function Standalone({ children }: { children: ReactNode }) {
  return (
    <main id="contenido" tabIndex={-1} className="container-page grid min-h-[60dvh] place-items-center py-10 outline-none">
      <div className="w-full max-w-md">{children}</div>
    </main>
  )
}

/**
 * Protege todas las rutas del panel. Comprueba la cuenta antes de montar el diseño y las páginas,
 * así que sin permiso no llega a hacerse ninguna petición de datos del estudio.
 * - Sin sesión: al acceso, recordando adónde se iba.
 * - Con una cuenta de cliente: aviso, sin cerrar su sesión.
 */
export function RequireStudio() {
  const location = useLocation()
  const { state, retry } = useAsyncData('cuenta', (ds) => ds.getAccount())

  if (state.status === 'loading') {
    return (
      <Standalone>
        <div className="grid place-items-center">
          <Spinner label="Comprobando la sesión…" className="text-terracota-600" />
        </div>
      </Standalone>
    )
  }
  if (state.status === 'error') {
    return (
      <Standalone>
        <Seo title="Panel del estudio" description="Panel de gestión de Lumbra Pilates." noindex />
        <h1 className="sr-only">Panel del estudio</h1>
        <Alert
          tone="error"
          title="No hemos podido comprobar la sesión"
          action={
            <Button variant="secondary" onClick={retry} icon={<RotateCcw aria-hidden="true" strokeWidth={1.75} className="size-4" />}>
              Reintentar
            </Button>
          }
        >
          {errorMessage(state.error)}
        </Alert>
      </Standalone>
    )
  }
  if (!state.data) return <Navigate to="/estudio" replace state={{ from: location.pathname + location.search }} />
  if (state.data.role !== 'studio') {
    return (
      <Standalone>
        <Seo title="Sin acceso al panel" description="Esta cuenta no tiene acceso al panel del estudio." noindex />
        <NoStudioAccess account={state.data} headingLevel="h1" />
      </Standalone>
    )
  }
  return <Outlet context={state.data satisfies Account} />
}
