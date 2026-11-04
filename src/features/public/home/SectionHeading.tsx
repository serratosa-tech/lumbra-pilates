import type { ReactNode } from 'react'
import { cn } from '../../../lib/cn.ts'

interface SectionHeadingProps {
  id: string
  kicker: string
  title: string
  children?: ReactNode
  className?: string
}

export function SectionHeading({ id, kicker, title, children, className }: SectionHeadingProps) {
  return (
    <div className={cn('max-w-2xl', className)}>
      <p className="text-xs font-medium tracking-widest text-terracota-700 uppercase">{kicker}</p>
      <h2 id={id} className="mt-3 text-3xl">
        {title}
      </h2>
      {children && <div className="mt-4 text-lg text-tinta-700">{children}</div>}
    </div>
  )
}
