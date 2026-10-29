import { FlaskConical } from 'lucide-react'

export function DemoBanner() {
  return (
    <aside aria-label="Aviso de demostración" className="bg-arena-200 text-tinta-700">
      <p className="container-page flex items-center justify-center gap-2 py-1.5 text-center text-xs">
        <FlaskConical aria-hidden="true" strokeWidth={1.75} className="size-4 shrink-0" />
        <span>
          <strong className="font-semibold text-tinta">Demo de portafolio.</strong> No introduzcas datos
          reales.
        </span>
      </p>
    </aside>
  )
}
