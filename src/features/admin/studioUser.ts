import { useOutletContext } from 'react-router'
import type { StudioUser } from '../../data/index.ts'

/** Usuario del panel, que RequireStudio pasa a las rutas protegidas. */
export function useStudioUser(): StudioUser {
  return useOutletContext<StudioUser>()
}
