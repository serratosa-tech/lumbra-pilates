import type { ReactNode } from 'react'
import { Seo } from '../../components/Seo.tsx'
import { Alert } from '../../components/ui/index.ts'
import { STUDIO } from '../../lib/site.ts'

const SECTIONS: Array<{ title: string; body: ReactNode }> = [
  {
    title: 'Qué es esta web',
    body: (
      <p>
        Lumbra Pilates es un estudio ficticio. Esta web es una demostración de portafolio: puedes reservar,
        cancelar y probar el panel del estudio, pero ninguna clase es real y nadie va a contactarte.
      </p>
    ),
  },
  {
    title: 'Qué datos pedimos y para qué',
    body: (
      <p>
        Para reservar pedimos nombre, email y teléfono, como haría un estudio real: el email y el código de
        reserva sirven para consultar o cancelar, y el teléfono, para avisar de cambios. En la demo no se
        envía ningún mensaje.
      </p>
    ),
  },
  {
    title: 'Dónde se guardan',
    body: (
      <p>
        Solo en tu navegador, en su almacenamiento local (localStorage), bajo una única clave. No se envían a
        ningún servidor, no hay cookies de seguimiento ni herramientas de analítica, y nadie más puede verlos.
      </p>
    ),
  },
  {
    title: 'Cuánto tiempo se conservan y cómo borrarlos',
    body: (
      <p>
        Hasta que pulses «Restablecer demo» en la banda superior, borres los datos de este sitio en tu
        navegador o empiece una semana nueva, momento en que la demo vuelve a sus datos de ejemplo.
      </p>
    ),
  },
  {
    title: 'Contacto',
    body: (
      <p>
        El estudio no existe, así que la dirección {STUDIO.email} tampoco recibe correo. Si tienes dudas sobre
        la demo, contacta con su autora, Helena Serratosa, a través de su perfil de portafolio.
      </p>
    ),
  },
]

export function PrivacyPage() {
  return (
    <div className="container-page py-10 sm:py-14 lg:py-16">
      <Seo
        title="Política de privacidad"
        description="Cómo trata los datos la demo de Lumbra Pilates: todo se guarda solo en tu navegador y no se envía a ningún servidor."
      />
      <article className="max-w-2xl">
        <p className="text-xs font-semibold tracking-widest text-terracota-700 uppercase">Privacidad</p>
        <h1 className="mt-3 text-3xl">Política de privacidad</h1>
        <Alert tone="info" title="Esto es una demo" className="mt-6">
          No introduzcas datos reales: usa nombres y emails inventados.
        </Alert>
        <div className="mt-8 flex flex-col gap-8 text-tinta-700">
          {SECTIONS.map((section) => (
            <section key={section.title}>
              <h2 className="text-xl text-tinta">{section.title}</h2>
              <div className="mt-2">{section.body}</div>
            </section>
          ))}
        </div>
      </article>
    </div>
  )
}
