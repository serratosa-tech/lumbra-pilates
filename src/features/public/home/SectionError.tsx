import { RotateCcw } from 'lucide-react'
import { Alert, Button } from '../../../components/ui/index.ts'

/** Error de carga de una sección de la portada, con «Reintentar» (mismo texto que el del horario). */
export function SectionError({ title, onRetry }: { title: string; onRetry: () => void }) {
  return (
    <div className="mt-8 sm:mt-12">
      <Alert
        tone="error"
        title={title}
        action={
          <Button variant="secondary" onClick={onRetry} icon={<RotateCcw aria-hidden="true" strokeWidth={1.75} className="size-4" />}>
            Reintentar
          </Button>
        }
      >
        Comprueba tu conexión y vuelve a intentarlo.
      </Alert>
    </div>
  )
}
