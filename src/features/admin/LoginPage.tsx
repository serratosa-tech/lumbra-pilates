import { Eye, EyeOff, KeyRound, LogIn } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router'
import { LogoMark } from '../../components/brand/Logo.tsx'
import { Seo } from '../../components/Seo.tsx'
import { Alert, Button, Field, Input, Spinner } from '../../components/ui/index.ts'
import { DEMO_CREDENTIALS, errorMessage, getDataSource, validateEmail } from '../../data/index.ts'
import { useAsyncData } from '../../lib/useAsyncData.ts'

const HOME = '/estudio/resumen'

export function LoginPage() {
  const navigate = useNavigate()
  const from = (useLocation().state as { from?: string } | null)?.from ?? HOME
  const session = useAsyncData('sesion-estudio', (ds) => ds.getStudioUser())
  const [values, setValues] = useState({ email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [pending, setPending] = useState<'form' | 'demo' | null>(null)
  const [error, setError] = useState<unknown>(null)

  const errors = {
    email: validateEmail(values.email),
    password: values.password ? undefined : 'Escribe la contraseña.',
  }

  async function signIn(email: string, password: string, source: 'form' | 'demo') {
    setPending(source)
    setError(null)
    try {
      await getDataSource().signIn(email, password)
      navigate(from, { replace: true })
    } catch (err) {
      setError(err)
      setPending(null)
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitted(true)
    const firstInvalid = errors.email ? 'email' : errors.password ? 'password' : null
    if (firstInvalid) {
      const control = event.currentTarget.elements.namedItem(firstInvalid)
      if (control instanceof HTMLElement) control.focus()
      return
    }
    void signIn(values.email, values.password, 'form')
  }

  if (session.state.status === 'ready' && session.state.data && !pending) return <Navigate to={HOME} replace />

  return (
    <div className="container-page grid grid-cols-1 justify-items-center py-10 sm:py-16">
      <Seo title="Acceso estudio" description="Acceso al panel de gestión de Lumbra Pilates." noindex />
      <div className="w-full max-w-md">
        <div className="text-center">
          <LogoMark className="mx-auto size-12 text-tinta" />
          <h1 className="mt-4 text-3xl">Acceso estudio</h1>
          <p className="mt-2 text-tinta-700">Gestiona clases, asistentes y métricas.</p>
        </div>

        {session.state.status === 'loading' ? (
          <div className="mt-8 grid place-items-center">
            <Spinner label="Comprobando la sesión…" className="text-terracota-600" />
          </div>
        ) : (
          <div className="mt-8 rounded-lg border border-arena-200 bg-white p-5 shadow-sm sm:p-7">
            <section aria-labelledby="cuenta-demo" className="rounded-md bg-info-50 p-4 text-sm">
              <h2 id="cuenta-demo" className="flex items-center gap-2 font-sans text-base font-semibold tracking-normal text-info">
                <KeyRound aria-hidden="true" strokeWidth={1.75} className="size-4" />
                Cuenta de demostración
              </h2>
              <dl className="mt-2 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-tinta-700">
                <dt>Email</dt>
                <dd className="font-semibold break-all">{DEMO_CREDENTIALS.email}</dd>
                <dt>Contraseña</dt>
                <dd className="font-semibold">{DEMO_CREDENTIALS.password}</dd>
              </dl>
              <Button
                variant="secondary"
                className="mt-3 w-full"
                loading={pending === 'demo'}
                onClick={() => signIn(DEMO_CREDENTIALS.email, DEMO_CREDENTIALS.password, 'demo')}
              >
                Entrar con la cuenta demo
              </Button>
            </section>

            <form noValidate onSubmit={submit} aria-label="Iniciar sesión" className="mt-6 flex flex-col gap-4">
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
              <Button
                type="submit"
                size="lg"
                loading={pending === 'form'}
                icon={<LogIn aria-hidden="true" strokeWidth={1.75} className="size-5" />}
              >
                Entrar
              </Button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
