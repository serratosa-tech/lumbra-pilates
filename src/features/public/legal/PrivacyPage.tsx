import { LegalPage } from './LegalPage.tsx'
import { PRIVACY_SECTIONS } from './privacyContent.tsx'

export function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Privacidad"
      title="Política de privacidad"
      seoTitle="Política de privacidad"
      description="Quién trata los datos de la demo de Lumbra Pilates, para qué, durante cuánto tiempo (se borran cada noche), con qué proveedores y cómo ejercer tus derechos. Sin cookies de publicidad ni analítica."
      intro={
        <p>
          Esta web es una demostración de portafolio. Las reservas que hagas se guardan de verdad en una base de datos
          para que la demo funcione, y se borran automáticamente cada noche.
        </p>
      }
      sections={PRIVACY_SECTIONS}
    />
  )
}
