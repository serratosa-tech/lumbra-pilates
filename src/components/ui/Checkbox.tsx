import { Check } from 'lucide-react'
import { useId, type InputHTMLAttributes, type ReactNode } from 'react'
import { cn } from '../../lib/cn.ts'

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: ReactNode
  hint?: string
  error?: string
}

export function Checkbox({ label, hint, error, className, id: idProp, ...rest }: CheckboxProps) {
  const autoId = useId()
  const id = idProp ?? autoId
  const hintId = hint ? `${id}-ayuda` : undefined
  const errorId = error ? `${id}-error` : undefined

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <label
        htmlFor={id}
        className="group flex min-h-11 cursor-pointer items-start gap-3 py-2 has-disabled:cursor-not-allowed has-disabled:text-piedra"
      >
        <span className="relative mt-0.5 grid size-5 shrink-0 place-items-center">
          <input
            id={id}
            type="checkbox"
            className={cn(
              'peer size-5 cursor-pointer appearance-none rounded-sm border border-piedra bg-white',
              'transition-colors duration-(--duration-fast) group-hover:border-tinta-700',
              'checked:border-terracota-600 checked:bg-terracota-600',
              'aria-invalid:border-error disabled:cursor-not-allowed disabled:border-arena-400 disabled:bg-arena-100',
            )}
            aria-describedby={[hintId, errorId].filter(Boolean).join(' ') || undefined}
            aria-invalid={error ? true : undefined}
            {...rest}
          />
          <Check
            aria-hidden="true"
            strokeWidth={3}
            className="pointer-events-none absolute size-3.5 text-white opacity-0 transition-opacity peer-checked:opacity-100"
          />
        </span>
        <span className="text-sm leading-relaxed">{label}</span>
      </label>
      {hint && (
        <p id={hintId} className="pl-8 text-sm text-piedra">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="pl-8 text-sm font-medium text-error">
          {error}
        </p>
      )}
    </div>
  )
}
