// El index.html publicado puede quedar viejo en la caché del navegador (GitHub Pages lo deja guardar). Los .js y .css
// llevan hash, así que alcanza con saber si hay un build más nuevo: version.json se pide sin caché al abrir y al volver
// a la pestaña, y si no coincide se recarga (la partida se guarda en el pagehide, juego.svelte.ts).
declare const __VERSION__: string

async function revisar() {
  try {
    const r = await fetch(`./version.json?t=${Date.now()}`, { cache: 'no-store' })
    if (!r.ok) return // itch.io o un zip viejo sin version.json: nada que hacer
    const { v } = await r.json()
    // Una sola recarga por versión: si el servidor todavía da el index viejo, no queda en un bucle.
    if (v === __VERSION__ || sessionStorage.getItem('recargado') === v) return
    sessionStorage.setItem('recargado', v)
    location.reload()
  } catch {} // sin conexión: se sigue con lo que hay
}

export function vigilarVersion() {
  revisar()
  document.addEventListener('visibilitychange', () => !document.hidden && revisar())
}
