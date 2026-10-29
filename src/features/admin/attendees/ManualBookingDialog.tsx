import { useId, useState, type ChangeEvent, type FormEvent } from 'react'
import { Alert, Button, Field, Input, Modal, useToast } from '../../../components/ui/index.ts'
import {
  errorMessage,
  getDataSource,
  validateEmail,
  validateName,
  validatePhone,
  type ClassSession,
} from '../../../data/index.ts'

type Values = { name: string; email: string; phone: string }
const FIELDS: Array<keyof Values> = ['name', 'email', 'phone']

/** Reserva hecha por el estudio (por teléfono o en recepción). Si la clase está llena, va a la lista de espera. */
export function ManualBookingDialog({ session, onClose }: { session: ClassSession; onClose: () => void }) {
  const formId = useId()
  const toast = useToast()
  const [values, setValues] = useState<Values>({ name: '', email: '', phone: '' })
  const [submitted, setSubmitted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [serverError, setServerError] = useState<unknown>(null)
  const errors: Partial<Values> = {
    name: validateName(values.name),
    email: validateEmail(values.email),
    phone: validatePhone(values.phone),
  }
  const full = session.bookedCount >= session.capacity

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitted(true)
    const firstInvalid = FIELDS.find((field) => errors[field])
    if (firstInvalid) {
      const control = event.currentTarget.elements.namedItem(firstInvalid)
      if (control instanceof HTMLElement) control.focus()
      return
    }
    setSaving(true)
    try {
      const { booking, waitlistPosition } = await getDataSource().addManualBooking({ sessionId: session.id, ...values })
      toast({
        title: booking.status === 'confirmed' ? 'Reserva añadida' : 'Añadida a la lista de espera',
        description:
          booking.status === 'confirmed'
            ? `${booking.name} tiene plaza. Código ${booking.code}.`
            : `${booking.name} está en el puesto ${waitlistPosition}. Código ${booking.code}.`,
      })
      onClose()
    } catch (error) {
      setServerError(error)
      setSaving(false)
    }
  }

  const bind = (field: keyof Values) => ({
    name: field,
    value: values[field],
    autoComplete: 'off',
    onChange: (e: ChangeEvent<HTMLInputElement>) => {
      setValues((v) => ({ ...v, [field]: e.target.value }))
      setServerError(null)
    },
  })

  return (
    <Modal
      open
      onClose={onClose}
      title="Añadir reserva"
      description={full ? 'La clase está completa: la persona entrará en la lista de espera.' : `${session.name}: quedan ${session.capacity - session.bookedCount} plazas.`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form={formId} loading={saving}>
            {full ? 'Añadir a la lista de espera' : 'Añadir reserva'}
          </Button>
        </>
      }
    >
      <form id={formId} noValidate onSubmit={submit} className="flex flex-col gap-4">
        {serverError !== null && (
          <Alert tone="error" title="No se ha podido añadir">
            {errorMessage(serverError)}
          </Alert>
        )}
        <Field label="Nombre y apellidos" required error={submitted ? errors.name : undefined}>
          {(control) => <Input {...control} {...bind('name')} />}
        </Field>
        <Field label="Email" required error={submitted ? errors.email : undefined}>
          {(control) => <Input {...control} {...bind('email')} type="email" inputMode="email" spellCheck={false} />}
        </Field>
        <Field label="Teléfono" required error={submitted ? errors.phone : undefined}>
          {(control) => <Input {...control} {...bind('phone')} type="tel" inputMode="tel" placeholder="612 345 678" />}
        </Field>
      </form>
    </Modal>
  )
}
