import '@testing-library/jest-dom/vitest'

// jsdom no implementa <dialog>: sustituto mínimo de showModal/close.
HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
  this.setAttribute('open', '')
}
HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
  this.removeAttribute('open')
}
