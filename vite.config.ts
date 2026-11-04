/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

const PORT = 5176

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
export default defineConfig({
  plugins: [react(), tailwindcss(), preloadFont(/jost-latin-wght-normal-[\w-]+\.woff2$/)],
  server: { port: PORT, strictPort: true },
  preview: { port: PORT, strictPort: true },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
})
