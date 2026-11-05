import { render } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { describe, expect, it } from 'vitest'
import indexHtml from '../../index.html?raw'
import { injectStaticShell } from '../lib/siteFiles.ts'
import { RootLayout } from './RootLayout.tsx'
import { staticShellMarkup } from './staticShellMarkup.tsx'

describe('shell estático de index.html', () => {
  it('lleva primero el enlace de salto y después la banda de demo', () => {
    const shell = document.createElement('div')
    shell.innerHTML = staticShellMarkup()
    const [skip, banner] = shell.children
    expect(skip).toHaveAttribute('href', '#contenido')
    expect(banner).toHaveAccessibleName('Aviso de demostración')
    expect(shell.children).toHaveLength(2)
  })

  it('va delante de #root, que sigue vacío para React, una sola vez', () => {
    const html = injectStaticShell(indexHtml, '<p>shell</p>')
    expect(html).toContain('<p>shell</p><div id="root"></div>')
    expect(() => injectStaticShell(`${indexHtml}<div id="root"></div>`, 'x')).toThrow()
    expect(() => injectStaticShell(indexHtml.replace('<div id="root"></div>', '<div id="root">x</div>'), 'x')).toThrow()
  })

  it('React no vuelve a pintarlo: la banda no sale dos veces', () => {
    const { container } = render(
      <MemoryRouter>
        <Routes>
          <Route element={<RootLayout />}>
            <Route path="*" element={<main>Página</main>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )
    expect(container.querySelector('aside[aria-label="Aviso de demostración"]')).toBeNull()
    expect(container.querySelector('a[href="#contenido"]')).toBeNull()
  })
})
