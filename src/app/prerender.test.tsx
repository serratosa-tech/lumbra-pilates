import { act } from '@testing-library/react'
import { StrictMode } from 'react'
import { hydrateRoot, type Root } from 'react-dom/client'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AppRoutes } from './App.tsx'
import { homeMarkup, PRERENDERED_PATH } from './prerender.tsx'

let root: Root | null = null
let container: HTMLElement | null = null

afterEach(() => {
  act(() => root?.unmount())
  container?.remove()
  root = container = null
  vi.useRealTimers()
  vi.restoreAllMocks()
})

/** Pone el HTML del build en la página y lo hidrata como main.tsx (con MemoryRouter en vez de BrowserRouter). */
async function hydrate(markup: string) {
  container = document.createElement('div')
  container.innerHTML = markup
  document.body.append(container)
  const recoverable = vi.fn()
  const consoleError = vi.spyOn(console, 'error')
  const h1 = container.querySelector('#hero-titulo')
  await act(async () => {
    root = hydrateRoot(
      container!,
      <StrictMode>
        <MemoryRouter initialEntries={[PRERENDERED_PATH]}>
          <AppRoutes />
        </MemoryRouter>
      </StrictMode>,
      { onRecoverableError: recoverable },
    )
  })
  return { recoverable, consoleError, h1 }
}

describe('portada prerenderizada', () => {
  it('trae el héroe y los esqueletos, pero no el shell estático (va fuera de #root)', () => {
    const page = document.createElement('div')
    page.innerHTML = homeMarkup()
    expect(page.querySelector('h1#hero-titulo')).toHaveTextContent('Muévete despacio. Hazte fuerte.')
    expect(page).toHaveTextContent('Cargando la próxima clase…')
    expect(page).toHaveTextContent('Cargando el horario…')
    expect(page.querySelector('aside[aria-label="Aviso de demostración"]')).toBeNull()
    expect(page.querySelector('a[href="#contenido"]')).toBeNull()
  })

  it('React la hidrata sin discrepancias y conserva los nodos (el h1 no se vuelve a pintar)', async () => {
    const { recoverable, consoleError, h1 } = await hydrate(homeMarkup())
    expect(recoverable).not.toHaveBeenCalled()
    expect(consoleError).not.toHaveBeenCalled()
    expect(h1).not.toBeNull()
    expect(container!.querySelector('#hero-titulo')).toBe(h1)
  })

  it('una visita en otro año hidrata con el año del build y luego muestra el actual', async () => {
    const markup = homeMarkup()
    const page = document.createElement('div')
    page.innerHTML = markup
    expect(page.querySelector('footer')).toHaveTextContent(`© ${__BUILD_YEAR__} Lumbra Pilates`)
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(`${__BUILD_YEAR__ + 1}-01-01T10:00:00Z`))
    const { recoverable, consoleError } = await hydrate(markup)
    expect(recoverable).not.toHaveBeenCalled()
    expect(consoleError).not.toHaveBeenCalled()
    expect(container!.querySelector('footer')).toHaveTextContent(`© ${__BUILD_YEAR__ + 1} Lumbra Pilates`)
  })
})
