// v1.0, bloque 12: capturas para la página de itch.io (marketing/itch/), del build de producción con partidas armadas.
// Edge headless por CDP, sin dependencias (como capturas-celular.mjs; hace lo mismo que Playwright con deviceScaleFactor 2).
// Las partidas se arman en el servidor de desarrollo (núcleo y guardado reales) y se cargan en el build de producción.
// uso: npm run dev · npm run build && npx vite preview --port 4173 · node scripts/capturas-itch.mjs http://localhost:5173 http://localhost:4173 marketing/itch
import { spawn, execFileSync } from 'node:child_process'
import { writeFileSync, mkdirSync } from 'node:fs'

const [dev, prod, out] = process.argv.slice(2)
mkdirSync(`${out}/crudas`, { recursive: true })
const edge = spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', [
  '--headless=new', '--remote-debugging-port=9341', '--user-data-dir=D:/cache/edge-itch', '--window-size=1366,768',
  '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--use-angle=d3d11', 'about:blank',
])
const espera = (ms) => new Promise((r) => setTimeout(r, ms))
let pag
for (let i = 0; i < 100 && !pag; i++) {
  await espera(300)
  try { pag = await (await fetch('http://127.0.0.1:9341/json/new?about:blank', { method: 'PUT' })).json() } catch {}
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
const foto = async (ruta, clip) => writeFileSync(ruta, Buffer.from((await cdp('Page.captureScreenshot', { format: clip ? 'jpeg' : 'png', ...(clip && { quality: 92, clip: { ...clip, scale: 1 } }) })).result.data, 'base64'))
const tam = (W, H, dpr = 2) => cdp('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: dpr, mobile: W < 768 })
await cdp('Runtime.enable'); await cdp('Page.enable')

// ---------- 1. Las partidas, armadas con el núcleo real en el servidor de desarrollo ----------
await tam(1280, 720, 1)
await cdp('Page.navigate', { url: dev }); await espera(4000)
const partidas = await ev(`Promise.all([import('/src/core/index.ts'), import('/src/guardado/guardado.ts'), import('/src/ui/juego.svelte.ts')]).then(([c, g, j]) => {
  const D = c.INFINITO.constructor, s0 = c.estadoInicial()
  const red = (o) => ({ ...s0.red, ...o })
  const mitad11 = { infinitos: 24, compresiones: 17, caudal: 60, colores: [140, 110, 90, 70], cascada: 12, granos: 3e7, granosTotales: 1e9,
    mutaciones: { caudal: 5, colores: 5, expansion: 5, cascada: 5 }, cristales: D.pow10(19), cristalesTotales: D.pow10(19.4), energia: D.pow10(412), maxEnergia: D.pow10(412),
    red: red({ memoria: 4, eco: 4, sedimentacion: 3, defectos: 2, ruptura: 3, estratos: 4, compactacion: 3, presion: 3, engarces: 3, cascada_plus: 2, mutacion_plus: 2, inercia: 2, cristalografia: 4 }),
    estratos: { ...s0.estratos, abiertos: 6, s: [64, 60, 55, 50, 44, 38, 0, 0] }, defectos: { ...s0.defectos, completos: ['vacancia'] },
    coloresDesbloqueados: 4, tiempoTotal: 5.6 * 3600, tiempoCorrida: 140, tiempoInfinito: 140,
    auto: { ...Object.fromEntries(Object.keys(s0.auto).map((k) => [k, true])), infinito: false }, // sin Infinito automático: si no, se hace al cargar
    relicario: { ...s0.relicario, piezas: [1, 2, 3, 4, 5, 6].map((i) => ({ id: i, tipo: ['cauce', 'cascada', 'mutaciones'][i % 3], nivel: 1 + (i % 3), foto: '', inf: i })), equipadas: [1, 2, 3], pendiente: 0, faltan: 0, siguiente: 7 } }
  const estados = {
    temprana: { ...s0, granos: 6000, granosTotales: 8000, caudal: 6, colores: [4, 2, 1, 0], coloresDesbloqueados: 3, energia: new D(48000), maxEnergia: new D(60000), tiempoTotal: 420, tiempoCorrida: 420 },
    mandala: { ...s0, granos: 2.5e7, granosTotales: 9e8, caudal: 48, colores: [120, 96, 78, 60], coloresDesbloqueados: 4, cascada: 10, compresiones: 14,
      mutaciones: { caudal: 4, colores: 3, expansion: 3, cascada: 2 }, energia: D.pow10(247.3), maxEnergia: D.pow10(247.3), tiempoTotal: 2.6 * 3600, tiempoCorrida: 500, auto: { ...s0.auto, caudal: true, ambar: true, coral: true, jade: true, violeta: true } },
    red: { ...s0, ...mitad11 },
    reliquias: { ...s0, ...mitad11, relicario: { ...mitad11.relicario, pendiente: 25, faltan: 1 } },
    masAlla: { ...s0, ...mitad11, energia: D.pow10(481.7), maxEnergia: D.pow10(481.7), estratos: { ...s0.estratos, abiertos: 7, s: [80, 76, 70, 64, 58, 52, 44, 0] } },
  }
  const r = {}
  for (const [k, s] of Object.entries(estados)) {
    const vistos = { ...j.yaVisto(s, {}), cristales: true, ...Object.fromEntries(['c1_cristales', 'c1_relicario', 'c1_red', 'c1_estratos', 'c1_automat', 'c1_defectos', 'c1_romper', 'reliquia_auto', 'c1_pulido', 'c1_anillo3', 'instalar'].map((x) => [x, true])) }
    r[k] = g.serializar({ estado: s, guardadoEn: 0, vistos, record: 1987654, logros: {} })
  }
  return r
})`)
console.log('partidas', Object.keys(partidas).join(', '))

// ---------- 2. Cargar una partida en el build de producción ----------
async function cargar(nombre, idioma, W, H, dpr = 2) {
  await tam(W, H, dpr)
  // Desde una página sin el juego del mismo origen: si no, el pagehide del juego pisa la partida escrita.
  await cdp('Page.navigate', { url: prod + 'privacidad.html' }); await espera(800)
  const p = JSON.parse(partidas[nombre]); p.guardadoEn = Date.now()
  await ev(`localStorage.clear(); localStorage.setItem('avalancha.instalar', '1'); localStorage.setItem('avalancha.comunidad', '1');
    localStorage.setItem('avalancha.ajustes', ${JSON.stringify(JSON.stringify({ idioma, marco: 'rosa', calma: true }))});
    localStorage.setItem('avalancha.guardado', ${JSON.stringify(JSON.stringify(p))})`)
  await cdp('Page.navigate', { url: prod }); await espera(3500)
  await ev(`document.head.insertAdjacentHTML('beforeend', '<style>.avisos{display:none!important}</style>')`) // los logros que salen al cargar
}
const entrar = async () => { await ev(`document.querySelector('.titulo button')?.click()`); await espera(3200) }
const ir = async (pantalla) => {
  await ev(`document.querySelector('.capas .cristal')?.click()`); await espera(1200)
  await ev(`document.querySelector('nav.sistemas [data-guia="c1_${pantalla}"]')?.click()`); await espera(2500)
}

const crudas = []
const sacar = async (archivo) => { const r = `${out}/crudas/${archivo}.png`; await foto(r); crudas.push(r); console.log(archivo) }

const soloGif = process.env.SOLO_GIF === '1' // rehacer solo el GIF
if (!soloGif) {
// Portada: la pila grande con el título. Se esconde toda la interfaz menos la pila y se pone encima el logo y el nombre,
// con la misma letra y el mismo resplandor de la pantalla de título.
await cargar('mandala', 'es', 630, 500, 3); await entrar()
await ev(`(() => {
  document.head.insertAdjacentHTML('beforeend', '<style>body *{visibility:hidden!important} .pila,.pila *,#portada,#portada *{visibility:visible!important} .caja-marco{display:none!important} .juego{--pila-radio-max:100vw!important} .pila{transform:translateY(-12%)}</style>')
  document.body.insertAdjacentHTML('beforeend', '<div id="portada" style="position:fixed;inset:0;z-index:99;display:flex;align-items:flex-end;justify-content:center;gap:16px;padding-bottom:30px;background:linear-gradient(to bottom, transparent 55%, rgb(7 8 15 / 0.94) 90%)"><img src="logo.svg" width="54" height="54" style="margin-bottom:12px"><h1 style="margin:0;font:600 84px/0.95 Space Grotesk,system-ui;letter-spacing:-0.05em;color:#e8e9f3;text-shadow:0 0 2.5rem rgb(255 181 71 / 0.35),0 0 1rem #07080f">Avalancha</h1></div>')
})()`); await espera(2000)
await sacar('portada')

for (const idioma of ['es', 'en']) {
  // Escritorio: 1280×720 con densidad 2, después se lleva a 1920×1080.
  await cargar('temprana', idioma, 1280, 720); await entrar(); await sacar(`${idioma}-1-pila-temprana`)
  await cargar('mandala', idioma, 1280, 720); await entrar(); await sacar(`${idioma}-2-mandala`)
  await cargar('red', idioma, 1280, 720); await entrar(); await ir('red'); await sacar(`${idioma}-3-red`)
  await cargar('masAlla', idioma, 1280, 720); await entrar(); await ir('estratos'); await sacar(`${idioma}-4-estratos`)
  await cargar('reliquias', idioma, 1280, 720); await entrar(); await espera(1500); await sacar(`${idioma}-5-reliquias`)
  await cargar('masAlla', idioma, 1280, 720); await entrar(); await sacar(`${idioma}-6-mas-alla-del-infinito`)
}
// Celular: 540×960 con densidad 2 = 1080×1920.
await cargar('masAlla', 'es', 540, 960); await entrar(); await sacar('celular-1-arena')
await ir('red'); await sacar('celular-2-red')
await ev(`document.querySelector('nav.sistemas [data-guia="c1_estratos"]')?.click()`); await espera(2500); await sacar('celular-3-estratos')

}
// ---------- 3. GIF: una avalancha grande (servidor de desarrollo: el botón de avalancha es del panel de debug, oculto) ----------
await tam(900, 700, 1)
await cdp('Page.navigate', { url: dev + '/privacidad.html' }); await espera(800)
{
  const p = JSON.parse(partidas.mandala); p.guardadoEn = Date.now()
  await ev(`localStorage.clear(); localStorage.setItem('avalancha.instalar', '1'); localStorage.setItem('avalancha.comunidad', '1');
    localStorage.setItem('avalancha.guardado', ${JSON.stringify(JSON.stringify(p))})`)
}
await cdp('Page.navigate', { url: dev }); await espera(3500)
await entrar()
// Solo la pila (sin interfaz ni panel de debug), grande y centrada.
await ev(`document.head.insertAdjacentHTML('beforeend', '<style>body *{visibility:hidden!important} .pila,.pila *{visibility:visible!important} details{display:none!important} .juego{--pila-radio-max:100vw!important}</style>')`); await espera(1500)
const lado = 600, clip = { x: (900 - lado) / 2, y: (700 - lado) / 2, width: lado, height: lado }
await ev(`Promise.all([import('/src/ui/grabacion.ts'), import('/src/render/pilaVisual.ts')]).then(([g, p]) => { window.__echar = () => g.grabacion.pila?.echar(p.RITMO_MAX) })`)
mkdirSync(`${out}/crudas/gif`, { recursive: true })
const t0 = Date.now()
let n = 0
while (Date.now() - t0 < 6500) {
  if (n % 6 === 0 && Date.now() - t0 < 4000) await ev(`window.__echar()`)
  await foto(`${out}/crudas/gif/${String(n).padStart(3, '0')}.jpg`, clip); n++
}
console.log('cuadros del GIF', n, 'en', (Date.now() - t0) / 1000, 's')
console.log('errores', JSON.stringify(errores, null, 1))
await cdp('Browser.close')
edge.kill()
// Tamaños finales con Pillow (escala de calidad): scripts/itch_final.py.
execFileSync('python', ['scripts/itch_final.py', out], { stdio: 'inherit' })
