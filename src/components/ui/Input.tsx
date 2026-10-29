import type { InputHTMLAttributes } from 'react'
import { cn } from '../../lib/cn.ts'
import { CONTROL_CLASSES } from './controlStyles.ts'

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(CONTROL_CLASSES, className)} {...rest} />
}
