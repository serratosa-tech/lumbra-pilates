import { CalendarX2, Send } from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'
import { LogoFull, LogoMark } from '../../../components/brand/Logo.tsx'
import { Seo } from '../../../components/Seo.tsx'
import {
  Alert,
  Badge,
  Button,
  Card,
  Checkbox,
  EmptyState,
  Field,
  Input,
  Modal,
  Select,
  Sheet,
  Skeleton,
  Spinner,
  Textarea,
  useToast,
} from '../../../components/ui/index.ts'
import { SEP } from '../../../lib/text.ts'
import { SWATCHES } from './swatches.ts'

function Block({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="border-t border-arena-200 py-12">
      <h2 id={id} className="text-2xl">
        {title}
      </h2>
      <div className="mt-6">{children}</div>
    </section>
  )
}

function DemoForm() {
  const toast = useToast()
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string>()
  const [sending, setSending] = useState(false)

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError('Escribe un email válido, por ejemplo nombre@dominio.es.')
      return
    }
    setError(undefined)
    setSending(true)
    window.setTimeout(() => {
      setSending(false)
      toast({ title: 'Formulario enviado', description: 'Así se ve un aviso de éxito.' })
    }, 900)
  }

  return (
    <form noValidate onSubmit={submit} className="grid max-w-xl grid-cols-1 gap-5">
      <Field label="Email" hint="Prueba a enviarlo vacío para ver el error." error={error} required>
        {(props) => (
          <Input {...props} type="email" autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} />
        )}
      </Field>
      <Field label="Clase favorita">
        {(props) => (
          <Select {...props} defaultValue="mat-flow">
            <option value="reformer-esencial">Reformer Esencial</option>
            <option value="mat-flow">Mat Flow</option>
            <option value="respira-y-estira">Respira y Estira</option>
          </Select>
        )}
      </Field>
      <Field label="Comentarios" hint="Opcional.">
        {(props) => <Textarea {...props} rows={3} />}
      </Field>
      <Field label="Campo deshabilitado">{(props) => <Input {...props} disabled value="No editable" readOnly />}</Field>
      <Checkbox label="Acepto que esto es una demo y no introduzco datos reales" defaultChecked />
      <Checkbox label="Opción deshabilitada" disabled />
      <div>
        <Button type="submit" loading={sending} icon={<Send aria-hidden="true" strokeWidth={1.75} className="size-4" />}>
          Enviar
        </Button>
      </div>
    </form>
  )
}

export function DesignSystemPage() {
  const toast = useToast()
  const [modalOpen, setModalOpen] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)

  return (
    <div className="container-page py-16">
      <Seo
        title="Sistema de diseño"
        description="Marca, tokens y componentes de Lumbra Pilates con todos sus estados."
        noindex
      />
      <p className="text-xs font-semibold tracking-widest text-terracota-700 uppercase">Lumbra Pilates</p>
      <h1 className="mt-3 text-3xl">Sistema de diseño</h1>
      <p className="mt-4 max-w-2xl text-lg text-tinta-700">
        Marca, tokens y componentes base con sus estados. Todo lo que ves aquí es lo que usa la app.
      </p>

      <Block id="ds-marca" title="Marca">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Card className="grid place-items-center py-10">
            <LogoFull className="h-14 w-auto text-tinta" />
          </Card>
          <div className="grid place-items-center rounded-lg bg-tinta py-10 shadow-sm">
            <LogoFull surface="dark" className="h-14 w-auto text-crema" />
          </div>
          <Card className="flex items-center justify-center gap-8 py-10">
            <LogoMark title="Símbolo de Lumbra" className="size-16 text-tinta" />
            <img src="/favicon.svg" alt="Favicon de Lumbra" width="48" height="48" className="size-12" />
          </Card>
          <Card className="flex flex-col justify-center gap-2 py-8">
            <p className="font-display text-2xl">Fraunces{SEP}titulares</p>
            <p className="font-display text-2xl italic">Fraunces cursiva{SEP}acentos</p>
            <p>Figtree normal{SEP}texto de lectura</p>
            <p className="font-semibold">Figtree seminegrita{SEP}botones y etiquetas</p>
          </Card>
        </div>
      </Block>

      <Block id="ds-color" title="Color">
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(9rem,100%),1fr))] gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {SWATCHES.map((s) => (
            <li key={s.token} className="overflow-hidden rounded-md border border-arena-200 bg-white">
              <span aria-hidden="true" className={`block h-16 ${s.className}`} />
              <span className="block p-3 text-sm">
                <span className="block font-semibold">{s.token}</span>
                <span className="block text-piedra uppercase">{s.hex}</span>
              </span>
            </li>
          ))}
        </ul>
      </Block>

      <Block id="ds-botones" title="Botones">
        <div className="flex flex-wrap items-center gap-3">
          <Button>Primario</Button>
          <Button variant="secondary">Secundario</Button>
          <Button variant="ghost">Fantasma</Button>
          <Button size="lg">Grande</Button>
          <Button disabled>Deshabilitado</Button>
          <Button loading>Guardando</Button>
        </div>
      </Block>

      <Block id="ds-formularios" title="Formularios">
        <DemoForm />
      </Block>

      <Block id="ds-estados" title="Estados y mensajes">
        <div className="flex flex-wrap gap-2">
          <Badge>Neutral</Badge>
          <Badge tone="terracota">Iniciación</Badge>
          <Badge tone="exito">6 plazas libres</Badge>
          <Badge tone="aviso">Última plaza</Badge>
          <Badge tone="error">Completa</Badge>
        </div>
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Alert tone="info" title="Información">Las clases se pueden cancelar hasta 12 horas antes.</Alert>
          <Alert tone="exito" title="Reserva confirmada">Te esperamos el jueves a las 19:15.</Alert>
          <Alert tone="aviso" title="Lista de espera">Te avisaremos si se libera una plaza.</Alert>
          <Alert tone="error" title="No se ha podido reservar">Inténtalo de nuevo en unos segundos.</Alert>
        </div>
        <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Card>
            <p className="flex items-center gap-3 font-semibold">
              <Spinner label="Cargando" className="text-terracota-600" /> Cargando…
            </p>
            <div className="mt-5 flex flex-col gap-3" aria-hidden="true">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </div>
          </Card>
          <EmptyState icon={CalendarX2} title="Sin reservas todavía">
            Cuando reserves una clase, aparecerá aquí.
          </EmptyState>
        </div>
      </Block>

      <Block id="ds-capas" title="Ventanas y avisos">
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => setModalOpen(true)}>
            Abrir ventana
          </Button>
          <Button variant="secondary" onClick={() => setSheetOpen(true)}>
            Abrir panel lateral
          </Button>
          <Button
            variant="secondary"
            onClick={() => toast({ title: 'Aviso informativo', description: 'Se cierra solo en 5 segundos.', tone: 'info' })}
          >
            Mostrar aviso
          </Button>
        </div>
      </Block>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="¿Cancelar la reserva?"
        description="Liberarás tu plaza para otra persona."
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Mantener
            </Button>
            <Button onClick={() => setModalOpen(false)}>Sí, cancelar</Button>
          </>
        }
      >
        <p>El foco queda dentro de la ventana; Esc la cierra y el foco vuelve al botón que la abrió.</p>
      </Modal>
      <Sheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="Panel lateral">
        <p>Se usa para el menú en móvil y para filtros.</p>
      </Sheet>
    </div>
  )
}
