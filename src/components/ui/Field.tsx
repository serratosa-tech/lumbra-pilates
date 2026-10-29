import { CircleAlert } from 'lucide-react'
import { useId, type ReactNode } from 'react'
import { cn } from '../../lib/cn.ts'

export interface FieldControlProps {
  id: string
  'aria-describedby'?: string
  'aria-invalid'?: true
  required?: boolean
}

interface FieldProps {
  label: string
  hint?: string
  error?: string
  required?: boolean
  className?: string
  /** Recibe los atributos de accesibilidad que hay que pasar al control. */
  children: (control: FieldControlProps) => ReactNode
}

/** Etiqueta + control + ayuda + error, asociados con aria-describedby. */
export function Field({ label, hint, error, required, className, children }: FieldProps) {
  const id = useId()
  const hintId = hint ? `${id}-ayuda` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-sm font-semibold text-tinta">
        {label}
        {required && (
          <span className="font-normal text-piedra">
            {' '}
            <span aria-hidden="true">*</span>
            <span className="sr-only">(obligatorio)</span>
          </span>
        )}
      </label>
      {children({ id, 'aria-describedby': describedBy, 'aria-invalid': error ? true : undefined, required })}
      {hint && (
        <p id={hintId} className="text-sm text-piedra">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="flex items-start gap-1.5 text-sm font-semibold text-error">
          <CircleAlert aria-hidden="true" strokeWidth={1.75} className="mt-0.5 size-4 shrink-0" />
          {error}
        </p>
      )}
    </div>
  )
}
