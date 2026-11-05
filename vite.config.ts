/// <reference types="vitest/config" />
import { readFileSync } from 'node:fs'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { createServer, defineConfig, loadEnv, type Plugin } from 'vite'
import { SITE_URL } from './src/lib/site.ts'
import { cspConnectSources, injectStaticShell, robotsTxt, sitemapXml } from './src/lib/siteFiles.ts'

const PORT = 5176

/**
 * La URL del sitio sale solo de SITE_URL: rellena %SITE_URL% en index.html (canonical, og:url,
 * og:image) y genera robots.txt y sitemap.xml, en el build y en el servidor de desarrollo.
 */
function siteFiles(): Plugin {
  const files = new Map([
    ['robots.txt', { type: 'text/plain; charset=utf-8', source: robotsTxt(SITE_URL) }],
    ['sitemap.xml', { type: 'application/xml; charset=utf-8', source: sitemapXml(SITE_URL) }],
  ])
  return {
    name: 'lumbra:site-files',
    transformIndexHtml: { order: 'pre', handler: (html) => html.replaceAll('%SITE_URL%', SITE_URL) },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const file = files.get((req.url ?? '').split('?')[0].replace(/^\//, ''))
        if (!file) return next()
        res.setHeader('Content-Type', file.type)
        res.end(file.source)
      })
    },
    generateBundle() {
      for (const [fileName, { source }] of files) this.emitFile({ type: 'asset', fileName, source })
    },
  }
}

/**
 * Para el build si falta la URL de Supabase o si la CSP de public/_headers no la permite en
 * connect-src: la web publicada se quedaría sin datos.
 */
function checkCsp(supabaseUrl: string | undefined): Plugin {
  return {
    name: 'lumbra:check-csp',
    apply: 'build',
    buildStart() {
      if (!supabaseUrl?.trim()) {
        throw new Error('Falta VITE_SUPABASE_URL (en .env.local o en las variables de Cloudflare Pages).')
      }
      const origin = new URL(supabaseUrl.trim()).origin
      const headers = readFileSync(new URL('./public/_headers', import.meta.url), 'utf8')
      if (!cspConnectSources(headers).includes(origin)) {
        throw new Error(`La CSP de public/_headers no permite ${origin} en connect-src. Añádelo para que la app pueda hablar con Supabase.`)
      }
    },
  }
}

/** Precarga en index.html el archivo de fuente del primer pantallazo (su nombre lleva hash en el build). */
function preloadFont(pattern: RegExp): Plugin {
  return {
    name: 'lumbra:preload-font',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(_html, ctx) {
        const file = Object.keys(ctx.bundle ?? {}).find((name) => pattern.test(name))
        if (!file) throw new Error(`No se encuentra la fuente que hay que precargar (${pattern})`)
        return [
          {
            tag: 'link',
            attrs: { rel: 'preload', href: `/${file}`, as: 'font', type: 'font/woff2', crossorigin: true },
            injectTo: 'head',
          },
        ]
      },
    },
  }
}

/**
 * Escribe delante de #root el HTML del shell común (enlace de salto y banda de demo), renderizado con
 * react-dom/server desde sus componentes (src/app/StaticShell.tsx). La banda, que es el LCP, se pinta
 * con el HTML y el CSS, sin esperar al JavaScript, y React no la toca. En desarrollo usa el propio
 * servidor; en el build, uno efímero de Vite solo para SSR (sin puerto).
 */
function staticShell(): Plugin {
  const MODULE = '/src/app/staticShellMarkup.tsx'
  return {
    name: 'lumbra:static-shell',
    transformIndexHtml: {
      order: 'pre',
      async handler(html, ctx) {
        if (ctx.server) {
          const { staticShellMarkup } = await ctx.server.ssrLoadModule(MODULE)
          return injectStaticShell(html, staticShellMarkup())
        }
        const server = await createServer({
          configFile: false,
          root: process.cwd(),
          logLevel: 'error',
          appType: 'custom',
          plugins: [react()],
          server: { middlewareMode: true, hmr: false, ws: false },
        })
        try {
          const { staticShellMarkup } = await server.ssrLoadModule(MODULE)
          return injectStaticShell(html, staticShellMarkup())
        } finally {
          await server.close()
        }
      },
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  return {
    plugins: [
      react(),
      tailwindcss(),
      siteFiles(),
      staticShell(),
      preloadFont(/jost-latin-wght-normal-[\w-]+\.woff2$/),
      checkCsp(env.VITE_SUPABASE_URL),
    ],
    server: { port: PORT, strictPort: true },
    preview: { port: PORT, strictPort: true },
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
    },
  }
})
