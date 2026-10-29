import { Navigate, Route, Routes } from 'react-router'
import { PublicLayout } from '../../app/PublicLayout.tsx'
import { AttendeesPage } from './attendees/AttendeesPage.tsx'
import { LoginPage } from './LoginPage.tsx'
import { OverviewPage } from './overview/OverviewPage.tsx'
import { RequireStudio } from './RequireStudio.tsx'
import { SessionsPage } from './sessions/SessionsPage.tsx'
import { StudioLayout } from './StudioLayout.tsx'

/** Rutas de /estudio. Se cargan aparte (lazy) para no pesar en la web pública. */
export default function StudioApp() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<LoginPage />} />
      </Route>
      <Route element={<RequireStudio />}>
        <Route element={<StudioLayout />}>
          <Route path="resumen" element={<OverviewPage />} />
          <Route path="clases" element={<SessionsPage />} />
          <Route path="asistentes" element={<AttendeesPage />} />
          <Route path="*" element={<Navigate to="/estudio/resumen" replace />} />
        </Route>
      </Route>
    </Routes>
  )
}
