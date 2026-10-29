import type { HTMLAttributes } from 'react'
import { cn } from '../../lib/cn.ts'

interface CardProps extends HTMLAttributes<HTMLElement> {
  as?: 'div' | 'article' | 'li' | 'section'
  /** Eleva la tarjeta al pasar el ratón (para tarjetas que contienen un enlace). */
  interactive?: boolean
}

export function Card({ as: Tag = 'div', interactive = false, className, ...rest }: CardProps) {
  return (
    <Tag
      className={cn(
        'rounded-lg border border-arena-200 bg-white p-5 shadow-sm sm:p-6',
        interactive &&
          'transition-[box-shadow,translate,border-color] duration-(--duration-base) ease-(--ease-out-soft) hover:-translate-y-0.5 hover:border-arena-400 hover:shadow-md',
        className,
      )}
      {...rest}
    />
  )
}
