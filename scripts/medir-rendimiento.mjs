// Rendimiento y batería: celular de gama media emulado (390×844, densidad 3, CPU 4× más lenta) sobre un build de producción.
// Edge headless por CDP, sin dependencias (como capturas-celular.mjs).
//   node scripts/medir-rendimiento.mjs partida http://localhost:5173 <partida.json>   arma una partida a mitad de la Capa 1 (servidor de desarrollo)
//   node scripts/medir-rendimiento.mjs medir <carpeta-dist> <partida.json> <salida> [ahorro|normal]
// Mide 10 s por escenario: cuadros por segundo, CPU del hilo principal y del worker de la pila, tamaño del canvas,
// dibujos WebGL por segundo (píxeles por segundo ≈ GPU), cuadros con cambios en el DOM por segundo y lo que corre oculta.
import { spawn } from 'node:child_process'
import { createServer } from 'node:http'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join, extname } from 'node:path'

const [modo, origen, archivo, out = '.', ahorro = 'normal'] = process.argv.slice(2)
const espera = (ms) => new Promise((r) => setTimeout(r, ms))
const PUERTO = 9341

// Antes de todo: cuenta dibujos WebGL, el trabajo del worker de la pila (r.ms de cada respuesta) y los cuadros con cambios en el DOM.
const SONDA = `(() => {
  // La emulación de densidad no llega a device-pixel-content-box (daría px CSS): sin él, el juego usa contentRect × devicePixelRatio, como un celular real.
  Object.defineProperty(ResizeObserverEntry.prototype, 'devicePixelContentBoxSize', { get: () => undefined })
  const m = window.__m = { draws: 0, px: 0, worker: 0, dom: 0, raf: 0, timers: 0 }
  for (const C of [WebGL2RenderingContext, WebGLRenderingContext]) for (const f of ['drawArrays', 'drawElements']) {
    const o = C.prototype[f]
    C.prototype[f] = function (...a) { m.draws++; m.px += this.drawingBufferWidth * this.drawingBufferHeight; return o.apply(this, a) }
  }
  const W = window.Worker
  window.Worker = class extends W { constructor(...a) { super(...a); m.workers = (m.workers || 0) + 1; this.addEventListener('message', (e) => { m.msgs = (m.msgs || 0) + 1; if (typeof e.data?.ms === 'number') m.worker += e.data.ms }) } }
  const raf = window.requestAnimationFrame
  let tUlt = -1
  window.requestAnimationFrame = (f) => raf((t) => { if (t !== tUlt) { tUlt = t; m.raf++ } f(t) })
  const st = window.setTimeout, si = window.setInterval
  window.setTimeout = (f, ...a) => st((...b) => { m.timers++; typeof f === 'function' && f(...b) }, ...a)
  window.setInterval = (f, ...a) => si((...b) => { m.timers++; typeof f === 'function' && f(...b) }, ...a)
  let marcado = false
  addEventListener('DOMContentLoaded', () => new MutationObserver(() => { if (!marcado) { marcado = true; m.dom++; raf(() => (marcado = false)) } })
    .observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true }))
})()`

function servir(dir) {
  const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.bin': 'application/octet-stream', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2', '.woff': 'font/woff' }
  return createServer((req, res) => {
    const p = join(dir, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html'))
    if (!existsSync(p)) return res.writeHead(200, { 'content-type': 'text/html' }).end('<!doctype html>')
    res.writeHead(200, { 'content-type': TIPOS[extname(p)] ?? 'application/octet-stream' }).end(readFileSync(p))
  }).listen(8099)
}

const edge = spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', [
  '--headless=new', `--remote-debugging-port=${PUERTO}`, '--user-data-dir=D:/cache/edge-rendimiento', '--window-size=1366,768', '--use-angle=d3d11', 'about:blank',
])
let pag
for (let i = 0; i < 100 && !pag; i++) {
  await espera(300)
  try { pag = await (await fetch(`http://127.0.0.1:${PUERTO}/json/new?about:blank`, { method: 'PUT' })).json() } catch {}
}
const ws = new WebSocket(pag.webSocketDebuggerUrl)
await new Promise((r) => (ws.onopen = r))
let id = 0
const pend = new Map(), errores = []
ws.onmessage = (m) => {
  const d = JSON.parse(m.data)
  if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id) }
  if (d.method === 'Runtime.exceptionThrown') errores.push(d.params.exceptionDetails.exception?.description ?? d.params.exceptionDetails.text)
}
const cdp = (method, params = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })) })
const ev = async (expr) => {
  const r = (await cdp('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })).result
  if (r?.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text)
  return r?.result?.value
}
await cdp('Runtime.enable'); await cdp('Page.enable'); await cdp('Performance.enable')
await cdp('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 3, mobile: true })
await cdp('Emulation.setTouchEmulationEnabled', { enabled: true })
await cdp('Emulation.setUserAgentOverride', { userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 6a) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36' })

if (modo === 'partida') {
  const modulo = (n) => `import('${n}')`
  await cdp('Page.navigate', { url: origen })
  await espera(3000)
  await ev(`localStorage.clear(); localStorage.setItem('avalancha.instalar', '1')`)
  await cdp('Page.navigate', { url: origen })
  await espera(3000)
  await ev(`document.querySelector('.titulo button')?.click()`)
  await espera(1500)
  // Mitad de la Capa 1: 40 Infinitos, cinco estratos, Escarcha, Defectos I hechos, la pila llena (3e6 granos, Caudal alto).
  await ev(`Promise.all([${modulo('/src/ui/juego.svelte.ts')}, import('/src/ui/logros.ts')]).then(([{ juego: j, guardarYa }, m]) => {
    j.logros = Object.fromEntries([...Object.keys(m.LOGROS), ...Object.keys(m.LOGROS_C1), ...m.SECRETOS].map((k) => [k, 1]))
    const s = j.s, ocho = (f) => Array.from({ length: 8 }, (_, k) => f(k))
    j.vistos = { ...j.vistos, cristales: true, cascada: true, mutaciones: true, compresion: true, tienda: true, derrumbes: true, punado: true, anillos: true,
      c1_cristales: true, c1_relicario: true, c1_red: true, c1_estratos: true, c1_automat: true, c1_escarcha: true, c1_anillo3: true, c1_pulido: true, c1_defectos2: true, c1_defectos: true }
    j.s = { ...s, infinitos: 40, granos: 3000000, caudal: 40, compresiones: 12, energia: s.energia.mul(0).add('1e90'),
      cristales: s.cristales.mul(0).add('2.3e14'), cristalesTotales: s.cristalesTotales.mul(0).add('8.1e15'),
      red: { ...s.red, estratos: 1, presion: 2, engarces: 1, memoria: 4, ruptura: 1, defectos: 1 },
      estratos: { abiertos: 5, s: ocho((k) => (k < 5 ? 60 - k * 9 : 0)), perm: ocho((k) => (k < 5 ? 9 : 0)), pres: ocho((k) => (k < 5 ? 6 : 0)) },
      defectos: { ...s.defectos, completos: ['avalancha', 'sequia', 'ruido', 'inercia'] },
      escarcha: { ...s.escarcha, abierta: true, logX: 42.5, esquirlas: 37, reloj: 900 } }
    j.capa = 'arena'; j.ausencia = null
    guardarYa()
  })`)
  await espera(1000)
  writeFileSync(archivo, await ev(`localStorage.getItem('avalancha.guardado')`))
  console.log('partida guardada en', archivo)
} else {
  const srv = servir(origen)
  const url = 'http://localhost:8099/'
  await cdp('Page.addScriptToEvaluateOnNewDocument', { source: SONDA })
  await cdp('Page.navigate', { url: url + 'vacio' }) // misma origen sin el juego: al salir no guarda una partida nueva encima
  await espera(1000)
  // La partida con guardadoEn = ahora (sin ausencia que calcular) y los ajustes del escenario.
  const partida = JSON.parse(readFileSync(archivo, 'utf8'))
  partida.guardadoEn = Date.now()
  await ev(`localStorage.clear(); localStorage.setItem('avalancha.instalar', '1'); localStorage.setItem('avalancha.comunidad', '1');
    localStorage.setItem('avalancha.guardado', ${JSON.stringify(JSON.stringify(partida))});
    localStorage.setItem('avalancha.ajustes', JSON.stringify({ ahorro: ${ahorro === 'ahorro'}, bateria: ${ahorro === 'ahorro'}, calma: true }))`)
  await cdp('Page.navigate', { url })
  await espera(3000)
  await ev(`document.querySelector('.titulo button')?.click()`)
  await espera(4000)
  await cdp('Emulation.setCPUThrottlingRate', { rate: 4 })
  const metricas = async () => Object.fromEntries((await cdp('Performance.getMetrics')).result.metrics.map((x) => [x.name, x.value]))
  if (process.env.PERFIL) {
    // Funciones con más tiempo propio en 5 s (usar con un build sin minificar: vite build --minify false).
    if (process.env.PERFIL === 'cristal') { await ev(`document.querySelector('.capas .cristal')?.click()`); await espera(2000) }
    if (process.env.CSS) await ev(`document.head.insertAdjacentHTML('beforeend', '<style>' + ${JSON.stringify("process.env.CSS")} + '</style>')`.replace('"process.env.CSS"', JSON.stringify(process.env.CSS)))
    const m0 = await metricas(); await espera(5000); const m1 = await metricas()
    console.log('CPU ms/s:', (((m1.TaskDuration - m0.TaskDuration) * 1000) / 5).toFixed(0))
    if (process.env.ANIMS) console.log(await ev(`document.getAnimations().filter((a) => a.playState === 'running').map((a) => { const t = a.effect.target; return (a.animationName || '?') + ' ← ' + (t.tagName + '.' + (typeof t.className === 'string' ? t.className : t.className.baseVal)).slice(0, 80) + (a.effect.pseudoElement || '') }).join(' | ')`))
    if (process.env.SOLO_CPU) process.exit(0)
    await cdp('Profiler.enable'); await cdp('Profiler.start'); await espera(5000)
    const { nodes, samples, timeDeltas } = (await cdp('Profiler.stop')).result.profile
    const porId = new Map(nodes.map((n) => [n.id, n])), t = new Map()
    samples.forEach((sid, i) => { const f = porId.get(sid).callFrame; const k = (f.functionName || '(anónima)') + ' ' + f.url.split('/').pop() + ':' + f.lineNumber; t.set(k, (t.get(k) ?? 0) + timeDeltas[i] / 1000) })
    console.log([...t].sort((a, b) => b[1] - a[1]).slice(0, 30).map(([k, v]) => v.toFixed(0).padStart(6) + ' ms ' + k).join(String.fromCharCode(10)))
    process.exit(0)
  }
  const filas = []
  async function medir(nombre, ms = 10_000, antes) {
    if (antes) await antes()
    await espera(1500)
    const a = await metricas(), ma = await ev(`({ ...window.__m, vis: document.visibilityState })`), t0 = Date.now()
    await espera(ms)
    const b = await metricas(), mb = await ev(`({ ...window.__m, vis: document.visibilityState, dpr: devicePixelRatio, msgs: window.__m.msgs, workers: window.__m.workers, lienzos: [...document.querySelectorAll('canvas')].filter((c) => c.getClientRects().length && getComputedStyle(c).visibility !== 'hidden').map((c) => (c.className || c.parentElement.className.split(' ')[0]) + ' ' + c.width + '×' + c.height + ' (css ' + c.clientWidth + '×' + c.clientHeight + ')') })`)
    const seg = (Date.now() - t0) / 1000, d = (k) => (mb[k] - ma[k]) / seg
    const fila = {
      escenario: nombre, visible: mb.vis, fps: +d('raf').toFixed(1),
      cpuMsPorSeg: +(((b.TaskDuration - a.TaskDuration) * 1000) / seg).toFixed(0),
      workerMsPorSeg: +d('worker').toFixed(0),
      dibujosPorSeg: +d('draws').toFixed(1), megapixPorSeg: +(d('px') / 1e6).toFixed(1),
      domPorSeg: +d('dom').toFixed(1), dpr: mb.dpr, msgsPorSeg: +d('msgs').toFixed(1), timersPorSeg: +d('timers').toFixed(1), lienzos: mb.lienzos.join(' | '),
    }
    fila.cpuMsPorCuadro = fila.fps ? +(fila.cpuMsPorSeg / fila.fps).toFixed(1) : 0
    filas.push(fila)
    console.log(JSON.stringify(fila))
  }
  mkdirSync(out, { recursive: true })
  await medir('Arena')
  writeFileSync(join(out, `arena-${ahorro}.png`), Buffer.from((await cdp('Page.captureScreenshot', { format: 'png' })).result.data, 'base64'))
  await medir('Cristalización (Red)', 10_000, () => ev(`document.querySelector('.capas .cristal')?.click()`))
  await medir('Automatización', 10_000, () => ev(`document.querySelector('.capas .auto')?.click()`))
  await ev(`document.querySelector('.capas .arena')?.click()`)
  // Pestaña oculta: otra pestaña al frente.
  const otra = await (await fetch(`http://127.0.0.1:${PUERTO}/json/new?about:blank`, { method: 'PUT' })).json()
  await medir('Pestaña oculta', 10_000, () => fetch(`http://127.0.0.1:${PUERTO}/json/activate/${otra.id}`))
  await fetch(`http://127.0.0.1:${PUERTO}/json/activate/${pag.id}`)
  if (ahorro === 'ahorro') await medir('Arena, 70 s sin tocar', 10_000, () => espera(60_000))
  writeFileSync(join(out, `medidas-${ahorro}.json`), JSON.stringify(filas, null, 1))
  if (errores.length) console.log('errores:', errores)
  srv.close()
}
ws.close()
edge.kill()
process.exit(0)
