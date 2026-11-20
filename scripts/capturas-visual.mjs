// Capturas de las mejoras visuales (marcos de la pila, barra al Infinito, fondo difuminado en el borde, barra de capas).
// Edge headless por CDP, sin dependencias, como capturas-capa1.mjs.
// uso: node scripts/capturas-visual.mjs http://localhost:5173 <carpeta-salida>
import { spawn } from 'node:child_process'
import { writeFileSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { tmpdir } from 'node:os'

const [url, out] = process.argv.slice(2)
mkdirSync(out, { recursive: true })
const edge = spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', [
  '--headless=new', '--remote-debugging-port=9336', '--user-data-dir=D:/cache/edge-visual', '--window-size=1366,768',
  '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--use-angle=d3d11', 'about:blank',
])
const espera = (ms) => new Promise((r) => setTimeout(r, ms))
let pag
for (let i = 0; i < 100 && !pag; i++) {
  await espera(300)
  try { pag = await (await fetch('http://127.0.0.1:9336/json/new?about:blank', { method: 'PUT' })).json() } catch {}
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
const medidas = () => ev(`(() => { const m = document.querySelector('canvas.marco'), a = document.querySelector('svg.compresion'); return {
  marco: m && Math.round(m.getBoundingClientRect().width), centro: m && [Math.round(m.getBoundingClientRect().x + m.getBoundingClientRect().width / 2), Math.round(m.getBoundingClientRect().y + m.getBoundingClientRect().height / 2)],
  anillo: !!a && getComputedStyle(a).visibility, camino: !!document.querySelector('.camino'), scroll: document.documentElement.scrollHeight > innerHeight + 1 } })()`)
// El mismo módulo que cargó el juego (con HMR Vite lo sirve con `?t=`; otra URL sería otra instancia).
const modulo = (n) => `import(performance.getEntriesByType('resource').map((r) => r.name).find((x) => x.includes('${n}')) ?? '${n}')`

await cdp('Runtime.enable'); await cdp('Page.enable')
for (const [W, H] of [[1366, 768], [390, 844]]) {
  await cdp('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: W < 768 ? 2 : 1, mobile: W < 768 })
  await cdp('Page.navigate', { url })
  await espera(3000)
  await ev(`localStorage.clear(); localStorage.setItem('avalancha.instalar', '1')`) // sin la tarjeta de instalar encima
  await cdp('Page.navigate', { url })
  await espera(3000)
  await ev(`document.querySelector('.titulo button')?.click()`)
  await espera(2500)
  await ev(`Promise.all([${modulo('/src/ui/juego.svelte.ts')}, ${modulo('/src/ui/ajustes.svelte.ts')}, import('/src/ui/logros.ts'), import('/src/core/index.ts')]).then(([{ juego: j }, { ajustes: a }, m, c]) => {
    window.__j = j; window.__a = a
    const o = {}; for (const k of [...Object.keys(m.RECOMPENSA), ...m.SECRETOS, ...Object.values(c.CFG.fondos).filter(Boolean)]) o[k] = 1
    j.logros = o
    j.vistos = { ...j.vistos, compresion: true, tienda: true, derrumbes: true, punado: true }
    j.s = { ...j.s, granos: 400000, compresiones: 3, energia: j.s.energia.mul(0).add('1e60') }
    a.fondo = 'arenaSeca'; a.marco = 'rosa'
  })`)
  await espera(5000)
  console.log(W, 'arena', JSON.stringify(await medidas()), 'fps', await ev(`Math.round(window.__j.medidas?.fps ?? -1)`))
  await foto(`${W}-arena`)
  // Todos los marcos, con su medida (tiene que ser la misma en todos: el círculo fijo).
  const tam = new Set()
  for (const m of await ev(`import('/src/render/paletas.ts').then((p) => p.MARCOS)`)) {
    await ev(`window.__a.marco = '${m}'`)
    await espera(250)
    tam.add((await medidas()).marco)
    if (W > 768 || ['rosa', 'polaroid', 'galleta'].includes(m)) await foto(`${W}-marco-${m}`)
  }
  console.log(W, 'tamaños del marco en todos los marcos:', [...tam])
  await ev(`window.__a.marco = 'polaroid'`)
  // Zoom: el marco no cambia.
  for (const z of [0, 6, 14, 28]) {
    await ev(`window.__j.zoom = ${z}`)
    await espera(1200)
    console.log(W, 'zoom', z, JSON.stringify(await medidas()))
    if (z === 14) await foto(`${W}-zoom14`)
  }
  await ev(`window.__j.zoom = 0`)
  // Comprimir: la implosión, el anillo y el marco en su lugar.
  await ev(`window.__j.s = { ...window.__j.s, energia: window.__j.s.energia.mul(0).add('1e200') }`)
  await espera(800)
  console.log(W, 'antes de comprimir', JSON.stringify(await medidas()))
  await foto(`${W}-lista-comprimir`)
  await ev(`document.querySelector('.comprimir')?.click()`)
  await espera(450)
  await foto(`${W}-comprimiendo`)
  console.log(W, 'comprimiendo', JSON.stringify(await medidas()))
  await espera(2500)
  // Otro tamaño de ventana.
  if (W > 768) {
    await cdp('Emulation.setDeviceMetricsOverride', { width: 1000, height: 640, deviceScaleFactor: 1, mobile: false })
    await espera(1200)
    console.log('1000×640', JSON.stringify(await medidas()))
    await foto(`1000-arena`)
    await cdp('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false })
    await espera(800)
  }
  // Ajustes: la tasa de refresco y Reducir movimiento.
  await ev(`window.__j.panel = 'ajustes'`)
  await espera(1500)
  await foto(`${W}-ajustes`)
  await ev(`[...document.querySelectorAll('[role=tab]')][1]?.click()`)
  await espera(600)
  await foto(`${W}-ajustes-juego`)
  await ev(`window.__j.panel = null`)
  await espera(800)
  // Capa 1: la barra de capas en la Arena y en Cristalización.
  await ev(`(window.__j.vistos = { ...window.__j.vistos, cristales: true, c1_cristales: true, c1_relicario: true, c1_red: true, c1_estratos: true, c1_automat: true },
    window.__j.s = { ...window.__j.s, infinitos: 3, cristales: window.__j.s.cristales.mul(0).add(5571), compresiones: 3, energia: window.__j.s.energia.mul(0).add('1e100') })`)
  await espera(1500)
  await foto(`${W}-arena-capa1`)
  console.log(W, 'arena con capas', JSON.stringify(await medidas()))
  for (const p of ['red', 'relicario']) {
    await ev(`(window.__j.capa = 'cristalizacion', window.__j.pantalla = '${p}')`)
    await espera(1500)
    await foto(`${W}-${p}`)
  }
  await ev(`(window.__j.capa = 'automatizacion')`)
  await espera(1200)
  await foto(`${W}-automatizacion`)
  await ev(`(window.__j.capa = 'arena')`)
  await espera(1500)
  console.log(W, 'vuelta a la arena', JSON.stringify(await medidas()))
}
console.log('errores', JSON.stringify(errores, null, 1))
await cdp('Browser.close')
edge.kill()
