import { BrowserRouter, Route, Routes } from 'react-router'
import { UnderConstructionPage } from '../features/public/UnderConstructionPage.tsx'
import { RootLayout } from './RootLayout.tsx'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<RootLayout />}>
          <Route index element={<UnderConstructionPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
