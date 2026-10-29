import type { TextareaHTMLAttributes } from 'react'
import { cn } from '../../lib/cn.ts'
import { CONTROL_CLASSES } from './controlStyles.ts'

export function Textarea({ className, rows = 4, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={rows} className={cn(CONTROL_CLASSES, 'resize-y py-2.5', className)} {...rest} />
}
