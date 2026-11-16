// Bloque 9 de CORRECCIONES_CAPA1: mide la Red 3D en Edge headless por CDP (sin dependencias). Copia de medir-estratos.mjs.
// uso: node scripts/medir-red.mjs http://localhost:5173 <carpeta-salida> [ancho alto] [freno de CPU]
// Imprime: fps en la Arena, fps y dibujos/s en la Red (quieta, girando y con derrumbes), fps en la Arena después de
// entrar y salir 10 veces, y memoria (heap de JS después de recolectar, nodos del DOM) antes y después.
import { spawn } from 'node:child_process'
import { writeFileSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

const [url, out, W = '1280', H = '720', FRENO = '1'] = process.argv.slice(2)
mkdirSync(out, { recursive: true })
const edge = spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', [
  '--headless=new', '--remote-debugging-port=9335', `--user-data-dir=${resolve(out, 'perfil')}`, `--window-size=${W},${H}`,
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
  if (d.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(d.params.type))
    errores.push(d.params.type + ': ' + d.params.args.map((a) => a.value ?? a.description).join(' '))
}
const cdp = (method, params = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })) })
const ev = async (expr) => {
  const r = (await cdp('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })).result
  if (r?.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text)
  return r?.result?.value
}
const foto = async (nombre) => writeFileSync(`${out}/${nombre}.png`, Buffer.from((await cdp('Page.captureScreenshot', { format: 'png' })).result.data, 'base64'))
// fps de la página (requestAnimationFrame), peor cuadro y dibujos por segundo de la escena three.js, durante 5 s.
const fps = (nombre) => ev(`new Promise(r => {
  let n = 0, peor = 0, antes = performance.now(); const t0 = antes, d0 = window.redVisual?.gl.info.render.frame;
  (function f(t) {
    n++; peor = Math.max(peor, t - antes); antes = t;
    t - t0 < 5000 ? requestAnimationFrame(f) : r({ fps: +(n / 5).toFixed(1), peorMs: +peor.toFixed(1), dibujosSeg: d0 === undefined ? undefined : (window.redVisual.gl.info.render.frame - d0) / 5 })
  })(antes)
})`).then((m) => (console.log(nombre.padEnd(46), JSON.stringify(m)), m))
const memoria = async (nombre) => {
  for (let i = 0; i < 3; i++) { await cdp('HeapProfiler.collectGarbage'); await espera(300) }
  const m = Object.fromEntries((await cdp('Performance.getMetrics')).result.metrics.map((x) => [x.name, x.value]))
  const r = { heapMB: +(m.JSHeapUsedSize / 2 ** 20).toFixed(2), nodos: m.Nodes, canvas: await ev(`document.querySelectorAll('canvas').length`) }
  console.log(nombre.padEnd(46), JSON.stringify(r))
}
const capa = (c) => ev(`window.__j.capa = '${c}'`)

await cdp('Runtime.enable'); await cdp('Page.enable'); await cdp('Performance.enable')
await cdp('Emulation.setDeviceMetricsOverride', { width: +W, height: +H, deviceScaleFactor: +W < 768 ? 2 : 1, mobile: +W < 768 })
if (+FRENO > 1) await cdp('Emulation.setCPUThrottlingRate', { rate: +FRENO })
await cdp('Page.navigate', { url })
await espera(3000)
await ev(`document.querySelector('.titulo button')?.click()`)
await espera(1500)
// Estado de prueba: la pila llena con Caudal alto y la Red con nodos en todos los niveles. Memoria en 3: sin Infinito automático.
await ev(`import(performance.getEntriesByType('resource').map((r) => r.name).find((n) => n.includes('/src/ui/juego.svelte.ts')) ?? '/src/ui/juego.svelte.ts').then(({ juego: j }) => {
  window.__j = j
  const s = j.s, ocho = (f) => Array.from({ length: 8 }, (_, k) => f(k))
  j.vistos = { ...j.vistos, cristales: true }
  j.s = { ...s, infinitos: 3, granos: 600000, caudal: 12, cristales: s.cristales.add(5000), cristalesTotales: s.cristalesTotales.add(5000),
    red: { ...s.red, memoria: 3, eco: 4, sedimentacion: 4, estratos: 2, defectos: 1, ruptura: 3, compactacion: 4, cristalografia: 2 } }
  j.pantalla = 'red'
})`)
await espera(8000) // la pila se llena con las fotos

console.log(`--- ${W}x${H}, CPU ÷${FRENO} ---`)
if (await ev(`window.__j.otraPestana`)) throw new Error('hay otro Edge en el puerto 9334 con el juego abierto: cerralo')
await fps('Arena, antes')
await memoria('Memoria en la Arena, sin haber entrado')
// La primera entrada baja three.js (una sola vez): la memoria de referencia es la de después de esa visita.
await capa('cristalizacion'); await espera(2000); await capa('arena'); await espera(1000)
await memoria('Memoria en la Arena, después de 1 visita')
await capa('cristalizacion'); await espera(2000)
await foto(`red-${W}`)
await fps('Red, quieta')
await ev(`(window.__t0 = performance.now(), window.__mover = setInterval(() => { const v = window.redVisual; v.az = Math.PI / 4 + 0.4 * Math.sin((performance.now() - window.__t0) / 600); v.pedir() }, 16))`)
await fps('Red, girando sin parar')
await ev(`clearInterval(window.__mover)`)
await ev(`(window.__mover = setInterval(() => window.redVisual.derrumbar('eco'), 1400), window.redVisual.derrumbar('eco'))`)
await espera(500)
await foto(`red-${W}-derrumbe`)
await fps('Red, un derrumbe tras otro')
await ev(`clearInterval(window.__mover)`)
console.log('costos (ms)', JSON.stringify(await ev(`(() => { const v = window.redVisual, t = (f) => { const a = performance.now(); for (let i = 0; i < 20; i++) f(); return +((performance.now() - a) / 20).toFixed(2) }
  return { cuadro: t(() => { v.gl.render(v.escena, v.camara); v.gl.getContext().finish() }), llamadas: v.gl.info.render.calls, triangulos: v.gl.info.render.triangles, ...v.gl.info.memory, pixelRatio: v.gl.getPixelRatio() } })()`)))
await memoria('Memoria en la Red')
for (let i = 0; i < 10; i++) { await capa('arena'); await espera(700); await capa('cristalizacion'); await espera(1300) }
await capa('arena'); await espera(300)
await foto(`arena-vuelta-${W}`) // recién destapada: la pila tiene que verse entera
await espera(1700)
await fps('Arena, después de entrar y salir 10 veces')
await memoria('Memoria en la Arena, después de 11 visitas')
for (let i = 0; i < 20; i++) { await capa('cristalizacion'); await espera(600); await capa('arena'); await espera(300) }
await memoria('Memoria en la Arena, después de 31 visitas')
console.log('pila principal', await ev(`(() => { const c = document.querySelector('.pila canvas'); const g = c.getContext('webgl2'); return g ? (g.isContextLost() ? 'PERDIÓ el contexto' : 'contexto vivo') : '?' })()`))
console.log('errores', JSON.stringify(errores, null, 1))
await cdp('Browser.close') // edge.kill() solo no alcanza en Windows: quedaría vivo y la próxima corrida abriría una segunda pestaña
edge.kill()
