// Capturas de la Capa 1 para comparar antes/después (correcciones, bloque 13 y cierre). Edge headless por CDP, sin dependencias.
// uso: node scripts/capturas-capa1.mjs http://localhost:5173 <carpeta-salida>
// Saca la Arena con la barra de capas, Red, Estratos, Relicario (con oferta) y Defectos, en 1366×800 y en 390×844.
import { spawn } from 'node:child_process'
import { writeFileSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { tmpdir } from 'node:os'

const [url, out] = process.argv.slice(2)
mkdirSync(out, { recursive: true })
const edge = spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', [
  '--headless=new', '--remote-debugging-port=9335', `--user-data-dir=${resolve(tmpdir(), 'avalancha-capturas')}`, '--window-size=1366,800',
  '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--use-angle=d3d11', 'about:blank',
])
const espera = (ms) => new Promise((r) => setTimeout(r, ms))
let pag
for (let i = 0; i < 100 && !pag; i++) {
  await espera(300)
  try { pag = await (await fetch('http://127.0.0.1:9335/json/new?about:blank', { method: 'PUT' })).json() } catch {}
}
const ws = new WebSocket(pag.webSocketDebuggerUrl)
await new Promise((r) => (ws.onopen = r))
let id = 0
const pend = new Map(), errores = []
ws.onmessage = (m) => {
  const d = JSON.parse(m.data)
  if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id) }
  if (d.method === 'Runtime.exceptionThrown') errores.push(d.params.exceptionDetails.exception?.description ?? d.params.exceptionDetails.text)
  if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') errores.push(d.params.args.map((a) => a.value ?? a.description).join(' '))
}
const cdp = (method, params = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })) })
const ev = async (expr) => {
  const r = (await cdp('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })).result
  if (r?.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text)
  return r?.result?.value
}
const foto = async (nombre) => writeFileSync(`${out}/${nombre}.png`, Buffer.from((await cdp('Page.captureScreenshot', { format: 'png' })).result.data, 'base64'))

await cdp('Runtime.enable'); await cdp('Page.enable')
for (const [W, H] of [[1366, 800], [390, 844]]) {
  await cdp('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: W < 768 ? 2 : 1, mobile: W < 768 })
  await cdp('Page.navigate', { url })
  await espera(3000)
  await ev(`document.querySelector('.titulo button')?.click()`)
  await espera(1500)
  // Estado de prueba: Cristales, tres estratos abiertos, unos nodos de la Red, reliquias y una oferta pendiente.
  // El mismo módulo que cargó el juego (después de un cambio en caliente Vite lo sirve con `?t=`; otra URL sería otra instancia).
  await ev(`import(performance.getEntriesByType('resource').map((r) => r.name).find((n) => n.includes('/src/ui/juego.svelte.ts')) ?? '/src/ui/juego.svelte.ts').then(({ juego: j }) => {
    window.__j = j
    const s = j.s, ocho = (f) => Array.from({ length: 8 }, (_, k) => f(k))
    j.vistos = { ...j.vistos, cristales: true }
    j.s = { ...s, infinitos: 4, granos: 300000, caudal: 12, cristales: s.cristales.mul(0).add(5571), cristalesTotales: s.cristalesTotales.mul(0).add(2.75e6),
      red: { ...s.red, estratos: 4, presion: 2 }, estratos: { abiertos: 3, s: ocho((k) => (k < 3 ? 25 - k * 2 : 0)), perm: ocho((k) => (k < 3 ? 6 : 0)), pres: ocho((k) => (k < 3 ? 4 : 0)) },
      relicario: { ...s.relicario, reliquias: { cauce: 4, cascada: 1, mutaciones: 0 }, equipadas: ['cauce'], pendiente: 1 } }
    j.capa = 'arena'
    j.ausencia = null
  })`)
  await espera(4000)
  await foto(`${W}-arena`)
  for (const p of ['red', 'estratos', 'relicario', 'defectos']) {
    await ev(`(window.__j.capa = 'cristalizacion', window.__j.pantalla = '${p}')`)
    await espera(p === 'estratos' ? 3500 : 1200)
    await foto(`${W}-${p}`)
  }
}
console.log('errores', JSON.stringify(errores, null, 1))
await cdp('Browser.close')
edge.kill()
