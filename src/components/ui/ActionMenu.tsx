import { EllipsisVertical, type LucideIcon } from 'lucide-react'
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { Link } from 'react-router'
import { cn } from '../../lib/cn.ts'

export interface ActionMenuItem {
  label: string
  icon: LucideIcon
  /** Enlace… */
  to?: string
  /** …o acción. */
  onSelect?: () => void
}

interface ActionMenuProps {
  /** Nombre accesible del botón, p. ej. «Acciones de Mat Flow». */
  label: string
  items: ActionMenuItem[]
}

const menuItemsOf = (menu: HTMLElement | null) => [...(menu?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])]

const ITEM =
  'flex min-h-11 w-full items-center gap-3 rounded-sm px-3 py-2 text-left text-sm font-medium text-tinta hover:bg-arena-100 focus-visible:bg-arena-100 focus-visible:outline-offset-0'

/**
 * Botón de tres puntos que abre un menú (patrón «menu button»): flechas, Inicio y Fin
 * para moverse, Esc para cerrar y devolver el foco, clic fuera para cerrar.
 */
export function ActionMenu({ label, items }: ActionMenuProps) {
  const [open, setOpen] = useState(false)
  const [initialFocus, setInitialFocus] = useState<'first' | 'last'>('first')
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const menuId = useId()

  useEffect(() => {
    if (!open) return
    const list = menuItemsOf(menuRef.current)
    list[initialFocus === 'first' ? 0 : list.length - 1]?.focus()
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open, initialFocus])

  function openAt(position: 'first' | 'last') {
    setInitialFocus(position)
    setOpen(true)
  }

  function close() {
    setOpen(false)
    buttonRef.current?.focus()
  }

  function onButtonKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      openAt(event.key === 'ArrowDown' ? 'first' : 'last')
    }
  }

  function onMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const list = menuItemsOf(menuRef.current)
    const index = list.indexOf(document.activeElement as HTMLElement)
    const target = {
      ArrowDown: (index + 1) % list.length,
      ArrowUp: (index - 1 + list.length) % list.length,
      Home: 0,
      End: list.length - 1,
    }[event.key]
    if (target !== undefined) {
      event.preventDefault()
      list[target]?.focus()
    } else if (event.key === 'Escape') {
      event.preventDefault()
      close()
    } else if (event.key === 'Tab') {
      setOpen(false)
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => (open ? setOpen(false) : openAt('first'))}
        onKeyDown={onButtonKeyDown}
        className={cn(
          'grid size-11 place-items-center rounded-full text-tinta-700 transition-colors duration-(--duration-fast) hover:bg-arena-100 active:bg-arena-200',
          open && 'bg-arena-100',
        )}
      >
        <EllipsisVertical aria-hidden="true" strokeWidth={1.75} className="size-5" />
      </button>
      {open && (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label={label}
          onKeyDown={onMenuKeyDown}
          className="absolute top-full right-0 z-20 mt-1 flex w-max max-w-[calc(100vw-2rem)] min-w-44 flex-col rounded-md border border-arena-200 bg-white p-1 shadow-lg animate-fade-in"
        >
          {items.map(({ label: itemLabel, icon: Icon, to, onSelect }) => {
            const content = (
              <>
                <Icon aria-hidden="true" strokeWidth={1.75} className="size-4 shrink-0 text-piedra" />
                {itemLabel}
              </>
            )
            return to ? (
              <Link key={itemLabel} to={to} role="menuitem" tabIndex={-1} className={ITEM}>
                {content}
              </Link>
            ) : (
              <button
                key={itemLabel}
                type="button"
                role="menuitem"
                tabIndex={-1}
                onClick={() => {
                  // El foco vuelve al botón antes de la acción: si abre un diálogo, al cerrarlo regresa aquí.
                  close()
                  onSelect?.()
                }}
                className={ITEM}
              >
                {content}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
