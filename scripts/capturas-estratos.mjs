// Bloque 11: capturas de la pantalla de Estratos en 2D (Edge headless por CDP, sin dependencias).
// uso: node scripts/capturas-estratos.mjs http://localhost:5173 <carpeta> [ancho alto]
// Estado: 3 estratos abiertos con granos (el 1 al tope), Cristales para abrir el 4; captura, abre el 4 (roca que se rompe),
// cambia la paleta y captura de nuevo. Imprime si hay scroll de página y los errores de la consola.
import { spawn } from 'node:child_process'
import { writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'

const [url, out, W = '1366', H = '768'] = process.argv.slice(2)
mkdirSync(out, { recursive: true })
rmSync(resolve(out, 'perfil'), { recursive: true, force: true }) // partida limpia: sin el cartel de "mientras no estabas"
const edge = spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', [
  '--headless=new', '--remote-debugging-port=9336', `--user-data-dir=${resolve(out, 'perfil')}`, `--window-size=${W},${H}`, '--use-angle=d3d11', 'about:blank',
])
const espera = (ms) => new Promise((r) => setTimeout(r, ms))
let pag
for (let i = 0; i < 100 && !pag; i++) { await espera(300); try { pag = await (await fetch('http://127.0.0.1:9336/json/new?about:blank', { method: 'PUT' })).json() } catch {} }
const ws = new WebSocket(pag.webSocketDebuggerUrl)
await new Promise((r) => (ws.onopen = r))
let id = 0
const pend = new Map(), errores = []
ws.onmessage = (m) => {
  const d = JSON.parse(m.data)
  if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id) }
  if (d.method === 'Runtime.exceptionThrown') errores.push(d.params.exceptionDetails.exception?.description ?? d.params.exceptionDetails.text)
  if (d.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(d.params.type)) errores.push(d.params.args.map((a) => a.value ?? a.description).join(' '))
}
const cdp = (method, params = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })) })
const ev = async (expr) => {
  const r = (await cdp('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })).result
  if (r?.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text)
  return r?.result?.value
}
const foto = async (n) => writeFileSync(`${out}/${n}.png`, Buffer.from((await cdp('Page.captureScreenshot', { format: 'png' })).result.data, 'base64'))
const scroll = () => ev(`JSON.stringify({ alto: document.documentElement.scrollHeight - innerHeight, ancho: document.documentElement.scrollWidth - innerWidth })`)

await cdp('Runtime.enable'); await cdp('Page.enable')
await cdp('Emulation.setDeviceMetricsOverride', { width: +W, height: +H, deviceScaleFactor: +W < 768 ? 3 : 1, mobile: +W < 768 })
await cdp('Page.navigate', { url })
await espera(3000)
await ev(`document.querySelector('.titulo button')?.click()`)
await espera(1200)
const modulo = (m) => `import(performance.getEntriesByType('resource').map((r) => r.name).find((n) => n.includes('/src/ui/${m}')) ?? '/src/ui/${m}')`
await ev(`${modulo('juego.svelte.ts')}.then(({ juego: j }) => {
  window.__j = j
  const s = j.s, D = s.cristales.constructor
  j.vistos = { ...j.vistos, cristales: true }
  j.s = { ...s, infinitos: 3, granos: 600000, caudal: 12, cristales: new D('2e7'), cristalesTotales: new D('3e7'),
    red: { ...s.red, estratos: 3 }, estratos: { abiertos: 3, s: [11.5, 9.4, 4.2, 0, 0, 0, 0, 0], perm: [6, 3, 1, 0, 0, 0, 0, 0], pres: [4, 2, 0, 0, 0, 0, 0, 0] } }
  j.capa = 'cristalizacion'; j.pantalla = 'estratos'
})`)
await espera(4000)
console.log(`${W}x${H} scroll`, await scroll())
await foto(`estratos-${W}`)
await ev(`[...document.querySelectorAll('.estratos .paso')].at(-1).click(); [...document.querySelectorAll('.estratos .paso')].at(-1).click(); [...document.querySelectorAll('.estratos .paso')].at(-1).click()`)
await espera(600)
await foto(`estratos-${W}-cerrado`)
await ev(`document.querySelector('.estratos .abrir')?.click()`)
await espera(350)
await foto(`estratos-${W}-rompe`)
await espera(2500)
await ev(`${modulo('ajustes.svelte.ts')}.then(({ ajustes }) => { ajustes.paleta = 'glaciar' }); window.__j.logros = [...new Set([...(window.__j.logros ?? []), ...Object.keys(window.__j.logros ?? {})])]`).catch(() => {})
await espera(1500)
await foto(`estratos-${W}-abierto`)
// La ficha tiene tamaño fijo: se mide en los 8 estratos y en 6 "Infinitos" seguidos (Caudal, niveles y granos que cambian).
const altos = new Set()
const alto = () => ev(`Math.round(document.querySelector('.estratos .ficha').getBoundingClientRect().height)`)
for (let k = 0; k < 8; k++) { altos.add(await alto()); await ev(`[...document.querySelectorAll('.estratos .paso')].at(-1).click()`); await espera(80) }
for (let k = 0; k < 8; k++) { await ev(`document.querySelector('.estratos .paso').click()`); await espera(30) }
for (let i = 0; i < 6; i++) {
  await ev(`(() => { const j = window.__j, s = j.s; j.s = { ...s, infinitos: s.infinitos + 1, caudal: [1, 40, 3, 1e6, 12, 1e30][${i}], granos: ${i} * 1e5,
    estratos: { ...s.estratos, s: s.estratos.s.map((v, k) => v + ${i} * (k + 1) * 3), perm: s.estratos.perm.map((v) => v + ${i} * 7) } } })()`)
  await espera(60); altos.add(await alto())
}
console.log('alto de la ficha (px)', [...altos])
console.log('errores', JSON.stringify(errores))
await cdp('Browser.close')
edge.kill()
process.exit(0)
