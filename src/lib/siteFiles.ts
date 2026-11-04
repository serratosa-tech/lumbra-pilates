/**
 * Archivos de publicación (Cloudflare Pages). Funciones puras que usan vite.config.ts (en el build)
 * y los tests.
 */

/** Reglas de public/_headers: ruta → cabeceras («Nombre: valor»), en el orden del archivo. */
export function parseHeaders(text: string): Map<string, string[]> {
  const rules = new Map<string, string[]>()
  let current: string[] | null = null
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim() || line.trimStart().startsWith('#')) continue
    if (!/^\s/.test(line)) {
      current = []
      rules.set(line.trim(), current)
    } else current?.push(line.trim())
  }
  return rules
}

/** Valor de una cabecera en la regla de una ruta, o null si no la lleva. */
export function headerValue(rules: Map<string, string[]>, path: string, name: string): string | null {
  const prefix = `${name.toLowerCase()}:`
  const line = rules.get(path)?.find((h) => h.toLowerCase().startsWith(prefix))
  return line ? line.slice(prefix.length).trim() : null
}

/** Directivas de una CSP: nombre → fuentes. */
export function parseCsp(csp: string): Map<string, string[]> {
  const directives = new Map<string, string[]>()
  for (const part of csp.split(';')) {
    const [name, ...sources] = part.trim().split(/\s+/)
    if (name) directives.set(name, sources)
  }
  return directives
}

/** Orígenes que la CSP de todas las rutas (/*) permite en connect-src. */
export function cspConnectSources(headersText: string): string[] {
  const csp = headerValue(parseHeaders(headersText), '/*', 'Content-Security-Policy')
  return csp ? (parseCsp(csp).get('connect-src') ?? []) : []
}
