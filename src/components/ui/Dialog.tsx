import { X } from 'lucide-react'
import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode } from 'react'
import { cn } from '../../lib/cn.ts'

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export interface DialogProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children?: ReactNode
  footer?: ReactNode
  className?: string
}

const VARIANTS = {
  modal:
    'm-auto w-[min(32rem,calc(100%-2rem))] max-h-[calc(100dvh-2rem)] rounded-lg open:animate-rise',
  sheet: 'my-0 mr-0 ml-auto h-dvh max-h-none w-[min(22rem,100%)] rounded-l-lg open:animate-sheet-in',
}

/**
 * Diálogo modal sobre <dialog> nativo: fondo inerte, Esc para cerrar,
 * foco atrapado dentro y devuelto al elemento que lo abrió.
 */
function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  className,
  variant,
}: DialogProps & { variant: keyof typeof VARIANTS }) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const descriptionId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog || !open) return
    const returnTo = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const previousOverflow = document.body.style.overflow
    dialog.showModal()
    document.body.style.overflow = 'hidden'
    return () => {
      dialog.close()
      document.body.style.overflow = previousOverflow
      returnTo?.focus()
    }
  }, [open])

  function trapFocus(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key !== 'Tab' || !ref.current) return
    const items = [...ref.current.querySelectorAll<HTMLElement>(FOCUSABLE)]
    if (items.length === 0) return
    const first = items[0]
    const last = items[items.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
      onKeyDown={trapFocus}
      className={cn(
        'max-w-none overflow-hidden border-0 bg-crema p-0 text-tinta shadow-lg backdrop:bg-tinta/50 backdrop:backdrop-blur-[2px] open:backdrop:animate-fade-in',
        VARIANTS[variant],
        className,
      )}
    >
      {open && (
        <div className="flex max-h-[inherit] h-full flex-col">
          <header className="flex items-start gap-3 border-b border-arena-200 px-5 py-4 sm:px-6">
            <div className="min-w-0 flex-1 pt-1.5">
              <h2 id={titleId} className="text-xl">
                {title}
              </h2>
              {description && (
                <p id={descriptionId} className="mt-1 text-sm text-piedra">
                  {description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className="-mr-2 grid size-11 shrink-0 place-items-center rounded-full text-tinta-700 transition-colors hover:bg-arena-100 active:bg-arena-200"
            >
              <X aria-hidden="true" strokeWidth={1.75} className="size-5" />
            </button>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
          {footer && (
            <footer className="flex flex-wrap justify-end gap-3 border-t border-arena-200 px-5 py-4 sm:px-6">
              {footer}
            </footer>
          )}
        </div>
      )}
    </dialog>
  )
}

/** Ventana centrada para confirmaciones y formularios cortos. */
export function Modal(props: DialogProps) {
  return <Dialog variant="modal" {...props} />
}

/** Panel lateral (menú móvil, filtros). */
export function Sheet(props: DialogProps) {
  return <Dialog variant="sheet" {...props} />
}
