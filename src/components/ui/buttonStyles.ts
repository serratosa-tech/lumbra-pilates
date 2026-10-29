import { cn } from '../../lib/cn.ts'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost'
export type ButtonSize = 'md' | 'lg'

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-terracota-600 text-white shadow-sm hover:bg-terracota-700 hover:shadow-md active:bg-terracota-700 active:shadow-sm',
  secondary:
    'border border-tinta/70 bg-crema/60 text-tinta hover:border-tinta hover:bg-arena-100 active:bg-arena-200',
  ghost: 'text-tinta hover:bg-arena-100 active:bg-arena-200',
}

const SIZES: Record<ButtonSize, string> = {
  md: 'min-h-11 px-5 py-2 text-sm',
  lg: 'min-h-13 px-7 py-3 text-base',
}

/** Clases de botón, también para enlaces que deben parecer botones. */
export function buttonClasses(variant: ButtonVariant = 'primary', size: ButtonSize = 'md', className?: string) {
  return cn(
    'inline-flex max-w-full items-center justify-center gap-2 rounded-full text-center font-semibold [&>svg]:shrink-0',
    'transition-[background-color,border-color,color,box-shadow,translate] duration-(--duration-fast) ease-(--ease-out-soft)',
    'hover:-translate-y-px active:translate-y-0',
    'disabled:pointer-events-none disabled:opacity-55 aria-busy:pointer-events-none',
    VARIANTS[variant],
    SIZES[size],
    className,
  )
}
