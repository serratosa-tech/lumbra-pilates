import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// Los componentes usan la demo en memoria en lugar de Supabase: los tests no salen a la red.
vi.mock('../data/appDataSource.ts', async () => {
  const { testDataSource } = await import('./dataSource.ts')
  return { createAppDataSource: () => testDataSource }
})

// Sin `globals` de Vitest, Testing Library no desmonta solo entre tests.
afterEach(cleanup)

// jsdom no implementa <dialog>: sustituto mínimo de showModal/close.
HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
  this.setAttribute('open', '')
}
HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
  this.removeAttribute('open')
}

// Tampoco ResizeObserver, matchMedia, scrollIntoView ni scrollTo en elementos: sustitutos que no hacen nada.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
}
window.matchMedia ??= (query: string) =>
  ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent: () => false,
  }) as MediaQueryList
Element.prototype.scrollIntoView ??= function () {}
Element.prototype.scrollTo ??= function () {}
