// Capturas del mini parche (Defectos, Relicario lleno, Red, Estratos, zoom, Compresión, aviso de versión).
// Edge headless por CDP, sin dependencias, como capturas-capa1.mjs.
// uso: node scripts/capturas-parche.mjs http://localhost:5173 <carpeta-salida>
import { spawn } from 'node:child_process'
import { writeFileSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { tmpdir } from 'node:os'

const [url, out] = process.argv.slice(2)
mkdirSync(out, { recursive: true })
const edge = spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', [
  '--headless=new', '--remote-debugging-port=9337', '--user-data-dir=D:/cache/edge-parche', '--window-size=1366,768',
  '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--use-angle=d3d11', 'about:blank',
])
const espera = (ms) => new Promise((r) => setTimeout(r, ms))
let pag
for (let i = 0; i < 100 && !pag; i++) {
  await espera(300)
  try { pag = await (await fetch('http://127.0.0.1:9337/json/new?about:blank', { method: 'PUT' })).json() } catch {}
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
const tam = process.argv[4] ? process.argv[4].split(',').map((x) => x.split('x').map(Number)) : [[1366, 768], [390, 844]]
const scroll = () => ev(`document.documentElement.scrollHeight > innerHeight + 1 || document.body.scrollHeight > innerHeight + 1`)
for (const [W, H] of tam) {
  await cdp('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: W < 768 ? 2 : 1, mobile: W < 768 })
  await cdp('Page.navigate', { url }); await espera(3000)
  await ev(`localStorage.clear()`)
  await cdp('Page.navigate', { url }); await espera(3000)
  await ev(`document.querySelector('.titulo button')?.click()`); await espera(2500)
  await ev(`Promise.all([${modulo('/src/ui/juego.svelte.ts')}, ${modulo('/src/ui/ajustes.svelte.ts')}, ${modulo('/src/version.svelte.ts')}]).then(([j, { ajustes: a }, v]) => {
    window.__m = j; window.__j = j.juego; window.__a = a; window.__v = v
    const s = j.juego.s, D = s.energia.constructor
    j.juego.vistos = { ...j.juego.vistos, compresion: true, tienda: true, derrumbes: true, punado: true, cristales: true, c1_cristales: true, c1_relicario: true, c1_red: true, c1_estratos: true, c1_automat: true, c1_defectos: true, c1_romper: true, reliquia_auto: true, c1_pulido: true, c1_anillo3: true }
    j.juego.s = { ...s, granos: 400000, infinitos: 8, compresiones: 9, cristales: D.pow10(25), cristalesTotales: D.pow10(25), energia: D.pow10(120),
      red: { ...s.red, memoria: 4, eco: 4, sedimentacion: 2, defectos: 4, ruptura: 1, estratos: 4, compactacion: 4, cristalografia: 4, engarces: 3 },
      estratos: { ...s.estratos, abiertos: 7, s: [60, 58, 56, 54, 52, 50, 48, 0] }, auto: { ...s.auto, infinito: false, compresion_auto: false }, relicario: { ...s.relicario, pendiente: 0, faltan: 0, espera: [] } }
    j.juego.notaReliquia = null
    a.marco = 'rosa'
  })`)
  await espera(3000)
  await foto(`${W}-arena`); console.log(W, 'arena scroll', await scroll(), 'fps', await ev(`Math.round(window.__j.medidas?.fps ?? -1)`))
  // Defectos: la grieta, el corrimiento, el espejo y las manchas, con dos paletas y con zoom.
  // La meta de un Defecto chico se alcanza enseguida (y sale el pop-up de la reliquia): se oculta solo para la captura.
  await ev(`document.head.insertAdjacentHTML('beforeend', '<style id=sinvelo>.velo{display:none!important}</style>')`)
  for (const d of ['vacancia', 'dislocacion', 'macla', 'impureza']) {
    await ev(`window.__j.s = { ...window.__j.s, energia: window.__j.s.energia.constructor.pow10(5), caudal: 0, colores: [0, 0, 0, 0], cascada: 0, mutaciones: { caudal: 0, colores: 0, expansion: 0, cascada: 0 }, granos: 400000, estratos: { ...window.__j.s.estratos, abiertos: 0 }, red: { ...window.__j.s.red, eco: 0 }, relicario: { ...window.__j.s.relicario, pendiente: 0, faltan: 0 }, defectos: { ...window.__j.s.defectos, completos: [], actual: '${d}' } }`); await espera(1200)
    await foto(`${W}-defecto-${d}`)
    if (d === 'vacancia') {
      await ev(`window.__a.paleta = 'glaciar'`); await espera(600); await foto(`${W}-defecto-${d}-paleta`)
      await ev(`window.__a.paleta = 'arena'; window.__j.zoom = 14`); await espera(1500); await foto(`${W}-defecto-${d}-zoom`)
      await ev(`window.__j.zoom = 0`); await espera(800)
    }
  }
  await ev(`window.__j.s = { ...window.__j.s, defectos: { ...window.__j.s.defectos, actual: '' } }`)
  await ev(`document.getElementById('sinvelo').remove()`)
  // Compresión con el Infinito roto, al lado del Infinito.
  await ev(`window.__j.s = { ...window.__j.s, compresiones: 15, energia: window.__j.s.energia.constructor.pow10(310) }`); await espera(1200)
  console.log(W, 'paneles', JSON.stringify(await ev(`[...document.querySelectorAll('.comprimir')].map((b) => b.innerText.split(String.fromCharCode(10)).join(' | '))`)))
  if (W < 768) { await ev(`document.querySelector('.manija').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); document.querySelector('.manija').dispatchEvent(new PointerEvent('pointerup', { bubbles: true }))`); await espera(900) }
  await foto(`${W}-compresion-infinito`)
  if (W < 768) { await ev(`document.querySelector('.manija').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); document.querySelector('.manija').dispatchEvent(new PointerEvent('pointerup', { bubbles: true }))`); await espera(900) }
  // Relicario lleno con una esperando, y la elección de dos.
  await ev(`(() => { const s = window.__j.s, T = ['cauce', 'cascada', 'mutaciones']
    const piezas = Array.from({ length: 24 }, (_, i) => ({ id: i + 1, tipo: T[i % 3], nivel: 1 + (i % 4), foto: '', inf: i + 1 }))
    window.__j.s = { ...s, red: { ...s.red, engarces: 4 }, relicario: { ...s.relicario, piezas, equipadas: [1, 2, 3], espera: [{ id: 30, tipo: 'cauce', nivel: 0, foto: '', inf: 8 }], pendiente: 9, faltan: 2 } }
    window.__j.capa = 'cristalizacion'; window.__j.pantalla = 'relicario' })()`); await espera(1800)
  const grilla = () => ev(`(() => { const g = document.querySelector('.grilla'); return [g.scrollHeight, g.clientHeight] })()`)
  await foto(`${W}-relicario-eleccion`); console.log(W, 'relicario con elección: scroll', await scroll(), 'grilla', await grilla())
  await ev(`window.__j.s = { ...window.__j.s, relicario: { ...window.__j.s.relicario, pendiente: 0, faltan: 0 } }`); await espera(900)
  await foto(`${W}-relicario`); console.log(W, 'relicario: scroll', await scroll(), 'grilla', await grilla())
  // Red: la ficha al comprar.
  await ev(`window.__j.pantalla = 'red'`); await espera(1500)
  await ev(`[...document.querySelectorAll('.red [role=button]')].find((x) => /Presi/.test(x.getAttribute('aria-label') ?? ''))?.dispatchEvent(new MouseEvent('click', { bubbles: true }))`); await espera(500)
  const ficha = () => ev(`[...document.querySelectorAll('.ficha .hace, .ficha .sig')].map((p) => p.innerText)`)
  console.log(W, 'ficha antes', JSON.stringify(await ficha()))
  for (const k of [1, 2]) { await ev(`document.querySelector('.ficha .compra')?.click()`); await espera(400); console.log(W, 'ficha después de comprar', k, JSON.stringify(await ficha())) }
  await foto(`${W}-red`)
  await ev(`window.__j.capa = 'arena'`); await espera(1500)
  // Estratos (↓) y zoom en el celular; el aviso de versión nueva.
  await ev(`window.__v.version.nueva = 'prueba'`); await espera(800)
  await foto(`${W}-aviso-version`)
  await ev(`window.__v.version.nueva = ''; window.__j.panel = 'ajustes'`); await espera(1200)
  await ev(`[...document.querySelectorAll('[role=tab]')].at(-1)?.click()`); await espera(700)
  await foto(`${W}-creditos`)
  await ev(`window.__j.panel = null`); await espera(500)
}
console.log('errores', JSON.stringify(errores, null, 1))
await cdp('Browser.close')
edge.kill()
