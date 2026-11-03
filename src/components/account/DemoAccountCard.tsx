import { KeyRound, LayoutDashboard, UserRound } from 'lucide-react'
import { useId } from 'react'
import { DEMO_ACCOUNTS, type Account, type DemoAccountKind } from '../../data/index.ts'
import { Button } from '../ui/index.ts'
import { useDemoSignIn } from './useDemoSignIn.ts'

const COPY: Record<DemoAccountKind, { title: string; button: string; text: string }> = {
  client: {
    title: 'Entra como cliente',
    button: 'Probar como cliente',
    text: 'Verás las reservas de la cuenta y podrás reservar y cancelar con un clic.',
  },
  studio: {
    title: 'Cuenta demo del estudio',
    button: 'Probar como estudio',
    text: 'Gestiona clases, asistentes y métricas con datos de ejemplo.',
  },
}

interface DemoAccountCardProps {
  kind: DemoAccountKind
  /** Por defecto lleva a la pantalla de la cuenta. */
  onSignedIn?: (account: Account) => void
  headingLevel?: 'h2' | 'h3'
  className?: string
}

/** Credenciales públicas de una cuenta demo y el botón para entrar con ellas. */
export function DemoAccountCard({ kind, onSignedIn, headingLevel: Heading = 'h3', className }: DemoAccountCardProps) {
  const headingId = useId()
  const { pending, signInAs } = useDemoSignIn(onSignedIn)
  const { email, password } = DEMO_ACCOUNTS[kind]
  const copy = COPY[kind]
  const Icon = kind === 'client' ? UserRound : LayoutDashboard

  return (
    <section aria-labelledby={headingId} className={className}>
      <Heading id={headingId} className="flex items-center gap-2 font-sans text-sm font-semibold tracking-normal">
        <KeyRound aria-hidden="true" strokeWidth={1.75} className="size-4 shrink-0 text-terracota-600" />
        <span className="min-w-0 [overflow-wrap:anywhere]">{copy.title}</span>
      </Heading>
      <p className="mt-1 text-sm text-piedra">{copy.text}</p>
      <dl className="mt-2 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-sm text-tinta-700">
        <dt>Email</dt>
        <dd className="font-semibold break-all">{email}</dd>
        <dt>Contraseña</dt>
        <dd className="font-semibold">{password}</dd>
      </dl>
      <Button
        variant="secondary"
        className="mt-3 w-full"
        loading={pending === kind}
        icon={<Icon aria-hidden="true" strokeWidth={1.75} className="size-4" />}
        onClick={() => signInAs(kind)}
      >
        {copy.button}
      </Button>
    </section>
  )
}
