// App instalada en iPhone: Safari copia la partida (guía de instalación) y la app, con almacenamiento propio y vacío, la pega.
// uso: npm run build && npx vite preview --port 4174 & node scripts/capturas-ios-app.mjs http://localhost:4174/ capturas/pwa
import { spawn } from 'node:child_process'
import { writeFileSync, rmSync } from 'node:fs'
const [app, out] = process.argv.slice(2)
rmSync('D:/cache/edge-iosapp', { recursive: true, force: true })
const edge = spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', ['--headless=new', '--remote-debugging-port=9341', '--user-data-dir=D:/cache/edge-iosapp', '--use-angle=d3d11', 'about:blank'])
const espera = (ms) => new Promise((r) => setTimeout(r, ms))
let pag
for (let i = 0; i < 100 && !pag; i++) { await espera(300); try { pag = await (await fetch('http://127.0.0.1:9341/json/new?about:blank', { method: 'PUT' })).json() } catch {} }
const ws = new WebSocket(pag.webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r))
let id = 0; const pend = new Map(), errores = []
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id) }; if (d.method === 'Runtime.exceptionThrown') errores.push(d.params.exceptionDetails.exception?.description) }
const c = (method, params = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })) })
const ev = async (e) => { const r = (await c('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true, userGesture: true })).result; if (r?.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description); return r?.result?.value }
const foto = async (n) => writeFileSync(`${out}/${n}.png`, Buffer.from((await c('Page.captureScreenshot', { format: 'png' })).result.data, 'base64'))
const clic = (t) => ev(`(() => { const b = [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === ${JSON.stringify(t)}); b?.click(); return !!b })()`)
await c('Runtime.enable'); await c('Page.enable')
await c('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true })
await c('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 })
await c('Emulation.setUserAgentOverride', { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' })
await c('Browser.grantPermissions', { permissions: ['clipboardReadWrite', 'clipboardSanitizedWrite'], origin: new URL(app).origin })
// Safari: juega un poco y abre la guía desde Ajustes.
await c('Page.navigate', { url: app }); await espera(2500)
await clic('Jugar'); await espera(1000)
for (let i = 0; i < 30; i++) { await c('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 195, y: 330 }] }); await c('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await espera(60) }
for (let i = 0; i < 20 && !(await ev(`!!document.querySelector('[aria-labelledby=instalar-titulo]')`)); i++) { await ev(`document.querySelector('button.rotulo')?.click()`); await espera(600) }
await clic('Copiar partida'); await espera(500)
const copiado = await ev(`navigator.clipboard.readText()`)
console.log('Safari: botón dice', await ev(`[...document.querySelectorAll('[role=dialog] button')].map((b) => b.textContent.trim()).join(' | ')`), '· copiado', copiado.length, 'caracteres')
await foto('9-ios-copiar')
const tiempoSafari = await ev(`(${'(() => { dispatchEvent(new Event("pagehide")); return JSON.parse(localStorage.getItem("avalancha.guardado")).estado.tiempoTotal })()'})`)
// App instalada: almacenamiento propio (vacío) y navigator.standalone.
await ev(`localStorage.clear()`)
await c('Page.addScriptToEvaluateOnNewDocument', { source: `Object.defineProperty(navigator, 'standalone', { get: () => true }); localStorage.clear()` })
await c('Page.navigate', { url: app }); await espera(2500)
await c('Page.removeScriptToEvaluateOnNewDocument', { identifier: '1' })
console.log('app: título', await ev(`document.body.innerText.includes('Jugar')`))
await clic('Jugar'); await espera(1200)
console.log('app: ofrece traer', await ev(`document.querySelector('[aria-labelledby=traer-titulo]')?.innerText.slice(0, 40)`))
await foto('10-app-traer')
await ev(`(() => { const t = document.querySelector('[aria-labelledby=traer-titulo] textarea'); t.value = 'basura'; t.dispatchEvent(new Event('input')) })()`)
await clic('Cargar'); await espera(400)
console.log('app: basura →', await ev(`document.querySelector('[aria-labelledby=traer-titulo] [role=alert]')?.innerText`))
await ev(`(() => { const t = document.querySelector('[aria-labelledby=traer-titulo] textarea'); t.value = ${JSON.stringify(copiado)}; t.dispatchEvent(new Event('input')) })()`)
await clic('Cargar'); await espera(800)
console.log('app: pregunta', JSON.stringify(await ev(`document.querySelector('[role=alertdialog]')?.innerText`)))
await foto('11-app-pregunta')
await clic('Cargar la de Safari'); await espera(3000)
console.log('app tras cargar: tiempo', await ev(`JSON.parse(localStorage.getItem('avalancha.guardado')).estado.tiempoTotal`), '· Safari tenía', tiempoSafari, '· título', await ev(`document.body.innerText.includes('Continuar')`))
await clic('Continuar'); await espera(2000)
console.log('app: no vuelve a ofrecer traer', !(await ev(`!!document.querySelector('[aria-labelledby=traer-titulo]')`)), '· errores', errores)
await foto('12-app-cargada')
ws.close(); edge.kill()
