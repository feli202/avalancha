import { defineConfig } from 'vitest/config'
import { svelte } from '@sveltejs/vite-plugin-svelte'
// @ts-expect-error: JS de Node sin tipos (el proyecto no instala @types/node)
import { clips } from './scripts/clips.mjs'

export default defineConfig({
  // Rutas relativas: el zip anda en cualquier subcarpeta o iframe (galaxy.click, itch.io).
  base: './',
  // clips: el modo grabación del panel de debug convierte los clips a MP4 (solo en desarrollo).
  plugins: [svelte(), clips()],
  // host: el servidor escucha en la red local, para probar desde el celular (npm run dev muestra la dirección).
  server: { host: true },
  preview: { host: true },
  test: { include: ['tests/**/*.test.ts'] },
})
