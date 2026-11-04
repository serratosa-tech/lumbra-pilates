import { describe, expect, it } from 'vitest'
import indexHtml from '../../index.html?raw'
import headers from '../../public/_headers?raw'
import { SITE_URL } from '../lib/site.ts'
import { headerValue, parseHeaders, robotsTxt, sitemapXml } from '../lib/siteFiles.ts'

const PRIVATE_PATHS = ['/sistema', '/mis-reservas', '/estudio']
const sitemap = sitemapXml(SITE_URL)
const robots = robotsTxt(SITE_URL)
const sitemapPaths = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(([, loc]) => loc.replace(SITE_URL, '') || '/')

/** Rutas con la cabecera X-Robots-Tag: noindex en public/_headers. */
function noindexPaths(): string[] {
  const rules = parseHeaders(headers)
  return [...rules.keys()].filter((path) => headerValue(rules, path, 'X-Robots-Tag') === 'noindex')
}

describe('indexación', () => {
  it('el sitemap solo tiene las páginas públicas, con la URL del sitio', () => {
    expect(sitemapPaths).toEqual(['/', '/clases', '/privacidad', '/aviso-legal'])
    expect(sitemap.match(/<loc>/g)).toHaveLength(4)
    for (const path of PRIVATE_PATHS) expect(sitemapPaths.some((p) => p.startsWith(path))).toBe(false)
  })

  it('/sistema, Mis reservas y el panel llevan noindex ya en la respuesta', () => {
    expect(noindexPaths()).toEqual(['/sistema', '/mis-reservas', '/estudio', '/estudio/*'])
    for (const path of sitemapPaths) expect(noindexPaths()).not.toContain(path)
  })

  it('robots.txt deja entrar (para que se vea el noindex) y apunta al sitemap', () => {
    expect(robots).toMatch(/^Allow: \/$/m)
    expect(robots).not.toMatch(/^Disallow:/m)
    expect(robots).toContain(`Sitemap: ${SITE_URL}/sitemap.xml`)
  })

  it('la URL del sitio solo se escribe en SITE_URL', () => {
    expect(SITE_URL).toMatch(/^https:\/\/[^/]+[^/]$/)
    expect(indexHtml.match(/%SITE_URL%/g)).toHaveLength(3)
    expect(indexHtml).not.toContain(new URL(SITE_URL).host)
    const sources = import.meta.glob(['/src/**/*.{ts,tsx}', '/public/_*'], { query: '?raw', import: 'default', eager: true })
    const withHost = Object.entries(sources)
      .filter(([, text]) => String(text).includes(new URL(SITE_URL).host))
      .map(([path]) => path)
    expect(withHost).toEqual(['/src/lib/site.ts'])
  })
})
