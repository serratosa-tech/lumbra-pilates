import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router'
import { Alert, Button, Checkbox, Field, Input } from '../../../../components/ui/index.ts'
import {
  CANCELLATION_LIMIT_HOURS,
  DataError,
  errorMessage,
  type BookingDetails,
} from '../../../../data/index.ts'
import { useBookingForm } from './useBookingForm.ts'

const LINK = 'font-semibold text-terracota-700 underline underline-offset-4 hover:text-terracota-600'

interface BookingFormProps {
  sessionId: string
  /** La clase está llena: el formulario apunta a la lista de espera. */
  waitlist: boolean
  /** Aún se está a tiempo de cancelar online una plaza en esta clase. */
  cancellable: boolean
  onBooked: (details: BookingDetails) => void
}

export function BookingForm({ sessionId, waitlist, cancellable, onBooked }: BookingFormProps) {
  const { formRef, values, field, onSubmit, submitting, serverError, errorCount } = useBookingForm(sessionId, onBooked)
  const name = field('name')
  const email = field('email')
  const phone = field('phone')
  const privacy = field('privacy')
  const duplicate = serverError instanceof DataError && serverError.code === 'duplicate'

  return (
    <form ref={formRef} noValidate onSubmit={onSubmit} aria-label={waitlist ? 'Unirme a la lista de espera' : 'Reservar plaza'}>
      {errorCount > 0 && (
        <p role="alert" className="sr-only">
          Hay {errorCount === 1 ? 'un campo' : `${errorCount} campos`} por revisar.
        </p>
      )}
      {serverError !== null && (
        <Alert tone="error" title={duplicate ? 'Ya tienes esta clase reservada' : 'No hemos podido completar la reserva'} className="mb-5">
          {errorMessage(serverError)}{' '}
          {duplicate && (
            <Link to="/mis-reservas" className={LINK}>
              Consulta tu reserva en Mis reservas
            </Link>
          )}
        </Alert>
      )}

      <div className="flex flex-col gap-4">
        <Field label="Nombre y apellidos" required error={name.error}>
          {(control) => (
            <Input
              {...control}
              name="name"
              autoComplete="name"
              value={values.name}
              onChange={(e) => name.set(e.target.value)}
              onBlur={name.onBlur}
            />
          )}
        </Field>
        <Field label="Email" required error={email.error} hint="Con tu email y tu código podrás consultar o cancelar la reserva.">
          {(control) => (
            <Input
              {...control}
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              spellCheck={false}
              value={values.email}
              onChange={(e) => email.set(e.target.value)}
              onBlur={email.onBlur}
            />
          )}
        </Field>
        <Field label="Teléfono" required error={phone.error} hint="Solo para avisarte si hay algún cambio en la clase.">
          {(control) => (
            <Input
              {...control}
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="612 345 678"
              value={values.phone}
              onChange={(e) => phone.set(e.target.value)}
              onBlur={phone.onBlur}
            />
          )}
        </Field>
        <Checkbox
          name="privacy"
          required
          checked={values.privacy}
          onChange={(e) => privacy.set(e.target.checked)}
          onBlur={privacy.onBlur}
          error={privacy.error}
          label={
            <>
              He leído y acepto la{' '}
              <Link to="/privacidad" target="_blank" className={LINK}>
                política de privacidad
                <span className="sr-only"> (se abre en otra pestaña)</span>
              </Link>
              .
            </>
          }
        />
      </div>

      <Button type="submit" size="lg" loading={submitting} className="mt-5 w-full">
        {waitlist ? 'Apuntarme a la lista de espera' : 'Reservar plaza'}
        {!submitting && <ArrowRight aria-hidden="true" strokeWidth={1.75} className="size-5" />}
      </Button>
      <p className="mt-3 text-center text-sm text-piedra">
        {waitlist
          ? 'Si se libera una plaza, pasarás a tenerla automáticamente.'
          : cancellable
            ? `Sin pagos ni cuentas. Puedes cancelar hasta ${CANCELLATION_LIMIT_HOURS} horas antes.`
            : 'Sin pagos ni cuentas.'}
      </p>
    </form>
  )
}
