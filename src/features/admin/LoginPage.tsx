import { Navigate, useLocation, useNavigate } from 'react-router'
import { DemoAccountCard } from '../../components/account/DemoAccountCard.tsx'
import { NoStudioAccess } from '../../components/account/NoStudioAccess.tsx'
import { SignInForm } from '../../components/account/SignInForm.tsx'
import { LogoMark } from '../../components/brand/Logo.tsx'
import { Seo } from '../../components/Seo.tsx'
import { Spinner } from '../../components/ui/index.ts'
import type { Account } from '../../data/index.ts'
import { useAsyncData } from '../../lib/useAsyncData.ts'

const HOME = '/estudio/resumen'

export function LoginPage() {
  const navigate = useNavigate()
  const from = (useLocation().state as { from?: string } | null)?.from ?? HOME
  const session = useAsyncData('cuenta', (ds) => ds.getAccount())
  const account = session.state.status === 'ready' ? session.state.data : null

  // Una cuenta de cliente se queda aquí con su aviso (y su sesión intacta).
  const enter = (signedIn: Account) => {
    if (signedIn.role === 'studio') navigate(from, { replace: true })
  }

  if (account?.role === 'studio') return <Navigate to={from} replace />

  return (
    <div className="container-page grid grid-cols-1 justify-items-center py-10 sm:py-16">
      <Seo title="Acceso estudio" description="Acceso al panel de gestión de Lumbra Pilates." noindex />
      <div className="w-full max-w-md">
        <div className="text-center">
          <LogoMark className="mx-auto size-12 text-tinta" />
          <h1 className="mt-4 text-3xl">Acceso estudio</h1>
          <p className="mt-2 text-tinta-800">Gestiona clases, asistentes y métricas.</p>
        </div>

        {session.state.status === 'loading' ? (
          <div className="mt-8 grid place-items-center">
            <Spinner label="Comprobando la sesión…" className="text-terracota-600" />
          </div>
        ) : account ? (
          <div className="mt-8 flex flex-col gap-6">
            <NoStudioAccess account={account} />
            {/* Para ver el panel hay que cambiar de cuenta: es decisión de quien visita, no se le echa. */}
            <DemoAccountCard kind="studio" headingLevel="h2" onSignedIn={enter} className="rounded-md bg-info-50 p-4" />
          </div>
        ) : (
          <div className="mt-8 rounded-lg border border-arena-200 bg-white p-5 shadow-sm sm:p-7">
            <DemoAccountCard kind="studio" headingLevel="h2" onSignedIn={enter} className="rounded-md bg-info-50 p-4" />
            <SignInForm label="Iniciar sesión" onSignedIn={enter} className="mt-6" />
          </div>
        )}
      </div>
    </div>
  )
}
