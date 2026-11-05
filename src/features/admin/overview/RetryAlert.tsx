import { RotateCcw } from 'lucide-react'
import { Alert, Button } from '../../../components/ui/index.ts'

export function RetryAlert({ onRetry }: { onRetry: () => void }) {
  return (
    <Alert
      tone="error"
      title="No hemos podido cargar los datos"
      action={
        <Button variant="secondary" onClick={onRetry} icon={<RotateCcw aria-hidden="true" strokeWidth={1.75} className="size-4" />}>
          Reintentar
        </Button>
      }
    >
      Vuelve a intentarlo en un momento.
    </Alert>
  )
}
