import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { SiteFooter } from '../../../components/layout/SiteFooter.tsx'
import { LegalNoticePage } from './LegalNoticePage.tsx'
import { PrivacyPage } from './PrivacyPage.tsx'

const inRouter = (ui: React.ReactElement) => render(<MemoryRouter>{ui}</MemoryRouter>)

describe('páginas legales', () => {
  it('la política de privacidad identifica a la responsable y tiene todos los apartados con ancla', () => {
    inRouter(<PrivacyPage />)
    expect(screen.getByRole('heading', { level: 1, name: 'Política de privacidad' })).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'serratosah@gmail.com' }).length).toBeGreaterThan(0)
    for (const title of [
      'Responsable del tratamiento',
      'Para qué se usan',
      'Base legal',
      'Cuánto tiempo se conservan',
      'Proveedores',
      'Tus derechos',
      'Cookies y almacenamiento en el navegador',
    ]) {
      expect(screen.getByRole('heading', { level: 2, name: title })).toBeInTheDocument()
    }
    expect(document.getElementById('cookies')).not.toBeNull()
    expect(screen.getByText(/Estocolmo/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /aepd\.es/ })).toHaveAttribute('href', 'https://www.aepd.es')
  })

  it('el aviso legal dice que el estudio es ficticio', () => {
    inRouter(<LegalNoticePage />)
    expect(screen.getByRole('heading', { level: 1, name: 'Aviso legal' })).toBeInTheDocument()
    expect(screen.getByText(/Lumbra Pilates es un estudio ficticio creado como demo de portafolio/)).toBeInTheDocument()
  })

  it('el pie enlaza el aviso legal, la privacidad y las cookies', () => {
    inRouter(<SiteFooter />)
    const legal = within(screen.getByRole('navigation', { name: 'Legal' }))
    expect(legal.getByRole('link', { name: 'Aviso legal' })).toHaveAttribute('href', '/aviso-legal')
    expect(legal.getByRole('link', { name: 'Privacidad' })).toHaveAttribute('href', '/privacidad')
    expect(legal.getByRole('link', { name: 'Cookies' })).toHaveAttribute('href', '/privacidad#cookies')
  })
})
