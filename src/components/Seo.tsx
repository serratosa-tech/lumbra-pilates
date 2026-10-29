import { useEffect } from 'react'
import { useLocation } from 'react-router'
import { SITE_NAME, SITE_URL } from '../lib/site.ts'

interface SeoProps {
  /** Título de la página; si no lo lleva, se completa con el nombre del estudio. */
  title: string
  description: string
  /** Para páginas que no deben aparecer en buscadores (404, utilidades). */
  noindex?: boolean
}

function upsert(selector: string, create: () => HTMLElement, attr: string, value: string) {
  let el = document.head.querySelector<HTMLElement>(selector)
  if (!el) {
    el = create()
    document.head.append(el)
  }
  el.setAttribute(attr, value)
}

function meta(key: 'name' | 'property', name: string, content: string) {
  upsert(
    `meta[${key}="${name}"]`,
    () => {
      const el = document.createElement('meta')
      el.setAttribute(key, name)
      return el
    },
    'content',
    content,
  )
}

/**
 * Actualiza las etiquetas de <head> ya presentes en index.html
 * (así no se duplican y los rastreadores sin JS ven las de la portada).
 */
export function Seo({ title, description, noindex = false }: SeoProps) {
  const { pathname } = useLocation()

  useEffect(() => {
    const fullTitle = title.includes(SITE_NAME) ? title : `${title} · ${SITE_NAME}`
    const url = `${SITE_URL}${pathname}`
    document.title = fullTitle
    meta('name', 'description', description)
    meta('property', 'og:title', fullTitle)
    meta('property', 'og:description', description)
    meta('property', 'og:url', url)
    meta('name', 'robots', noindex ? 'noindex, follow' : 'index, follow')
    upsert(
      'link[rel="canonical"]',
      () => {
        const el = document.createElement('link')
        el.setAttribute('rel', 'canonical')
        return el
      },
      'href',
      url,
    )
  }, [title, description, noindex, pathname])

  return null
}
