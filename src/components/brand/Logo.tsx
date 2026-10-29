import { cn } from '../../lib/cn.ts'
import { ARCH_PATH, SUBMARK_PATH, THRESHOLD_PATH, WORDMARK_PATH } from './logoPaths.ts'

type Surface = 'light' | 'dark'

interface LogoProps {
  className?: string
  /** Fondo sobre el que va el logo: cambia el tono del punto de luz. */
  surface?: Surface
  /** Texto alternativo; vacío si el logo es decorativo junto a un texto visible. */
  title?: string
}

function MarkShapes({ surface }: { surface: Surface }) {
  const ember = surface === 'light' ? 'fill-terracota-500' : 'fill-terracota-300'
  const glow = surface === 'light' ? 'fill-terracota-300' : 'fill-terracota-500'
  return (
    <>
      <circle cx="24" cy="30" r="8.5" className={glow} opacity="0.35" />
      <circle cx="24" cy="30" r="4.5" className={ember} />
      <path
        d={ARCH_PATH}
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d={THRESHOLD_PATH} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </>
  )
}

function a11yProps(title?: string) {
  return title ? { role: 'img', 'aria-label': title } : { 'aria-hidden': true as const }
}

/** Solo el símbolo: arco (umbral) con un punto de luz. */
export function LogoMark({ className, surface = 'light', title }: LogoProps) {
  return (
    <svg viewBox="0 0 48 48" className={cn('shrink-0', className)} {...a11yProps(title)}>
      <MarkShapes surface={surface} />
    </svg>
  )
}

/** Símbolo + logotipo «Lumbra PILATES». */
export function LogoFull({ className, surface = 'light', title = 'Lumbra Pilates' }: LogoProps) {
  return (
    <svg viewBox="0 0 172 48" className={cn('max-w-full shrink-0', className)} {...a11yProps(title)}>
      <MarkShapes surface={surface} />
      <g transform="translate(56 1.5)" fill="currentColor">
        <path d={WORDMARK_PATH} />
        <path d={SUBMARK_PATH} />
      </g>
    </svg>
  )
}
