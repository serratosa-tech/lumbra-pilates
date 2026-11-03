import { useOutletContext } from 'react-router'
import type { Account } from '../../data/index.ts'

/** Cuenta del estudio con sesión, que RequireStudio pasa a las rutas protegidas. */
export function useStudioUser(): Account {
  return useOutletContext<Account>()
}
