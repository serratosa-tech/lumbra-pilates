import { cn } from '../../lib/cn.ts'

interface SpinnerProps {
  className?: string
  /** Texto para lectores de pantalla; si se omite, el spinner es decorativo. */
  label?: string
}

export function Spinner({ className, label }: SpinnerProps) {
  return (
    <span role={label ? 'status' : undefined} className={cn('inline-flex', className)}>
      <svg viewBox="0 0 24 24" className="size-[1.25em] animate-spin" aria-hidden="true">
        <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2.5" opacity="0.25" />
        <path d="M21 12a9 9 0 0 0-9-9" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
      {label && <span className="sr-only">{label}</span>}
    </span>
  )
}
