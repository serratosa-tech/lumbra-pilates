import { ChevronDown } from 'lucide-react'
import { DemoAccountCard } from '../../../components/account/DemoAccountCard.tsx'
import { SignInForm } from '../../../components/account/SignInForm.tsx'

// Ya se está en Mis reservas: al entrar, la página muestra las reservas de la cuenta sin navegar.
const stay = () => {}

/** Acceso con cuenta de cliente: la cuenta demo con un clic o el formulario. Sin registro: las cuentas se crean en Supabase. */
export function ClientAccess() {
  return (
    <div className="flex flex-col gap-3">
      <DemoAccountCard kind="client" onSignedIn={stay} />
      <details className="group rounded-sm border border-arena-200 bg-white">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-sm font-semibold [&::-webkit-details-marker]:hidden">
          Entrar con email y contraseña
          <ChevronDown
            aria-hidden="true"
            strokeWidth={1.75}
            className="size-4 shrink-0 transition-transform duration-(--duration-fast) group-open:rotate-180"
          />
        </summary>
        <SignInForm label="Entrar con tu cuenta" onSignedIn={stay} className="border-t border-arena-200 p-3" />
      </details>
    </div>
  )
}
