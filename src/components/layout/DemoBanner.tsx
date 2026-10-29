import { FlaskConical, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { resetDemoData } from '../../data/index.ts'
import { Button, Modal, useToast } from '../ui/index.ts'

export function DemoBanner() {
  const [confirming, setConfirming] = useState(false)
  const [resetting, setResetting] = useState(false)
  const toast = useToast()

  async function reset() {
    setResetting(true)
    try {
      await resetDemoData()
      setConfirming(false)
      toast({ title: 'Demo restablecida', description: 'Vuelven a estar los datos de ejemplo.' })
    } catch {
      toast({ title: 'No se ha podido restablecer', description: 'Vuelve a intentarlo.', tone: 'error' })
    } finally {
      setResetting(false)
    }
  }

  return (
    <aside aria-label="Aviso de demostración" className="bg-arena-200 text-tinta-700">
      <div className="container-page flex flex-wrap items-center justify-center gap-x-3 gap-y-0 py-1.5 text-center text-xs">
        <p className="flex items-center gap-2">
          <FlaskConical aria-hidden="true" strokeWidth={1.75} className="size-4 shrink-0" />
          <span>
            <strong className="font-semibold text-tinta">Demo de portafolio.</strong> No introduzcas datos reales.
          </span>
        </p>
        {/* Área táctil de 44 px con un pseudo-elemento, sin engordar la banda; por encima de la
            cabecera para que el borde inferior del área (sobre su relleno) también responda. */}
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="relative z-[45] inline-flex items-center gap-1 rounded-sm font-semibold text-tinta underline decoration-tinta/40 underline-offset-2 before:absolute before:-inset-x-2 before:-inset-y-3.5 hover:decoration-tinta"
        >
          <RotateCcw aria-hidden="true" strokeWidth={1.75} className="size-3.5" />
          Restablecer demo
        </button>
      </div>

      <Modal
        open={confirming}
        onClose={() => setConfirming(false)}
        title="¿Restablecer la demo?"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirming(false)}>
              Cancelar
            </Button>
            <Button onClick={reset} loading={resetting}>
              Restablecer
            </Button>
          </>
        }
      >
        <p className="text-tinta-700">
          Se borrarán las reservas y los cambios que hayas hecho en este navegador, y volverán los datos de
          ejemplo. La sesión del panel se mantiene.
        </p>
      </Modal>
    </aside>
  )
}
