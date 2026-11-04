import { LayoutDashboard, UserRound, type LucideIcon } from 'lucide-react'
import type { DemoAccountKind } from '../../data/index.ts'
import { cn } from '../../lib/cn.ts'
import { Spinner } from '../ui/index.ts'
import { useDemoSignIn } from './useDemoSignIn.ts'

const BUTTONS: Array<{ kind: DemoAccountKind; label: string; icon: LucideIcon }> = [
  { kind: 'client', label: 'Probar como cliente', icon: UserRound },
  { kind: 'studio', label: 'Probar como estudio', icon: LayoutDashboard },
]

/** Accesos discretos a las cuentas demo, para la portada. */
export function DemoTryButtons({ className }: { className?: string }) {
  const { pending, signInAs } = useDemoSignIn()

  return (
    <div className={cn('flex flex-wrap items-center gap-x-4 text-sm text-piedra', className)}>
      <span id="explora-demo" className="w-full sm:w-auto">
        Explora la demo:
      </span>
      {BUTTONS.map(({ kind, label, icon: Icon }) => (
        <button
          key={kind}
          type="button"
          aria-describedby="explora-demo"
          aria-busy={pending === kind || undefined}
          disabled={pending !== null && pending !== kind}
          onClick={() => signInAs(kind)}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-sm font-medium text-terracota-700 underline decoration-terracota-700/35 underline-offset-4 transition-colors duration-(--duration-fast) hover:text-terracota-600 hover:decoration-terracota-600 disabled:opacity-55 aria-busy:pointer-events-none"
        >
          {pending === kind ? <Spinner /> : <Icon aria-hidden="true" strokeWidth={1.75} className="size-4 shrink-0" />}
          {label}
        </button>
      ))}
    </div>
  )
}
