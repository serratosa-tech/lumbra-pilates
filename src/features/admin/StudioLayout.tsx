import { CalendarRange, ExternalLink, LayoutDashboard, LogOut, UsersRound, type LucideIcon } from 'lucide-react'
import { useRef, useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router'
import { useRouteFocus } from '../../app/useRouteFocus.ts'
import { LogoFull } from '../../components/brand/Logo.tsx'
import { Button, useToast } from '../../components/ui/index.ts'
import { getDataSource } from '../../data/index.ts'
import { cn } from '../../lib/cn.ts'
import { useStudioUser } from './studioUser.ts'

const STUDIO_NAV: Array<{ to: string; label: string; icon: LucideIcon }> = [
  { to: '/estudio/resumen', label: 'Resumen', icon: LayoutDashboard },
  { to: '/estudio/clases', label: 'Clases', icon: CalendarRange },
  { to: '/estudio/asistentes', label: 'Asistentes', icon: UsersRound },
]

/** Cabecera propia del panel con pestañas (fijas bajo la cabecera en móvil) y cierre de sesión. */
export function StudioLayout() {
  const user = useStudioUser()
  const mainRef = useRef<HTMLElement>(null)
  const navigate = useNavigate()
  const toast = useToast()
  const [leaving, setLeaving] = useState(false)
  useRouteFocus(mainRef)

  async function signOut() {
    setLeaving(true)
    await getDataSource().signOut()
    toast({ title: 'Has cerrado la sesión', tone: 'info' })
    navigate('/estudio', { replace: true })
  }

  return (
    <>
      {/* En pantallas muy bajas (móvil en horizontal) la cabecera deja de ser fija para no tapar el contenido. */}
      <header className="sticky top-0 z-40 border-b border-arena-200/80 bg-crema/90 backdrop-blur-md [@media(max-height:30rem)]:static">
        <div className="container-page flex min-h-16 flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2">
          <div className="flex min-w-0 items-center gap-3">
            <Link to="/estudio/resumen" aria-label="Panel del estudio, resumen" className="-m-1 rounded-md p-1 text-tinta">
              <LogoFull title="" className="h-9 w-auto" />
            </Link>
            <span className="hidden border-l border-arena-400 pl-3 text-sm font-semibold text-piedra sm:inline">
              Panel del estudio
            </span>
          </div>

          <nav aria-label="Panel" className="order-last hidden w-full lg:order-none lg:block lg:w-auto">
            <StudioTabs />
          </nav>

          <div className="flex items-center gap-1">
            <Link
              to="/"
              className="hidden min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-tinta-700 hover:bg-arena-100 md:inline-flex"
            >
              Ver la web
              <ExternalLink aria-hidden="true" strokeWidth={1.75} className="size-4" />
            </Link>
            <Button
              variant="ghost"
              onClick={signOut}
              loading={leaving}
              icon={<LogOut aria-hidden="true" strokeWidth={1.75} className="size-4" />}
              title={`Sesión iniciada como ${user.name}`}
            >
              Cerrar sesión
            </Button>
          </div>
        </div>
        <nav aria-label="Panel (móvil)" className="border-t border-arena-200/80 lg:hidden">
          <div className="container-page overflow-x-auto py-1.5 [scrollbar-width:none]">
            <StudioTabs />
          </div>
        </nav>
      </header>
      <main ref={mainRef} id="contenido" tabIndex={-1} className="outline-none">
        <Outlet context={user} />
      </main>
    </>
  )
}

function StudioTabs() {
  return (
    <ul className="flex items-center gap-1">
      {STUDIO_NAV.map(({ to, label, icon: Icon }) => (
        <li key={to} className="shrink-0">
          <NavLink
            to={to}
            className={({ isActive }) =>
              cn(
                'inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold whitespace-nowrap transition-colors duration-(--duration-fast)',
                isActive ? 'bg-tinta text-crema' : 'text-tinta-700 hover:bg-arena-100',
              )
            }
          >
            <Icon aria-hidden="true" strokeWidth={1.75} className="size-4" />
            {label}
          </NavLink>
        </li>
      ))}
    </ul>
  )
}
