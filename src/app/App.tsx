import { LockKeyhole, Ticket } from 'lucide-react'
import { BrowserRouter, Route, Routes } from 'react-router'
import { ComingSoonPage } from '../features/public/ComingSoonPage.tsx'
import { DesignSystemPage } from '../features/public/design-system/DesignSystemPage.tsx'
import { HomePage } from '../features/public/home/HomePage.tsx'
import { NotFoundPage } from '../features/public/NotFoundPage.tsx'
import { PrivacyPage } from '../features/public/PrivacyPage.tsx'
import { SchedulePage } from '../features/public/schedule/SchedulePage.tsx'
import { PublicLayout } from './PublicLayout.tsx'
import { RootLayout } from './RootLayout.tsx'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<RootLayout />}>
          <Route element={<PublicLayout />}>
            <Route index element={<HomePage />} />
            <Route path="clases" element={<SchedulePage />} />
            <Route
              path="mis-reservas"
              element={
                <ComingSoonPage
                  icon={Ticket}
                  title="Mis reservas"
                  description="Pronto podrás consultar y cancelar tus reservas con tu email y tu código de reserva."
                />
              }
            />
            <Route
              path="estudio"
              element={
                <ComingSoonPage
                  icon={LockKeyhole}
                  title="Acceso estudio"
                  description="El panel del equipo, con clases, asistentes y métricas, llegará en la próxima fase."
                />
              }
            />
            <Route path="privacidad" element={<PrivacyPage />} />
            <Route path="sistema" element={<DesignSystemPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
