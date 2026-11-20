// Capturas de la instalación como app: guía de iOS y botón Instalar (Android) a 390×844, y el pase de partida desde un
// iframe que imita itch.io (scripts/itch-falso.mjs) a la página de la app, con la pregunta lado a lado y la carga.
// Edge headless por CDP, sin dependencias. uso:
//   VITE_URL_APP=http://localhost:4174/ npm run build && npx vite preview --port 4174 & node scripts/itch-falso.mjs dist 4180 &
//   node scripts/capturas-pwa.mjs http://localhost:4174/ http://localhost:4180/ capturas/pwa
import { spawn } from 'node:child_process'
import { writeFileSync, mkdirSync, rmSync } from 'node:fs'

const [app, itch, out] = process.argv.slice(2)
mkdirSync(out, { recursive: true })
rmSync('D:/cache/edge-pwa', { recursive: true, force: true }) // perfil limpio: sin partidas de la vez anterior
const edge = spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', [
  '--headless=new', '--remote-debugging-port=9340', '--user-data-dir=D:/cache/edge-pwa', '--window-size=1366,768', '--use-angle=d3d11', 'about:blank',
])
const espera = (ms) => new Promise((r) => setTimeout(r, ms))
let ver
for (let i = 0; i < 100 && !ver; i++) { await espera(300); try { ver = await (await fetch('http://127.0.0.1:9340/json/version')).json() } catch {} }
const ws = new WebSocket(ver.webSocketDebuggerUrl)
await new Promise((r) => (ws.onopen = r))
let id = 0
const pend = new Map(), errores = [], nuevas = [], marcos = []
ws.onmessage = (m) => {
  const d = JSON.parse(m.data)
  if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id) }
  if (d.method === 'Target.targetCreated') nuevas.push(d.params.targetInfo)
  if (d.method === 'Target.attachedToTarget' && d.params.targetInfo.type === 'iframe') marcos.push(d.params.sessionId)
  if (d.method === 'Runtime.exceptionThrown') errores.push(d.params.exceptionDetails.exception?.description ?? d.params.exceptionDetails.text)
}
const cdp = (method, params = {}, sessionId) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params, sessionId })) })
await cdp('Target.setDiscoverTargets', { discover: true })

async function pagina(url, { ancho = 1366, alto = 768, ua, movil = false } = {}) {
  const { targetId } = (await cdp('Target.createTarget', { url: 'about:blank' })).result
  return conectar(targetId, url, { ancho, alto, ua, movil })
}
async function conectar(targetId, url, { ancho = 1366, alto = 768, ua, movil = false } = {}) {
  const s = (await cdp('Target.attachToTarget', { targetId, flatten: true })).result.sessionId
  const c = (m, p) => cdp(m, p, s)
  await c('Runtime.enable')
  await c('Emulation.setDeviceMetricsOverride', { width: ancho, height: alto, deviceScaleFactor: movil ? 2 : 1, mobile: movil })
  if (movil) await c('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 })
  if (ua) await c('Emulation.setUserAgentOverride', { userAgent: ua })
  if (url) await c('Page.navigate', { url })
  const ev = async (expr) => {
    const r = (await c('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })).result
    if (r?.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text)
    return r?.result?.value
  }
  const foto = async (nombre) => writeFileSync(`${out}/${nombre}.png`, Buffer.from((await c('Page.captureScreenshot', { format: 'png' })).result.data, 'base64'))
  return { c, ev, foto, targetId }
}
const clic = (txt) => `(() => { const b = [...document.querySelectorAll('button, a')].find((b) => b.textContent.trim() === ${JSON.stringify(txt)}); if (!b) return false; b.click(); return true })()`
const texto = `document.body.innerText`
const scroll = `document.documentElement.scrollHeight > innerHeight + 1`

// 1. iPhone (Safari), jugador nuevo: título → Jugar → toque → tarjeta con la guía.
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'
{
  const p = await pagina(app, { ancho: 390, alto: 844, ua: IOS, movil: true })
  await espera(2500)
  await p.ev(`localStorage.clear(); location.reload()`)
  await espera(2500)
  await p.ev(clic('Jugar'))
  await espera(1500)
  await p.foto('1-ios-intro')
  await p.c('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 195, y: 330 }] })
  await p.c('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  // Cierra las guías que vayan apareciendo hasta que salga la tarjeta.
  for (let i = 0; i < 20 && !(await p.ev(`!!document.querySelector('[aria-labelledby=instalar-titulo]')`)); i++) {
    await p.ev(`document.querySelector('button.rotulo')?.click()`)
    await espera(600)
  }
  await espera(600)
  console.log('iOS:', (await p.ev(texto)).includes('Agregar a inicio') ? 'guía OK' : 'SIN GUÍA', '· scroll:', await p.ev(scroll))
  await p.foto('2-ios-guia')
  await p.c('Page.close')
}

// 2. Android (Chrome) con beforeinstallprompt: botón Instalar → prompt().
{
  const p = await pagina(app, { ancho: 390, alto: 844, ua: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36', movil: true })
  await espera(2500)
  await p.ev(`window.__prompt = 0; const e = new Event('beforeinstallprompt', { cancelable: true }); e.prompt = async () => { window.__prompt++ };
    e.userChoice = Promise.resolve({ outcome: 'accepted' }); dispatchEvent(e); localStorage.removeItem('avalancha.instalar')`)
  // Desde Ajustes → Partida → Instalar como app (el botón fijo).
  await p.ev(clic('Continuar'))
  await espera(1500)
  if (!(await p.ev(`!!document.querySelector('[aria-labelledby=instalar-titulo]')`))) {
    await p.ev(`document.querySelector('button[aria-keyshortcuts=A]')?.click()`)
    await espera(800)
    await p.ev(clic('Partida'))
    await espera(500)
    await p.foto('3-ajustes-instalar')
    await p.ev(clic('Instalar como app'))
    await espera(800)
  }
  await p.foto('4-android-instalar')
  await p.ev(clic('Instalar'))
  await espera(500)
  console.log('Android: prompt() llamado', await p.ev('window.__prompt'), 'vez · tarjeta cerrada:', !(await p.ev(`!!document.querySelector('[aria-labelledby=instalar-titulo]')`)))
  await p.c('Page.close')
}

// 3. itch.io falso: partida en el iframe → Instalar como app → la app pregunta → Cargar.
{
  // Una partida en la app (para comparar) y otra, distinta, en el iframe de itch.
  const a = await pagina(app)
  await espera(2500)
  const appTiempo = await a.ev(`JSON.parse(localStorage.getItem('avalancha.guardado') ?? 'null')?.estado.tiempoTotal ?? 0`)
  await a.c('Page.close')
  nuevas.length = 0
  const p = await pagina(itch)
  await espera(3000)
  // El iframe es de otro origen: corre en su propio proceso y se le habla por su propia sesión (auto-attach).
  await p.c('Target.setAutoAttach', { autoAttach: true, waitForDebuggerOnStart: false, flatten: true })
  for (let i = 0; i < 20 && !marcos.length; i++) await espera(200)
  await cdp('Runtime.enable', {}, marcos[0])
  const enMarco = async (expr) => (await cdp('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }, marcos[0])).result?.result?.value
  // Juega un rato en itch (toques) y guarda.
  await enMarco(clic('Jugar') + ' || ' + clic('Continuar'))
  await espera(1500)
  for (let i = 0; i < 25; i++) { await p.c('Input.dispatchMouseEvent', { type: 'mousePressed', x: 640, y: 360, button: 'left', clickCount: 1 }); await p.c('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 640, y: 360, button: 'left', clickCount: 1 }); await espera(80) }
  await espera(1500)
  await enMarco(`localStorage.removeItem('avalancha.instalar')`)
  for (let i = 0; i < 20 && !(await enMarco(`!!document.querySelector('[aria-labelledby=instalar-titulo]')`)); i++) {
    await enMarco(`document.querySelector('button.rotulo')?.click()`)
    await espera(600)
  }
  if (!(await enMarco(`!!document.querySelector('[aria-labelledby=instalar-titulo]')`))) {
    await enMarco(`document.querySelector('button[aria-keyshortcuts=A]')?.click()`); await espera(600)
    await enMarco(clic('Partida')); await espera(400)
    await enMarco(clic('Instalar como app')); await espera(800)
  }
  for (let i = 0; i < 10 && (await enMarco(`[...document.querySelectorAll('button')].some((b) => b.textContent.includes('Preparando'))`)); i++) await espera(300)
  await p.foto('5-itch-tarjeta')
  const itchTiempo = await enMarco(`JSON.parse(localStorage.getItem('avalancha.guardado')).estado.tiempoTotal`)
  nuevas.length = 0
  // El clic tiene que ser real (window.open pide un gesto del usuario): se busca el botón y se toca con el mouse.
  const r = await enMarco(`(() => { const b = [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Instalar como app' && b.closest('[role=dialog]')); const q = b.getBoundingClientRect(); return [q.x + q.width / 2, q.y + q.height / 2] })()`)
  await p.c('Input.dispatchMouseEvent', { type: 'mousePressed', x: r[0], y: r[1], button: 'left', clickCount: 1 })
  await p.c('Input.dispatchMouseEvent', { type: 'mouseReleased', x: r[0], y: r[1], button: 'left', clickCount: 1 })
  await espera(1500)
  // La pestaña nueva nace sin URL: se la busca entre los targets ya cargados.
  const abierta = (await cdp('Target.getTargets')).result.targetInfos.find((t) => t.type === 'page' && t.url.startsWith(app))
  if (!abierta) console.log('itch tras el clic:', JSON.stringify(await enMarco(`document.querySelector('[role=dialog]')?.innerText ?? 'sin tarjeta'`)), JSON.stringify(nuevas.map((t) => [t.type, t.url.slice(0, 50)])), r)
  console.log('itch: se abrió', abierta ? abierta.url.slice(0, 60) + '…' : 'NADA', '· largo', abierta?.url.length, '· query vacía:', abierta && !new URL(abierta.url).search)
  if (abierta) {
    const q = await conectar(abierta.targetId, null, { ancho: 390, alto: 844, movil: true })
    await espera(2500)
    const t = await q.ev(texto)
    console.log('app: pregunta', t.includes('¿Cargar tu partida de itch.io?'), '· partidas app/itch (s):', appTiempo, itchTiempo)
    await q.foto('6-app-pregunta')
    const antes = await q.ev(`localStorage.getItem('avalancha.guardado')`)
    await q.ev(clic('Cargar la de itch.io'))
    await espera(3000)
    const despues = await q.ev(`({ hash: location.hash, tiempo: JSON.parse(localStorage.getItem('avalancha.guardado')).estado.tiempoTotal, respaldo: localStorage.getItem('avalancha.respaldo.pase') === ${JSON.stringify('X')} ? 'x' : localStorage.getItem('avalancha.respaldo.pase')?.length ?? null, traida: document.body.innerText.includes('Continuar') })`)
    console.log('app tras cargar:', JSON.stringify(despues), '· había partida antes:', antes !== null)
    await q.foto('7-app-cargada')
    // Lo que sigue: Continuar → la tarjeta de instalación se ofrece sola.
    await q.ev(clic('Continuar'))
    await espera(3000)
    console.log('app: ofrece instalar después de cargar:', await q.ev(`!!document.querySelector('[aria-labelledby=instalar-titulo]')`))
    await q.foto('8-app-ofrece')
  }
}
console.log('errores:', errores.length ? errores : 'ninguno')
ws.close()
edge.kill()
