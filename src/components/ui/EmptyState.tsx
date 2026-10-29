import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '../../lib/cn.ts'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  children?: ReactNode
  action?: ReactNode
  /** h1 cuando el estado vacío ocupa toda la página. */
  headingLevel?: 'h1' | 'h2' | 'h3'
  className?: string
}

export function EmptyState({ icon: Icon, title, children, action, headingLevel: Heading = 'h3', className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center rounded-lg border border-dashed border-arena-400 bg-arena-100/50 px-5 py-10 text-center',
        className,
      )}
    >
      <span className="grid size-16 place-items-center rounded-arch bg-arena-200 text-terracota-600">
        <Icon aria-hidden="true" strokeWidth={1.75} className="size-6" />
      </span>
      <Heading className="mt-4 text-xl">{title}</Heading>
      {children && <div className="mt-2 max-w-prose text-piedra">{children}</div>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
