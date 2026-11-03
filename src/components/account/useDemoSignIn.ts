import { useState } from 'react'
import { useNavigate } from 'react-router'
import { DEMO_ACCOUNTS, errorMessage, getDataSource, type Account, type DemoAccountKind } from '../../data/index.ts'
import { useToast } from '../ui/index.ts'

/** Adónde lleva cada cuenta demo al entrar. */
export const DEMO_DESTINATION: Record<DemoAccountKind, string> = {
  client: '/mis-reservas',
  studio: '/estudio/resumen',
}

/**
 * Entra con una de las cuentas demo públicas. Por defecto lleva a su pantalla
 * (Mis reservas o el panel); `onSignedIn` lo sustituye.
 */
export function useDemoSignIn(onSignedIn?: (account: Account, kind: DemoAccountKind) => void) {
  const navigate = useNavigate()
  const toast = useToast()
  const [pending, setPending] = useState<DemoAccountKind | null>(null)

  async function signInAs(kind: DemoAccountKind) {
    setPending(kind)
    try {
      const { email, password } = DEMO_ACCOUNTS[kind]
      const account = await getDataSource().signIn(email, password)
      toast({ title: kind === 'client' ? 'Has entrado como cliente demo' : 'Has entrado como estudio demo', tone: 'exito' })
      if (onSignedIn) onSignedIn(account, kind)
      else navigate(DEMO_DESTINATION[kind])
    } catch (error) {
      toast({ title: 'No has podido entrar', description: errorMessage(error), tone: 'error' })
    } finally {
      setPending(null)
    }
  }

  return { pending, signInAs }
}
