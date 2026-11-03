import { Eye, EyeOff, LogIn } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { errorMessage, getDataSource, validateEmail, type Account } from '../../data/index.ts'
import { Alert, Button, Field, Input } from '../ui/index.ts'

interface SignInFormProps {
  /** Nombre accesible del formulario. */
  label: string
  onSignedIn: (account: Account) => void
  className?: string
}

/** Email + contraseña con Supabase Auth. Sin registro ni cambio de contraseña: las cuentas se crean en Supabase. */
export function SignInForm({ label, onSignedIn, className }: SignInFormProps) {
  const [values, setValues] = useState({ email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<unknown>(null)

  const errors = {
    email: validateEmail(values.email),
    password: values.password ? undefined : 'Escribe la contraseña.',
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitted(true)
    const firstInvalid = errors.email ? 'email' : errors.password ? 'password' : null
    if (firstInvalid) {
      const control = event.currentTarget.elements.namedItem(firstInvalid)
      if (control instanceof HTMLElement) control.focus()
      return
    }
    setPending(true)
    setError(null)
    try {
      onSignedIn(await getDataSource().signIn(values.email, values.password))
    } catch (err) {
      setError(err)
    } finally {
      setPending(false)
    }
  }

  return (
    <form noValidate onSubmit={submit} aria-label={label} className={className}>
      <div className="flex flex-col gap-4">
        {error !== null && (
          <Alert tone="error" title="No has podido entrar">
            {errorMessage(error)}
          </Alert>
        )}
        <Field label="Email" required error={submitted ? errors.email : undefined}>
          {(control) => (
            <Input
              {...control}
              name="email"
              type="email"
              inputMode="email"
              autoComplete="username"
              spellCheck={false}
              value={values.email}
              onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))}
            />
          )}
        </Field>
        <Field label="Contraseña" required error={submitted ? errors.password : undefined}>
          {(control) => (
            <div className="relative">
              <Input
                {...control}
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={values.password}
                onChange={(e) => setValues((v) => ({ ...v, password: e.target.value }))}
                className="pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                aria-pressed={showPassword}
                aria-label="Mostrar la contraseña"
                className="absolute top-0 right-0 grid size-11 place-items-center rounded-md text-piedra hover:text-tinta"
              >
                {showPassword ? (
                  <EyeOff aria-hidden="true" strokeWidth={1.75} className="size-5" />
                ) : (
                  <Eye aria-hidden="true" strokeWidth={1.75} className="size-5" />
                )}
              </button>
            </div>
          )}
        </Field>
        <Button type="submit" size="lg" loading={pending} icon={<LogIn aria-hidden="true" strokeWidth={1.75} className="size-5" />}>
          Entrar
        </Button>
      </div>
    </form>
  )
}
