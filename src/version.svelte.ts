// Aviso de versión nueva. Causa del celular con la versión vieja: no hay service worker; GitHub Pages sirve el index.html
// con `Cache-Control: max-age=600` (navegador y CDN) y los .js/.css llevan hash, así que un index.html viejo sigue pidiendo
// los archivos viejos. Antes se recargaba solo con location.reload(), que en el celular puede volver a usar el index.html
// guardado (y después no reintentaba). Ahora version.json (un número por build, vite.config.ts) se pide sin caché al abrir,
// al volver a la pestaña y cada 10 minutos; si cambió, un aviso ofrece "Actualizar", que guarda y abre la página con
// ?v=<versión>: una dirección nueva que ni el navegador ni el CDN tienen guardada.
import { guardarYa } from './ui/juego.svelte'

declare const __VERSION__: string
export const VERSION = __VERSION__
export const version = $state({ nueva: '' })

const CADA_MS = 10 * 60 * 1000

async function revisar() {
  try {
    const r = await fetch(`./version.json?t=${Date.now()}`, { cache: 'no-store' })
    if (!r.ok) return // itch.io o un zip sin version.json: nada que hacer
    const { v } = await r.json()
    if (typeof v === 'string' && v && v !== VERSION) version.nueva = v
  } catch {} // sin conexión: se sigue con lo que hay
}

export function vigilarVersion() {
  revisar()
  document.addEventListener('visibilitychange', () => !document.hidden && revisar())
  setInterval(revisar, CADA_MS)
}

/** Guarda, saca cualquier service worker que haya quedado de otra versión (el juego no usa ninguno) y recarga sin caché. */
export async function actualizar() {
  guardarYa()
  try {
    const regs = (await navigator.serviceWorker?.getRegistrations()) ?? []
    await Promise.all(regs.map((r) => r.unregister()))
  } catch {}
  location.replace(`${location.pathname}?v=${encodeURIComponent(version.nueva)}${location.hash}`)
}
