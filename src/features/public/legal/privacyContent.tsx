import { Link } from 'react-router'
import { STORAGE_KEY } from '../../../data/storage.ts'
import { OWNER } from '../../../lib/site.ts'
import { LEGAL_LINK, type LegalSection } from './LegalPage.tsx'

const ownerMail = (
  <a href={`mailto:${OWNER.email}`} className={`${LEGAL_LINK} break-all`}>
    {OWNER.email}
  </a>
)

/** Política de privacidad (RGPD y LSSI). Conviene que la revise un profesional si se reutiliza para un cliente real. */
export const PRIVACY_SECTIONS: LegalSection[] = [
  {
    id: 'responsable',
    title: 'Responsable del tratamiento',
    body: (
      <>
        <p>
          {OWNER.name}, autora de esta web de portafolio. Contacto: {ownerMail}.
        </p>
        <p>
          Lumbra Pilates no existe: es un estudio ficticio. Su dirección y su email (hola@lumbra.example) son inventados
          y no reciben correo.
        </p>
      </>
    ),
  },
  {
    id: 'datos',
    title: 'Qué datos se tratan',
    body: (
      <ul>
        <li>
          <strong className="font-semibold text-tinta">Al reservar:</strong> el nombre, el email y el teléfono que
          escribas en el formulario, junto con la reserva.
        </li>
        <li>
          <strong className="font-semibold text-tinta">Si entras con una cuenta demo:</strong> la sesión, guardada en tu
          navegador. Las cuentas demo son públicas y no contienen datos tuyos.
        </li>
        <li>
          <strong className="font-semibold text-tinta">Para evitar abusos en Mis reservas:</strong> cuando una consulta
          falla se guarda una huella cifrada (hash) del email y de la dirección IP, nunca el dato en claro.
        </li>
        <li>
          <strong className="font-semibold text-tinta">Datos técnicos:</strong> los proveedores registran datos de
          conexión (como la dirección IP) para prestar el servicio y protegerlo.
        </li>
      </ul>
    ),
  },
  {
    id: 'finalidad',
    title: 'Para qué se usan',
    body: (
      <p>
        Solo para demostrar el funcionamiento de la app de portafolio: que se pueda reservar, consultar y cancelar, y
        ver el panel del estudio. No se envían comunicaciones, no se elaboran perfiles, no se toman decisiones
        automatizadas y no se venden datos.
      </p>
    ),
  },
  {
    id: 'base-legal',
    title: 'Base legal',
    body: (
      <ul>
        <li>
          Las reservas: tu consentimiento, al marcar la casilla del formulario (art. 6.1.a del RGPD). Puedes retirarlo
          cuando quieras cancelando la reserva o escribiendo a {ownerMail}.
        </li>
        <li>
          El límite de intentos y los registros técnicos: el interés legítimo en mantener la web segura y evitar abusos
          (art. 6.1.f del RGPD).
        </li>
      </ul>
    ),
  },
  {
    id: 'conservacion',
    title: 'Cuánto tiempo se conservan',
    body: (
      <ul>
        <li>Las reservas, con sus datos, se borran automáticamente cada noche, cuando la demo se restablece.</li>
        <li>Las reservas hechas con la cuenta demo de cliente vuelven a las de ejemplo cada hora.</li>
        <li>Las huellas de los intentos fallidos se borran al día siguiente.</li>
      </ul>
    ),
  },
  {
    id: 'proveedores',
    title: 'Proveedores',
    body: (
      <>
        <ul>
          <li>
            <strong className="font-semibold text-tinta">Supabase</strong>: base de datos y cuentas. Los datos se guardan
            en servidores de la Unión Europea (Estocolmo, Suecia).
          </li>
          <li>
            <strong className="font-semibold text-tinta">Cloudflare</strong>: alojamiento y entrega de la web.
          </li>
        </ul>
        <p>
          Ambos tratan los datos por cuenta de la responsable (encargados del tratamiento). Son empresas con sede en
          Estados Unidos: si algún dato se tratara fuera del Espacio Económico Europeo, sería con las garantías que
          exige el RGPD, como las cláusulas contractuales tipo de la Comisión Europea. No se ceden datos a terceros salvo
          obligación legal.
        </p>
      </>
    ),
  },
  {
    id: 'derechos',
    title: 'Tus derechos',
    body: (
      <>
        <p>
          Puedes ejercer los derechos de acceso, rectificación, supresión, oposición y limitación del tratamiento (y
          también el de portabilidad) escribiendo a {ownerMail} e indicando qué derecho quieres ejercer. La respuesta
          llegará en el plazo de un mes. Como las reservas se borran cada noche, lo normal es que para entonces ya no
          quede ningún dato tuyo.
        </p>
        <p>
          Si crees que no se han atendido bien tus derechos, puedes reclamar ante la Agencia Española de Protección de
          Datos (
          <a href="https://www.aepd.es" className={LEGAL_LINK} rel="noopener noreferrer" target="_blank">
            aepd.es
            <span className="sr-only"> (se abre en otra pestaña)</span>
          </a>
          ).
        </p>
      </>
    ),
  },
  {
    id: 'cookies',
    title: 'Cookies y almacenamiento en el navegador',
    body: (
      <>
        <p>
          Esta web no usa cookies de publicidad ni de analítica, ni ninguna herramienta de seguimiento. Por eso no
          muestra un aviso de cookies.
        </p>
        <p>
          Solo usa el almacenamiento técnico necesario para la sesión: si entras con una cuenta demo, tu navegador
          guarda la sesión en su almacenamiento local (localStorage) bajo la clave{' '}
          <code className="rounded-sm bg-arena-100 px-1 py-0.5 text-sm text-tinta">{STORAGE_KEY}</code>, y la borra al
          cerrar sesión. Es imprescindible para el servicio que pides, así que no necesita consentimiento (art. 22.2 de
          la LSSI). También puedes borrarla desde los ajustes de tu navegador.
        </p>
        <p>Si algún día se añadiera analítica, se pediría tu consentimiento antes de activarla.</p>
      </>
    ),
  },
  {
    id: 'cambios',
    title: 'Cambios en esta política',
    body: (
      <p>
        Si cambia la forma de tratar los datos, se actualizará esta página y su fecha. Consulta también el{' '}
        <Link to="/aviso-legal" className={LEGAL_LINK}>
          aviso legal
        </Link>
        .
      </p>
    ),
  },
]
