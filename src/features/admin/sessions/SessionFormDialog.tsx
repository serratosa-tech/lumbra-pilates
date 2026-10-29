import { useId, useState, type FormEvent } from 'react'
import { Alert, Button, Field, Input, Modal, Select, useToast } from '../../../components/ui/index.ts'
import {
  CAPACITY_RANGE,
  DURATION_RANGE,
  errorMessage,
  getDataSource,
  type ClassSession,
  type ClassType,
  type Instructor,
} from '../../../data/index.ts'
import { formatDateTime, type CalendarDate } from '../../../lib/dates.ts'
import {
  newSessionForm,
  sessionToForm,
  toSessionInput,
  validateSessionForm,
  type SessionFormValues,
} from './sessionForm.ts'

interface SessionFormDialogProps {
  /** Clase a editar; sin ella, se crea una nueva. */
  session: ClassSession | null
  defaultDate: CalendarDate
  classTypes: ClassType[]
  instructors: Instructor[]
  now: Date
  onClose: () => void
}

const FIELD_ORDER: Array<keyof SessionFormValues> = ['classTypeId', 'instructorId', 'date', 'time', 'durationMinutes', 'capacity']

export function SessionFormDialog({ session, defaultDate, classTypes, instructors, now, onClose }: SessionFormDialogProps) {
  const formId = useId()
  const toast = useToast()
  const [values, setValues] = useState<SessionFormValues>(() =>
    session ? sessionToForm(session) : newSessionForm(classTypes[0], instructors[0]?.id ?? '', defaultDate),
  )
  const [submitted, setSubmitted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [serverError, setServerError] = useState<unknown>(null)
  const booked = session?.bookedCount ?? 0
  const errors = validateSessionForm(values, { booked, now })
  const shown = (field: keyof SessionFormValues) => (submitted ? errors[field] : undefined)

  function set<K extends keyof SessionFormValues>(field: K, value: SessionFormValues[K]) {
    setValues((v) => ({ ...v, [field]: value }))
    setServerError(null)
  }

  function changeType(classTypeId: string) {
    const previous = classTypes.find((t) => t.id === values.classTypeId)
    const next = classTypes.find((t) => t.id === classTypeId)
    // Si la duración era la del tipo anterior, pasa a la del nuevo; si se cambió a mano, se respeta.
    const keepDuration = !previous || String(previous.durationMinutes) !== values.durationMinutes
    setValues((v) => ({
      ...v,
      classTypeId,
      durationMinutes: keepDuration || !next ? v.durationMinutes : String(next.durationMinutes),
    }))
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitted(true)
    const firstInvalid = FIELD_ORDER.find((field) => errors[field])
    if (firstInvalid) {
      const control = event.currentTarget.elements.namedItem(firstInvalid)
      if (control instanceof HTMLElement) control.focus()
      return
    }
    setSaving(true)
    try {
      const ds = getDataSource()
      const input = toSessionInput(values)
      if (session) {
        const { session: saved, promoted } = await ds.updateSession(session.id, input)
        toast({
          title: 'Clase actualizada',
          description: promoted.length
            ? `${promoted.map((b) => b.name).join(', ')} ${promoted.length === 1 ? 'pasa' : 'pasan'} de la lista de espera a tener plaza.`
            : `${saved.name}, ${formatDateTime(saved.startsAt)}.`,
        })
      } else {
        const saved = await ds.createSession(input)
        toast({ title: 'Clase creada', description: `${saved.name}, ${formatDateTime(saved.startsAt)}.` })
      }
      onClose()
    } catch (error) {
      setServerError(error)
      setSaving(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={session ? 'Editar clase' : 'Nueva clase'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form={formId} loading={saving}>
            {session ? 'Guardar cambios' : 'Crear clase'}
          </Button>
        </>
      }
    >
      <form id={formId} noValidate onSubmit={submit} className="flex flex-col gap-4">
        {serverError !== null && (
          <Alert tone="error" title="No se ha podido guardar">
            {errorMessage(serverError)}
          </Alert>
        )}
        <Field label="Tipo de clase" required error={shown('classTypeId')}>
          {(control) => (
            <Select {...control} name="classTypeId" value={values.classTypeId} onChange={(e) => changeType(e.target.value)}>
              {classTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Instructora" required error={shown('instructorId')}>
          {(control) => (
            <Select {...control} name="instructorId" value={values.instructorId} onChange={(e) => set('instructorId', e.target.value)}>
              {instructors.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <div className="grid grid-cols-1 gap-4 min-[26rem]:grid-cols-2">
          <Field label="Fecha" required error={shown('date')}>
            {(control) => (
              <Input {...control} name="date" type="date" value={values.date} onChange={(e) => set('date', e.target.value)} />
            )}
          </Field>
          <Field label="Hora de inicio" required error={shown('time')}>
            {(control) => (
              <Input {...control} name="time" type="time" step={300} value={values.time} onChange={(e) => set('time', e.target.value)} />
            )}
          </Field>
          <Field label="Duración (min)" required error={shown('durationMinutes')}>
            {(control) => (
              <Input
                {...control}
                name="durationMinutes"
                type="number"
                inputMode="numeric"
                min={DURATION_RANGE.min}
                max={DURATION_RANGE.max}
                step={5}
                value={values.durationMinutes}
                onChange={(e) => set('durationMinutes', e.target.value)}
              />
            )}
          </Field>
          <Field
            label="Aforo (plazas)"
            required
            error={shown('capacity')}
            hint={booked > 0 ? `Ya hay ${booked} reservadas.` : undefined}
          >
            {(control) => (
              <Input
                {...control}
                name="capacity"
                type="number"
                inputMode="numeric"
                min={Math.max(CAPACITY_RANGE.min, booked)}
                max={CAPACITY_RANGE.max}
                value={values.capacity}
                onChange={(e) => set('capacity', e.target.value)}
              />
            )}
          </Field>
        </div>
        {session && session.waitlistCount > 0 && (
          <p className="text-sm text-piedra">
            Si subes el aforo, entrarán automáticamente las primeras personas de la lista de espera.
          </p>
        )}
      </form>
    </Modal>
  )
}
