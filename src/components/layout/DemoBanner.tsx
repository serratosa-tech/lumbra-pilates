import { FlaskConical } from 'lucide-react'

export function DemoBanner() {
  return (
    <aside aria-label="Aviso de demostración" className="overflow-x-clip bg-arena-200 text-tinta-700">
      <p className="container-page flex items-center justify-center gap-2 py-1.5 text-center text-xs">
        <FlaskConical aria-hidden="true" strokeWidth={1.75} className="size-4 shrink-0" />
        <span>
          <strong className="font-medium text-tinta">Demo con datos inventados.</strong> Se restablece
          automáticamente cada noche; no introduzcas datos reales.
        </span>
      </p>
    </aside>
  )
}
