import type { ReactNode } from 'react'
import { cn } from '../../lib/cn.ts'

export type BadgeTone = 'neutral' | 'terracota' | 'exito' | 'aviso' | 'error'

const TONES: Record<BadgeTone, string> = {
  neutral: 'bg-arena-100 text-tinta-700 ring-arena-200',
  terracota: 'bg-arena-100 text-terracota-700 ring-terracota-300/60',
  exito: 'bg-exito-50 text-exito ring-exito/20',
  aviso: 'bg-aviso-50 text-aviso ring-aviso/20',
  error: 'bg-error-50 text-error ring-error/20',
}

interface BadgeProps {
  tone?: BadgeTone
  icon?: ReactNode
  className?: string
  children: ReactNode
}

export function Badge({ tone = 'neutral', icon, className, children }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset',
        TONES[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  )
}
