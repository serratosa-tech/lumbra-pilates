import { Search, Sparkles } from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'
import { Button, Field, Input } from '../../../components/ui/index.ts'
import { DEMO_EXAMPLES, isBookingCode, normalizeCode, validateEmail } from '../../../data/index.ts'

export interface LookupQuery {
  email: string
  code: string
}

function validateCode(code: string): ReactNode {
  if (!code.trim()) return 'Escribe tu código de reserva.'
  if (!isBookingCode(normalizeCode(code)))
    return (
      <>
        El código tiene la forma <span className="whitespace-nowrap">LUM-7K3Q</span>: cuatro letras o números tras
        «LUM-».
      </>
    )
  return undefined
}

interface LookupFormProps {
  initial: LookupQuery
  searching: boolean
  onSearch: (query: LookupQuery) => void
}

/** Email + código, con validación en vivo tras el primer intento, y reservas de ejemplo de la demo. */
export function LookupForm({ initial, searching, onSearch }: LookupFormProps) {
  const [values, setValues] = useState(initial)
  const [submitted, setSubmitted] = useState(false)
  const errors = { email: validateEmail(values.email), code: validateCode(values.code) }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitted(true)
    const firstInvalid = errors.email ? 'email' : errors.code ? 'code' : null
    if (firstInvalid) {
      const control = event.currentTarget.elements.namedItem(firstInvalid)
      if (control instanceof HTMLElement) control.focus()
      return
    }
    onSearch({ email: values.email.trim(), code: normalizeCode(values.code) })
  }

  function tryExample(example: LookupQuery) {
    setValues(example)
    setSubmitted(false)
    onSearch(example)
  }

  return (
    <div className="flex flex-col gap-6">
      <form noValidate onSubmit={submit} aria-label="Buscar mi reserva" className="flex flex-col gap-4">
        <Field label="Email" required error={submitted ? errors.email : undefined} hint="El mismo con el que reservaste.">
          {(control) => (
            <Input
              {...control}
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              spellCheck={false}
              value={values.email}
              onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))}
            />
          )}
        </Field>
        <Field label="Código de reserva" required error={submitted ? errors.code : undefined}>
          {(control) => (
            <Input
              {...control}
              name="code"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              placeholder="LUM-7K3Q"
              value={values.code}
              onChange={(e) => setValues((v) => ({ ...v, code: e.target.value }))}
              className="uppercase tracking-wider placeholder:normal-case"
            />
          )}
        </Field>
        <Button type="submit" size="lg" loading={searching} icon={<Search aria-hidden="true" strokeWidth={1.75} className="size-5" />}>
          Consultar reserva
        </Button>
      </form>

      <section aria-labelledby="demo-ejemplos" className="rounded-md border border-dashed border-arena-400 bg-arena-100/50 p-4">
        <h2 id="demo-ejemplos" className="flex items-center gap-2 font-sans text-sm font-semibold tracking-normal">
          <Sparkles aria-hidden="true" strokeWidth={1.75} className="size-4 text-terracota-600" />
          Prueba la demo
        </h2>
        <p className="mt-1 text-sm text-piedra">Consulta una de estas reservas de ejemplo con un clic.</p>
        <ul className="mt-3 flex flex-col gap-2">
          {DEMO_EXAMPLES.map((example) => (
            <li key={example.code}>
              <button
                type="button"
                onClick={() => tryExample({ email: example.email, code: example.code })}
                className="flex min-h-11 w-full flex-col items-start rounded-sm border border-arena-200 bg-white px-3 py-2 text-left text-sm transition-colors hover:border-arena-400 hover:bg-crema"
              >
                <span className="font-semibold">{example.label}</span>
                {/* Si no caben en una línea, el código baja entero a la siguiente: nunca se parte. */}
                <span className="flex max-w-full flex-wrap gap-x-1 text-piedra">
                  <span className="min-w-0 break-all">{example.email}{' ·'}</span>
                  <span className="whitespace-nowrap tabular-nums">{example.code}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
