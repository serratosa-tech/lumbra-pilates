/** Oculto (sr-only) hasta que recibe el foco con el teclado; entonces aparece arriba a la izquierda. */
export function SkipLink() {
  return (
    <a
      href="#contenido"
      className="fixed top-2 left-2 z-50 inline-flex max-w-[calc(100%-1rem)] focus:min-h-11 items-center rounded-full bg-tinta px-5 py-2 text-sm font-semibold text-crema shadow-lg not-focus:sr-only focus-visible:outline-terracota-300"
    >
      Saltar al contenido
    </a>
  )
}
