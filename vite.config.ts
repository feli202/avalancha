import { defineConfig } from 'vitest/config'
import { svelte } from '@sveltejs/vite-plugin-svelte'
// @ts-expect-error: JS de Node sin tipos (el proyecto no instala @types/node)
import { clips } from './scripts/clips.mjs'

// Cada build lleva su número y deja version.json al lado: el juego publicado lo pide sin caché y se recarga si hay otro
// (GitHub Pages deja el index.html viejo en la caché; ver src/version.svelte.ts).
// Fecha y commit (se lee en Ajustes → Créditos); la hora distingue dos builds del mismo commit.
// @ts-expect-error: módulo de Node sin tipos
import { execSync } from 'node:child_process'
const commit = (() => { try { return String(execSync('git rev-parse --short HEAD')).trim() } catch { return 'local' } })()
import pkg from './package.json' with { type: 'json' }
const VERSION = `${pkg.version} · ${new Date().toISOString().slice(0, 16).replace('T', ' ')} · ${commit}`

export default defineConfig({
  define: { __VERSION__: JSON.stringify(VERSION) },
  // Rutas relativas: el zip anda en cualquier subcarpeta o iframe (galaxy.click, itch.io).
  base: './',
  // clips: el modo grabación del panel de debug convierte los clips a MP4 (solo en desarrollo).
  plugins: [svelte(), clips(), { name: 'version', apply: 'build', generateBundle() { this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ v: VERSION }) }) } }],
  // host: el servidor escucha en la red local, para probar desde el celular (npm run dev muestra la dirección).
  server: { host: true },
  preview: { host: true },
  test: { include: ['tests/**/*.test.ts'] },
})
