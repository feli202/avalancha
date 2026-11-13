import { defineConfig } from 'vitest/config'
import { svelte } from '@sveltejs/vite-plugin-svelte'

export default defineConfig({
  plugins: [svelte()],
  // host: el servidor escucha en la red local, para probar desde el celular (npm run dev muestra la dirección).
  server: { host: true },
  preview: { host: true },
  test: { include: ['tests/**/*.test.ts'] },
})
