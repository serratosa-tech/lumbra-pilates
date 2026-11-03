import { LegalPage } from './LegalPage.tsx'
import { LEGAL_NOTICE_SECTIONS } from './legalNoticeContent.tsx'

export function LegalNoticePage() {
  return (
    <LegalPage
      eyebrow="Aviso legal"
      title="Aviso legal"
      seoTitle="Aviso legal"
      description="Titular y condiciones de uso de Lumbra Pilates, un estudio de pilates ficticio creado como demo de portafolio de Helena Serratosa."
      intro={<p>Quién está detrás de esta web y en qué condiciones puedes usarla.</p>}
      sections={LEGAL_NOTICE_SECTIONS}
    />
  )
}
