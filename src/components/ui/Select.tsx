import { ChevronDown } from 'lucide-react'
import type { SelectHTMLAttributes } from 'react'
import { cn } from '../../lib/cn.ts'
import { CONTROL_CLASSES } from './controlStyles.ts'

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className={cn('relative', className)}>
      <select className={cn(CONTROL_CLASSES, 'cursor-pointer appearance-none pr-11')} {...rest}>
        {children}
      </select>
      <ChevronDown
        aria-hidden="true"
        strokeWidth={1.75}
        className="pointer-events-none absolute top-1/2 right-3.5 size-5 -translate-y-1/2 text-piedra"
      />
    </div>
  )
}
