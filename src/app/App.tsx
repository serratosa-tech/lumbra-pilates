import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router'
import { Spinner } from '../components/ui/index.ts'
import { DesignSystemPage } from '../features/public/design-system/DesignSystemPage.tsx'
import { HomePage } from '../features/public/home/HomePage.tsx'
import { MyBookingsPage } from '../features/public/my-bookings/MyBookingsPage.tsx'
import { NotFoundPage } from '../features/public/NotFoundPage.tsx'
import { SchedulePage } from '../features/public/schedule/SchedulePage.tsx'
import { PublicLayout } from './PublicLayout.tsx'
import { RootLayout } from './RootLayout.tsx'

// El panel del estudio va en su propio fragmento: la web pública no lo descarga.
const StudioApp = lazy(() => import('../features/admin/StudioApp.tsx'))
// Los textos legales, también: se visitan poco y pesan.
const PrivacyPage = lazy(() => import('../features/public/legal/PrivacyPage.tsx').then((m) => ({ default: m.PrivacyPage })))
const LegalNoticePage = lazy(() =>
  import('../features/public/legal/LegalNoticePage.tsx').then((m) => ({ default: m.LegalNoticePage })),
)

function PageFallback({ label }: { label: string }) {
  return (
    <div className="grid min-h-[60dvh] place-items-center">
      <Spinner label={label} className="text-terracota-600" />
    </div>
  )
}

/**
 * Las rutas, sin router: App las monta con BrowserRouter y el prerenderizado de la portada
 * (prerender.tsx) con StaticRouter, para que el HTML del build sea el mismo que pinta el navegador.
 */
export function AppRoutes() {
  return (
    <Routes>
      <Route element={<RootLayout />}>
        <Route
          path="estudio/*"
          element={
            <Suspense fallback={<PageFallback label="Cargando el panel…" />}>
              <StudioApp />
            </Suspense>
          }
        />
        <Route element={<PublicLayout />}>
          <Route index element={<HomePage />} />
          <Route path="clases" element={<SchedulePage />} />
          <Route path="mis-reservas" element={<MyBookingsPage />} />
          <Route
            path="privacidad"
            element={
              <Suspense fallback={<PageFallback label="Cargando…" />}>
                <PrivacyPage />
              </Suspense>
            }
          />
          <Route
            path="aviso-legal"
            element={
              <Suspense fallback={<PageFallback label="Cargando…" />}>
                <LegalNoticePage />
              </Suspense>
            }
          />
          <Route path="sistema" element={<DesignSystemPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}
