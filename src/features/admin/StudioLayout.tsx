import { CalendarRange, ExternalLink, LayoutDashboard, LogOut, UsersRound, type LucideIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import { useRouteFocus } from '../../app/useRouteFocus.ts'
import { LogoFull } from '../../components/brand/Logo.tsx'
import { Button, useToast } from '../../components/ui/index.ts'
import { getDataSource } from '../../data/index.ts'
import { cn } from '../../lib/cn.ts'
import { useScrollFade } from '../../lib/useScrollFade.ts'
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
  const tabsRef = useRef<HTMLDivElement>(null)
  useScrollFade(tabsRef)
  const { pathname } = useLocation()

  // En móvil, la pestaña activa siempre a la vista, entera y fuera del degradado del borde.
  useEffect(() => {
    const list = tabsRef.current
    const tab = list?.querySelector<HTMLElement>('[aria-current="page"]')
    if (!list || !tab) return
    const listBox = list.getBoundingClientRect()
    const tabBox = tab.getBoundingClientRect()
    const centered = list.scrollLeft + tabBox.left - listBox.left - (listBox.width - tabBox.width) / 2
    list.scrollTo({ left: centered, behavior: 'instant' })
  }, [pathname])
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
            {/* En móvil solo el icono; el texto sigue disponible para lectores de pantalla. */}
            <Link
              to="/"
              title="Ver la web"
              className="inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-full text-sm font-semibold text-tinta-700 hover:bg-arena-100 md:px-3"
            >
              <span className="sr-only md:not-sr-only">Ver la web</span>
              <ExternalLink aria-hidden="true" strokeWidth={1.75} className="size-4" />
            </Link>
            {/* Por debajo de 400 px también solo el icono, para que todo quepa en una línea junto al logo. */}
            <Button
              variant="ghost"
              onClick={signOut}
              loading={leaving}
              icon={<LogOut aria-hidden="true" strokeWidth={1.75} className="size-4" />}
              title={`Sesión iniciada como ${user.name}`}
              className="max-[24.99rem]:px-3.5"
            >
              <span className="sr-only min-[25rem]:not-sr-only">Cerrar sesión</span>
            </Button>
          </div>
        </div>
        <nav aria-label="Panel (móvil)" className="border-t border-arena-200/80 lg:hidden">
          <div ref={tabsRef} className="container-page scroll-fade overflow-x-auto py-1.5 [scrollbar-width:none]">
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
