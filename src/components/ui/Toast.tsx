import { CircleAlert, CircleCheck, Info, X, type LucideIcon } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '../../lib/cn.ts'
import { ToastContext, type ToastOptions, type ToastTone } from './toastContext.ts'

const DURATION_MS = 5000

interface ToastItem extends ToastOptions {
  id: number
}

const TONES: Record<ToastTone, { icon: LucideIcon; color: string }> = {
  exito: { icon: CircleCheck, color: 'text-exito' },
  info: { icon: Info, color: 'text-info' },
  error: { icon: CircleAlert, color: 'text-error' },
}

function ToastCard({ toast, onDismiss }: { toast: ToastItem; onDismiss: (id: number) => void }) {
  const [paused, setPaused] = useState(false)
  const remaining = useRef(DURATION_MS)

  useEffect(() => {
    if (paused) return
    const startedAt = Date.now()
    const timer = window.setTimeout(() => onDismiss(toast.id), remaining.current)
    return () => {
      window.clearTimeout(timer)
      remaining.current -= Date.now() - startedAt
    }
  }, [paused, toast.id, onDismiss])

  const { icon: Icon, color } = TONES[toast.tone ?? 'exito']
  return (
    <li
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      // Con el texto muy grande (la lista, con `@container`, mide menos de 14 rem), icono y botón de cerrar
      // quedan arriba y el texto baja a ancho completo, en vez de quedarse sin sitio entre los dos.
      className="pointer-events-auto flex w-full items-start gap-3 rounded-md border border-arena-200 bg-white p-4 shadow-lg animate-toast-in @max-[14rem]:flex-wrap"
    >
      <Icon aria-hidden="true" strokeWidth={1.75} className={cn('mt-0.5 size-5 shrink-0', color)} />
      <div className="min-w-0 flex-1 @max-[14rem]:order-last @max-[14rem]:basis-full">
        <p className="font-medium">{toast.title}</p>
        {toast.description && <p className="mt-0.5 text-sm text-piedra">{toast.description}</p>}
      </div>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label="Cerrar aviso"
        className="-m-2 grid size-11 shrink-0 place-items-center rounded-full text-tinta-700 transition-colors hover:bg-arena-100 @max-[14rem]:ml-auto"
      >
        <X aria-hidden="true" strokeWidth={1.75} className="size-5" />
      </button>
    </li>
  )
}

/** Avisos breves anunciados a lectores de pantalla; se cierran solos salvo con el ratón o el foco encima. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const nextId = useRef(0)

  const show = useCallback((toast: ToastOptions) => {
    nextId.current += 1
    const id = nextId.current
    setToasts((current) => [...current.slice(-2), { ...toast, id }])
  }, [])

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext value={show}>
      {children}
      <div
        aria-live="polite"
        aria-label="Avisos"
        role="region"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center p-4 sm:justify-end sm:p-6"
      >
        <ol className="@container flex w-full max-w-sm flex-col gap-3">
          {toasts.map((toast) => (
            <ToastCard key={toast.id} toast={toast} onDismiss={dismiss} />
          ))}
        </ol>
      </div>
    </ToastContext>
  )
}
