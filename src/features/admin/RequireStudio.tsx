import { Navigate, Outlet, useLocation } from 'react-router'
import { Spinner } from '../../components/ui/index.ts'
import type { StudioUser } from '../../data/index.ts'
import { useAsyncData } from '../../lib/useAsyncData.ts'

/** Protege las rutas del panel: sin sesión, vuelve al login recordando adónde se iba. */
export function RequireStudio() {
  const location = useLocation()
  const { state } = useAsyncData('sesion-estudio', (ds) => ds.getStudioUser())

  if (state.status === 'loading') {
    return (
      <div className="grid min-h-[60dvh] place-items-center">
        <Spinner label="Comprobando la sesión…" className="text-terracota-600" />
      </div>
    )
  }
  if (state.status === 'error' || !state.data) {
    return <Navigate to="/estudio" replace state={{ from: location.pathname + location.search }} />
  }
  return <Outlet context={state.data satisfies StudioUser} />
}
