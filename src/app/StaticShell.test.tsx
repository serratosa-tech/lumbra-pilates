import { render } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { describe, expect, it } from 'vitest'
import indexHtml from '../../index.html?raw'
import { injectRootMarkup } from '../lib/siteFiles.ts'
import { RootLayout } from './RootLayout.tsx'
import { staticShellMarkup } from './staticShellMarkup.tsx'

describe('shell estático de index.html', () => {
  it('es exactamente lo primero que pinta la app, en cualquier ruta', () => {
    const shell = document.createElement('div')
    shell.innerHTML = staticShellMarkup()
    expect(shell.querySelector('aside[aria-label="Aviso de demostración"]')).not.toBeNull()

    for (const path of ['/', '/clases', '/estudio/resumen', '/no-existe']) {
      const { container, unmount } = render(
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route element={<RootLayout />}>
              <Route path="*" element={<main>Página</main>} />
            </Route>
          </Routes>
        </MemoryRouter>,
      )
      const rendered = [...container.children].slice(0, shell.children.length)
      expect(rendered.length).toBe(shell.children.length)
      rendered.forEach((node, i) => expect(node.outerHTML).toBe(shell.children[i].outerHTML))
      unmount()
    }
  })

  it('se escribe una sola vez dentro del #root vacío de index.html', () => {
    const html = injectRootMarkup(indexHtml, '<p>shell</p>')
    expect(html).toContain('<div id="root"><p>shell</p></div>')
    expect(() => injectRootMarkup(html, '<p>shell</p>')).toThrow()
    expect(() => injectRootMarkup(`${indexHtml}<div id="root"></div>`, 'x')).toThrow()
  })
})
