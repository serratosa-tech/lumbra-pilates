import { Menu } from 'lucide-react'
import { useState } from 'react'
import { Link, NavLink } from 'react-router'
import { cn } from '../../lib/cn.ts'
import { LogoFull } from '../brand/Logo.tsx'
import { ButtonLink, Sheet } from '../ui/index.ts'
import { MenuBrand } from './MenuBrand.tsx'
import { PRIMARY_NAV } from './navigation.ts'

const MOBILE_MENU_ID = 'menu-movil'

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false)
  const closeMenu = () => setMenuOpen(false)

  return (
    <header className="sticky top-0 z-40 border-b border-arena-200/80 bg-crema/90 backdrop-blur-md">
      <div className="container-page flex min-h-16 flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2">
        <Link to="/" aria-label="Lumbra Pilates, inicio" className="-m-1 rounded-md p-1 text-tinta">
          <LogoFull title="" className="h-9 w-auto sm:h-10" />
        </Link>

        <nav aria-label="Principal" className="hidden md:block">
          <ul className="flex items-center gap-1">
            {PRIMARY_NAV.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      'relative inline-flex min-h-11 items-center rounded-full px-4 text-sm font-medium transition-colors duration-(--duration-fast)',
                      'hover:bg-arena-100',
                      isActive ? 'text-terracota-700' : 'text-tinta-700',
                    )
                  }
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
            <li className="ml-2">
              <ButtonLink to="/clases">Reservar clase</ButtonLink>
            </li>
          </ul>
        </nav>

        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-expanded={menuOpen}
          aria-controls={MOBILE_MENU_ID}
          className="-mr-2 inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-sm font-medium text-tinta transition-colors hover:bg-arena-100 md:hidden"
        >
          <Menu aria-hidden="true" strokeWidth={1.75} className="size-6" />
          Menú
        </button>
      </div>

      <Sheet open={menuOpen} onClose={closeMenu} title="Menú">
        {/* Ocupa todo el alto del panel para llevar la marca abajo; si no cabe, el panel hace scroll. */}
        <div className="flex min-h-full flex-col gap-10">
          <nav id={MOBILE_MENU_ID} aria-label="Principal (móvil)">
            <ul className="flex flex-col gap-1">
              {PRIMARY_NAV.map(({ to, label, icon: Icon }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    onClick={closeMenu}
                    className={({ isActive }) =>
                      cn(
                        'flex min-h-12 items-center gap-3 rounded-md px-3 text-base font-medium transition-colors hover:bg-arena-100',
                        isActive ? 'bg-arena-100 text-terracota-700' : 'text-tinta',
                      )
                    }
                  >
                    <Icon aria-hidden="true" strokeWidth={1.75} className="size-5 text-terracota-600" />
                    {label}
                  </NavLink>
                </li>
              ))}
            </ul>
            <ButtonLink to="/clases" onClick={closeMenu} size="lg" className="mt-6 w-full">
              Reservar clase
            </ButtonLink>
          </nav>
          <div className="mt-auto">
            <MenuBrand />
          </div>
        </div>
      </Sheet>
    </header>
  )
}
