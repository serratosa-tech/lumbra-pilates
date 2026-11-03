import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router'
import { Spinner } from '../components/ui/index.ts'
import { DesignSystemPage } from '../features/public/design-system/DesignSystemPage.tsx'
import { HomePage } from '../features/public/home/HomePage.tsx'
import { MyBookingsPage } from '../features/public/my-bookings/MyBookingsPage.tsx'
import { NotFoundPage } from '../features/public/NotFoundPage.tsx'
import { LegalNoticePage } from '../features/public/legal/LegalNoticePage.tsx'
import { PrivacyPage } from '../features/public/legal/PrivacyPage.tsx'
import { SchedulePage } from '../features/public/schedule/SchedulePage.tsx'
import { PublicLayout } from './PublicLayout.tsx'
import { RootLayout } from './RootLayout.tsx'

// El panel del estudio va en su propio fragmento: la web pública no lo descarga.
const StudioApp = lazy(() => import('../features/admin/StudioApp.tsx'))

function PanelFallback() {
  return (
    <div className="grid min-h-[60dvh] place-items-center">
      <Spinner label="Cargando el panel…" className="text-terracota-600" />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<RootLayout />}>
          <Route
            path="estudio/*"
            element={
              <Suspense fallback={<PanelFallback />}>
                <StudioApp />
              </Suspense>
            }
          />
          <Route element={<PublicLayout />}>
            <Route index element={<HomePage />} />
            <Route path="clases" element={<SchedulePage />} />
            <Route path="mis-reservas" element={<MyBookingsPage />} />
            <Route path="privacidad" element={<PrivacyPage />} />
            <Route path="aviso-legal" element={<LegalNoticePage />} />
            <Route path="sistema" element={<DesignSystemPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
