import { describe, expect, it } from 'vitest'
import headersText from '../../public/_headers?raw'
import redirectsText from '../../public/_redirects?raw'
import { cspConnectSources, headerValue, parseCsp, parseHeaders } from '../lib/siteFiles.ts'

const rules = parseHeaders(headersText)
const csp = parseCsp(headerValue(rules, '/*', 'Content-Security-Policy') ?? '')

describe('Cloudflare Pages', () => {
  it('las rutas de la app sin archivo propio devuelven app.html («/» es index.html, prerenderizado)', () => {
    const lines = redirectsText.split(/\r?\n/).filter((l) => l.trim() && !l.startsWith('#'))
    expect(lines).toEqual(['/* /app 200'])
  })

  it('la CSP solo permite la propia web y un proyecto de Supabase por https', () => {
    expect(csp.get('default-src')).toEqual(["'self'"])
    for (const directive of ['script-src', 'style-src', 'img-src', 'font-src']) {
      expect(csp.get(directive)).toEqual(["'self'"])
    }
    expect(csp.get('object-src')).toEqual(["'none'"])
    expect(csp.get('base-uri')).toEqual(["'self'"])
    expect(csp.get('form-action')).toEqual(["'self'"])
    expect(csp.get('frame-ancestors')).toEqual(["'none'"])
    expect(csp.has('upgrade-insecure-requests')).toBe(true)

    const [self, supabase, ...rest] = cspConnectSources(headersText)
    expect(self).toBe("'self'")
    expect(supabase).toMatch(/^https:\/\/[a-z0-9]+\.supabase\.co$/)
    expect(rest).toEqual([])
  })

  it('nada en línea ni eval en la CSP', () => {
    const all = [...csp.values()].flat()
    expect(all.some((s) => /unsafe-|^\*$|^data:$|^https:$/.test(s))).toBe(false)
  })

  it('cabeceras de seguridad en todas las rutas', () => {
    expect(headerValue(rules, '/*', 'X-Content-Type-Options')).toBe('nosniff')
    expect(headerValue(rules, '/*', 'Referrer-Policy')).toBe('strict-origin-when-cross-origin')
    expect(headerValue(rules, '/*', 'Permissions-Policy')).toMatch(/camera=\(\).*microphone=\(\).*geolocation=\(\)/)
    expect(headerValue(rules, '/*', 'Strict-Transport-Security')).toMatch(/^max-age=31536000; includeSubDomains$/)
    expect(headerValue(rules, '/*', 'Cross-Origin-Opener-Policy')).toBe('same-origin')
  })

  it('caché larga solo para los archivos con hash', () => {
    expect(headerValue(rules, '/assets/*', 'Cache-Control')).toBe('public, max-age=31536000, immutable')
    for (const [path, list] of rules) {
      if (path !== '/assets/*') expect(list.some((h) => /^cache-control:/i.test(h))).toBe(false)
    }
  })

  it('respeta los límites de Cloudflare (100 reglas, 2000 caracteres por línea)', () => {
    expect(rules.size).toBeLessThanOrEqual(100)
    for (const line of headersText.split(/\r?\n/)) expect(line.length).toBeLessThanOrEqual(2000)
  })
})
