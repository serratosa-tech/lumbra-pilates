/** Estilo común de los controles de formulario (Input, Textarea, Select). */
export const CONTROL_CLASSES = [
  'block w-full min-h-11 rounded-md border border-piedra bg-white px-3.5 py-2 text-base text-tinta',
  'placeholder:text-piedra',
  'transition-[border-color,box-shadow] duration-(--duration-fast) ease-(--ease-out-soft)',
  'hover:border-tinta-700',
  'focus-visible:border-terracota-700 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-terracota-700/35',
  'aria-invalid:border-error aria-invalid:focus-visible:ring-error/30',
  'disabled:cursor-not-allowed disabled:border-arena-400 disabled:bg-arena-100 disabled:text-piedra',
].join(' ')
