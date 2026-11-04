/// <reference types="vitest/config" />
import { readFileSync } from 'node:fs'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import { cspConnectSources } from './src/lib/siteFiles.ts'

const PORT = 5176

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

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  return {
    plugins: [
      react(),
      tailwindcss(),
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
