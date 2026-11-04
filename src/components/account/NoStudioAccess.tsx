import { ArrowRight, ShieldOff } from 'lucide-react'
import type { Account } from '../../data/index.ts'
import { ButtonLink } from '../ui/index.ts'

/**
 * Una cuenta de cliente que intenta entrar en el panel. No se cierra su sesión:
 * solo se le explica y se le lleva a su sitio.
 */
export function NoStudioAccess({ account, headingLevel: Heading = 'h2' }: { account: Account; headingLevel?: 'h1' | 'h2' }) {
  return (
    <div className="rounded-lg border border-arena-200 bg-white p-5 text-center shadow-sm sm:p-7">
      <span className="mx-auto grid size-12 place-items-center rounded-full bg-arena-100 text-terracota-700">
        <ShieldOff aria-hidden="true" strokeWidth={1.75} className="size-6" />
      </span>
      <Heading className="mt-4 text-2xl">Esta cuenta no tiene acceso al panel del estudio</Heading>
      <p className="mt-2 text-tinta-700">
        Has entrado como <strong className="font-medium [overflow-wrap:anywhere]">{account.email}</strong>, una cuenta de
        cliente. Tus reservas están en Mis reservas.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <ButtonLink to="/mis-reservas" icon={<ArrowRight aria-hidden="true" strokeWidth={1.75} className="size-4" />}>
          Ir a Mis reservas
        </ButtonLink>
        <ButtonLink to="/" variant="ghost">
          Ver la web
        </ButtonLink>
      </div>
    </div>
  )
}
