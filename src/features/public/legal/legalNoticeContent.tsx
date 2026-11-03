import { Link } from 'react-router'
import { OWNER, STUDIO } from '../../../lib/site.ts'
import { LEGAL_LINK, type LegalSection } from './LegalPage.tsx'

/** Aviso legal (art. 10 de la LSSI). Conviene que lo revise un profesional si se reutiliza para un cliente real. */
export const LEGAL_NOTICE_SECTIONS: LegalSection[] = [
  {
    id: 'titular',
    title: 'Titular de la web',
    body: (
      <>
        <p>
          Titular: {OWNER.name}. Contacto:{' '}
          <a href={`mailto:${OWNER.email}`} className={`${LEGAL_LINK} break-all`}>
            {OWNER.email}
          </a>
          .
        </p>
        <p>Es una web de portafolio profesional: no ofrece servicios ni vende productos.</p>
      </>
    ),
  },
  {
    id: 'objeto',
    title: 'Un estudio ficticio',
    body: (
      <p>
        Lumbra Pilates es un estudio ficticio creado como demo de portafolio. Su nombre, su marca, su dirección (
        {STUDIO.street}, {STUDIO.city}), su email ({STUDIO.email}), su equipo y sus clases son inventados. Ninguna
        reserva da derecho a una clase real y nadie va a contactarte.
      </p>
    ),
  },
  {
    id: 'uso',
    title: 'Condiciones de uso',
    body: (
      <ul>
        <li>Puedes explorar la demo libremente, con o sin las cuentas demo públicas.</li>
        <li>No introduzcas datos reales: usa nombres, emails y teléfonos inventados.</li>
        <li>No intentes dañar el servicio ni acceder a datos que no te corresponden.</li>
        <li>Los datos se restablecen automáticamente cada noche.</li>
      </ul>
    ),
  },
  {
    id: 'propiedad',
    title: 'Propiedad intelectual',
    body: (
      <p>
        El diseño, el código, los textos y el logotipo de Lumbra Pilates son obra de {OWNER.name}. Las tipografías
        Fraunces y Figtree se usan bajo la licencia SIL Open Font License y los iconos de Lucide, bajo la licencia ISC.
      </p>
    ),
  },
  {
    id: 'responsabilidad',
    title: 'Responsabilidad y enlaces',
    body: (
      <p>
        La demo se ofrece tal cual, con fines demostrativos, y puede no estar disponible en algún momento. La titular no
        responde de los datos reales que se introduzcan pese al aviso, ni del contenido de las webs externas enlazadas.
      </p>
    ),
  },
  {
    id: 'privacidad',
    title: 'Privacidad y cookies',
    body: (
      <p>
        Cómo se tratan los datos y qué se guarda en tu navegador se explica en la{' '}
        <Link to="/privacidad" className={LEGAL_LINK}>
          política de privacidad
        </Link>
        .
      </p>
    ),
  },
  {
    id: 'legislacion',
    title: 'Legislación aplicable',
    body: <p>Esta web y estas condiciones se rigen por la legislación española.</p>,
  },
]
