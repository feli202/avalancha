import { defineConfig } from 'vitest/config'
import { svelte } from '@sveltejs/vite-plugin-svelte'

export default defineConfig({
  // Rutas relativas: el zip anda en cualquier subcarpeta o iframe (galaxy.click, itch.io).
  base: './',
  plugins: [svelte()],
  // host: el servidor escucha en la red local, para probar desde el celular (npm run dev muestra la dirección).
  server: { host: true },
  preview: { host: true },
  test: { include: ['tests/**/*.test.ts'] },
})
