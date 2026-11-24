// Capturas de todas las pantallas de la Capa 1 en celular, tablet y escritorio, con un control de cada una.
// Edge headless por CDP, sin dependencias (como capturas-capa1.mjs). El perfil de Edge va en D: (C: se llena).
// uso: node scripts/capturas-celular.mjs http://localhost:5173 <carpeta-salida> [390x844,360x640,...]
// Por pantalla anota: si la página scrollea, qué cajas scrollean, qué se sale de la ventana y qué botones miden menos de 44 px.
import { spawn } from 'node:child_process'
import { writeFileSync, mkdirSync } from 'node:fs'

const [url, out, lista = '390x844'] = process.argv.slice(2)
const TAMANOS = lista.split(',').map((t) => t.split('x').map(Number))
mkdirSync(out, { recursive: true })
const edge = spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', [
  '--headless=new', '--remote-debugging-port=9337', '--user-data-dir=D:/cache/edge-celular', '--window-size=1366,768',
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
const modulo = (n) => `import(performance.getEntriesByType('resource').map((r) => r.name).find((x) => x.includes('${n}')) ?? '${n}')`

// El control: lo de afuera de la ventana cuenta solo si no está dentro de una caja que scrollea o recorta.
const CONTROL = `(() => {
  // Las entradas (escala 1,03 de los paneles) agrandan la caja mientras corren: se terminan antes de medir.
  for (const a of document.getAnimations()) try { if (a.effect?.getTiming().iterations !== Infinity) a.finish() } catch {}
  const W = innerWidth, H = innerHeight, vis = (e) => { const c = getComputedStyle(e); return c.visibility !== 'hidden' && c.display !== 'none' && +c.opacity > 0.05 }
  const recorta = (e) => { for (let p = e.parentElement; p && p !== document.body; p = p.parentElement) { const o = getComputedStyle(p); if (o.overflowX !== 'visible' || o.overflowY !== 'visible') return true } return false }
  const nombre = (e) => e.tagName.toLowerCase() + (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\\s+/).slice(0, 2).join('.') : '') + (e.textContent ? ' «' + e.textContent.trim().slice(0, 18) + '»' : '')
  const capa = [...document.querySelectorAll('body *')].filter((e) => !e.closest('[inert], .aviso') && vis(e))
  const scrollean = capa.filter((e) => { const o = getComputedStyle(e).overflowY; return (o === 'auto' || o === 'scroll') && e.scrollHeight > e.clientHeight + 1 }).map(nombre)
  const fuera = capa.filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && (r.right > W + 1 || r.bottom > H + 1 || r.left < -1) && !recorta(e) && getComputedStyle(e).position !== 'fixed' }).map(nombre).slice(0, 8)
  const chicos = capa.filter((e) => e.matches('button:not([disabled]), [role=tab], a, input, select, label') && !e.matches('input[type=checkbox], input[type=radio]')).filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.top < H && r.bottom > 0 && (r.width < 43.5 || r.height < 43.5) }).map((e) => nombre(e) + ' ' + Math.round(e.getBoundingClientRect().width) + 'x' + Math.round(e.getBoundingClientRect().height)).slice(0, 8)
  const sw = document.documentElement.scrollWidth, sh = document.documentElement.scrollHeight
  return { pagina: sh > H + 1 || sw > W + 1 ? sw + "x" + sh : false, scrollean, fuera, chicos }
})()`

await cdp('Runtime.enable'); await cdp('Page.enable')
for (const [W, H] of TAMANOS) {
  const tag = `${W}x${H}`
  await cdp('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: W < 768 || H < 768 ? 2 : 1, mobile: Math.min(W, H) < 768 })
  await cdp('Emulation.setTouchEmulationEnabled', { enabled: Math.min(W, H) < 1024 })
  await cdp('Page.navigate', { url })
  await espera(3000)
  await ev(`localStorage.clear(); localStorage.setItem('avalancha.instalar', '1')`) // sin la tarjeta de instalar encima
  await cdp('Page.navigate', { url })
  await espera(3000)
  await ev(`document.querySelector('.titulo button')?.click()`)
  await espera(1500)
  await ev(`Promise.all([import('/src/render/pila.ts'), import('/src/render/instantanea.ts')]).then(([{ Pila }, { instantanea }]) => {
    window.__fotos = [300, 900, 1700, 2600, 4100, 6000, 9000, 14000].map((n) => { const p = new Pila(); for (let i = 0; i < n; i += 50) { p.soltar(50); while (!p.estable) p.estabilizar(1e6) } return instantanea(p.h) })
  })`)
  // Estado de una partida avanzada de la 1.2: Escarcha abierta, cinco estratos, Defectos I completos, reliquias de sobra.
  await ev(`Promise.all([${modulo('/src/ui/juego.svelte.ts')}, import('/src/ui/logros.ts')]).then(([{ juego: j }, m]) => {
    window.__j = j
    // Todos los logros ya ganados (sin carteles encima) y el panel de debug afuera.
    j.logros = Object.fromEntries([...Object.keys(m.LOGROS), ...Object.keys(m.LOGROS_C1), ...m.SECRETOS].map((k) => [k, 1]))
    document.querySelector('details > summary')?.parentElement?.remove()
    const s = j.s, ocho = (f) => Array.from({ length: 8 }, (_, k) => f(k))
    j.vistos = { ...j.vistos, cristales: true, cascada: true, mutaciones: true, compresion: true, tienda: true, derrumbes: true, punado: true, anillos: true,
      c1_cristales: true, c1_relicario: true, c1_red: true, c1_estratos: true, c1_automat: true, c1_escarcha: true, c1_anillo3: true, c1_pulido: true, c1_defectos2: true, c1_defectos: true }
    j.s = { ...s, infinitos: 40, granos: 3000000, caudal: 40, compresiones: 17, energia: s.energia.mul(0).add('1e90'),
      cristales: s.cristales.mul(0).add('2.3e14'), cristalesTotales: s.cristalesTotales.mul(0).add('8.1e15'),
      red: { ...s.red, estratos: 1, presion: 2, engarces: 1, memoria: 4, ruptura: 1, defectos: 1 },
      estratos: { abiertos: 5, s: ocho((k) => (k < 5 ? 60 - k * 9 : 0)), perm: ocho((k) => (k < 5 ? 9 : 0)), pres: ocho((k) => (k < 5 ? 6 : 0)) },
      defectos: { ...s.defectos, completos: ['avalancha', 'sequia', 'ruido', 'inercia'] },
      escarcha: { ...s.escarcha, abierta: true, logX: 42.5, esquirlas: 37, reloj: 900 },
      relicario: { ...s.relicario, pendiente: 2, foto: window.__fotos[7], equipadas: [3, 6],
        piezas: Array.from({ length: 30 }, (_, i) => [['cauce', 2], ['cauce', 0], ['cauce', 1], ['cascada', 0], ['cascada', 0], ['mutaciones', 4], ['mutaciones', 0], ['cascada', 1], ['mutaciones', 3], ['cascada', 2]][i % 10])
          .map(([tipo, nivel], i) => ({ id: i + 1, tipo, nivel, foto: window.__fotos[i % 8], inf: i + 1 })) } }
    j.capa = 'arena'; j.ausencia = null
  })`)
  await espera(3500)
  const resumen = {}
  const mirar = async (nombre, ms = 1200) => {
    await espera(ms)
    await foto(`${tag}-${nombre}`)
    resumen[nombre] = await ev(CONTROL)
  }
  await mirar('arena', 2500)
  for (const p of ['relicario', 'red', 'estratos', 'defectos', 'escarcha']) {
    await ev(`(window.__j.capa = 'cristalizacion', window.__j.pantalla = '${p}')`)
    await mirar(p, p === 'estratos' ? 3500 : 1200)
  }
  await ev(`(window.__j.capa = 'automatizacion')`)
  await mirar('automatizacion')
  await ev(`(window.__j.capa = 'cristalizacion')`)
  for (const p of ['logros', 'estadisticas', 'ajustes', 'ayuda']) {
    await ev(`window.__j.panel = '${p}'`)
    await mirar(p)
    if (p === 'ajustes') {
      await ev(`[...document.querySelectorAll('[role=tab]')].find((b) => /aspecto|look/i.test(b.textContent))?.click()`)
      await mirar('ajustes-aspecto', 600)
    }
    await ev(`window.__j.panel = null`)
    await espera(500)
  }
  await ev(`${modulo('/src/core/index.ts')}.then((c) => { const j = window.__j; j.ausencia = { s: j.s, fuera: 86400, segundos: 720, defecto: false, energia: j.s.energia, compresiones: 3, estratosAntes: j.s.estratos.s.map((x) => x - 2), escarchaAntes: j.s.escarcha.logX - 1.5 } })`)
  await mirar('ausencia')
  await ev(`window.__j.ausencia = null`)
  for (const [n, r] of Object.entries(resumen)) {
    const mal = r.pagina || r.fuera.length || r.chicos.length
    console.log(`${tag} ${n}${mal ? '  ✗' : '  ✓'}${r.pagina ? ' PÁGINA SCROLLEA ' + r.pagina : ''}${r.scrollean.length ? ' · scrollean: ' + r.scrollean.join(' | ') : ''}${r.fuera.length ? ' · FUERA: ' + r.fuera.join(' | ') : ''}${r.chicos.length ? ' · CHICOS: ' + r.chicos.join(' | ') : ''}`)
  }
}
console.log('errores', JSON.stringify(errores, null, 1))
await cdp('Browser.close')
edge.kill()
