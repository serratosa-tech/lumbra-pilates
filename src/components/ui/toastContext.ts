import { createContext, useContext, type ReactNode } from 'react'

export type ToastTone = 'exito' | 'info' | 'error'

export interface ToastOptions {
  title: string
  description?: ReactNode
  tone?: ToastTone
}

export const ToastContext = createContext<((toast: ToastOptions) => void) | null>(null)

/** Devuelve la función para mostrar avisos breves. Requiere <ToastProvider>. */
export function useToast() {
  const show = useContext(ToastContext)
  if (!show) throw new Error('useToast necesita un <ToastProvider>.')
  return show
}
