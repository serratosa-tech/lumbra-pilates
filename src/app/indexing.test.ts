import { describe, expect, it } from 'vitest'
import headers from '../../public/_headers?raw'
import robots from '../../public/robots.txt?raw'
import sitemap from '../../public/sitemap.xml?raw'
import { SITE_URL } from '../lib/site.ts'

const PRIVATE_PATHS = ['/sistema', '/mis-reservas', '/estudio']
const sitemapPaths = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(([, loc]) => loc.replace(SITE_URL, '') || '/')

/** Rutas con la cabecera X-Robots-Tag: noindex en public/_headers. */
function noindexPaths(): string[] {
  const paths: string[] = []
  let current: string | null = null
  for (const line of headers.split(/\r?\n/)) {
    if (!line.trim() || line.trimStart().startsWith('#')) continue
    if (!/^\s/.test(line)) current = line.trim()
    else if (current && /^X-Robots-Tag:\s*noindex$/i.test(line.trim())) paths.push(current)
  }
  return paths
}

describe('indexación', () => {
  it('el sitemap solo tiene las páginas públicas, con la URL del sitio', () => {
    expect(sitemapPaths).toEqual(['/', '/clases', '/privacidad', '/aviso-legal'])
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
})
