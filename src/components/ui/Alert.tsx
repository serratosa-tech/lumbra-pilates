import { CircleAlert, CircleCheck, Info, TriangleAlert, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '../../lib/cn.ts'

export type AlertTone = 'info' | 'exito' | 'aviso' | 'error'

const TONES: Record<AlertTone, { box: string; icon: LucideIcon }> = {
  info: { box: 'bg-info-50 border-info/25 text-info', icon: Info },
  exito: { box: 'bg-exito-50 border-exito/25 text-exito', icon: CircleCheck },
  aviso: { box: 'bg-aviso-50 border-aviso/25 text-aviso', icon: TriangleAlert },
  error: { box: 'bg-error-50 border-error/25 text-error', icon: CircleAlert },
}

interface AlertProps {
  tone?: AlertTone
  title: string
  children?: ReactNode
  action?: ReactNode
  className?: string
}

/** Mensaje destacado. Los errores se anuncian de inmediato (role="alert"). */
export function Alert({ tone = 'info', title, children, action, className }: AlertProps) {
  const { box, icon: Icon } = TONES[tone]
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn('flex flex-wrap items-start gap-3 rounded-md border p-4', box, className)}
    >
      <Icon aria-hidden="true" strokeWidth={1.75} className="mt-0.5 size-5 shrink-0" />
      <div className="min-w-0 flex-1 basis-48">
        <p className="font-medium">{title}</p>
        {children && <div className="mt-1 text-sm text-tinta-800">{children}</div>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
