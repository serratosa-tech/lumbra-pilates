import { useEffect, type RefObject } from 'react'

/**
 * Marca un contenedor deslizable en horizontal con `data-fade-start` / `data-fade-end`
 * cuando hay más contenido hacia ese lado; la clase `.scroll-fade` pinta el degradado.
 */
export function useScrollFade(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => {
      const hidden = el.scrollWidth - el.clientWidth
      el.toggleAttribute('data-fade-start', el.scrollLeft > 1)
      el.toggleAttribute('data-fade-end', el.scrollLeft < hidden - 1)
    }
    update()
    el.addEventListener('scroll', update, { passive: true })
    // También cambia al girar el móvil o con el texto del navegador más grande.
    const observer = new ResizeObserver(update)
    observer.observe(el)
    for (const child of el.children) observer.observe(child)
    return () => {
      el.removeEventListener('scroll', update)
      observer.disconnect()
    }
  }, [ref])
}
