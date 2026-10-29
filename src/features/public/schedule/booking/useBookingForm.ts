import { useRef, useState, type FormEvent } from 'react'
import {
  getDataSource,
  validateBookingForm,
  type BookingDetails,
  type BookingFormValues,
} from '../../../../data/index.ts'

type FieldName = keyof BookingFormValues
const FIELD_ORDER: FieldName[] = ['name', 'email', 'phone', 'privacy']
const EMPTY: BookingFormValues = { name: '', email: '', phone: '', privacy: false }

/**
 * Estado del formulario de reserva. Los errores aparecen al salir de cada campo (o al enviar)
 * y después se actualizan en vivo mientras se escribe. Lo escrito nunca se pierde.
 */
export function useBookingForm(sessionId: string, onBooked: (details: BookingDetails) => void) {
  const formRef = useRef<HTMLFormElement>(null)
  const [values, setValues] = useState<BookingFormValues>(EMPTY)
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({})
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState<unknown>(null)

  const errors = validateBookingForm(values)
  const visibleError = (field: FieldName) => (submitted || touched[field] ? errors[field] : undefined)

  function field<K extends FieldName>(name: K) {
    return {
      name,
      error: visibleError(name),
      onBlur: () => setTouched((t) => ({ ...t, [name]: true })),
      set: (value: BookingFormValues[K]) => {
        setValues((v) => ({ ...v, [name]: value }))
        setServerError(null)
      },
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitted(true)
    const firstInvalid = FIELD_ORDER.find((name) => errors[name])
    if (firstInvalid) {
      const control = formRef.current?.elements.namedItem(firstInvalid)
      if (control instanceof HTMLElement) control.focus()
      return
    }
    setSubmitting(true)
    setServerError(null)
    try {
      onBooked(await getDataSource().createBooking({ sessionId, ...values }))
    } catch (error) {
      setServerError(error)
    } finally {
      setSubmitting(false)
    }
  }

  return { formRef, values, field, onSubmit, submitting, serverError, errorCount: submitted ? Object.keys(errors).length : 0 }
}
