// Partida completa a ×50 en Edge headless, manejada por CDP (sin dependencias).
// uso: node scripts/partida50.mjs http://localhost:5173 <carpeta-salida> [ancho alto]   (REUSAR=1 si Edge ya escucha en :9333)
// Imprime el avance cada 5 s, guarda capturas del final y lista los errores de la consola.
import { spawn } from 'node:child_process'
import { writeFileSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

const [url, out, W = '1280', H = '720'] = process.argv.slice(2)
mkdirSync(out, { recursive: true })
const edge = process.env.REUSAR ? { kill() {} } : spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', [
  '--headless=new', '--remote-debugging-port=9333', `--user-data-dir=${resolve(out, 'perfil')}`, `--window-size=${W},${H}`,
  '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--use-angle=d3d11', 'about:blank',
])
const espera = (ms) => new Promise((r) => setTimeout(r, ms))
let pag
for (let i = 0; i < 100 && !pag; i++) {
  await espera(300)
  try { pag = await (await fetch('http://127.0.0.1:9333/json/new?about:blank', { method: 'PUT' })).json() } catch {}
}
const ws = new WebSocket(pag.webSocketDebuggerUrl)
await new Promise((r) => (ws.onopen = r))
let id = 0
const pend = new Map()
const errores = []
ws.onmessage = (m) => {
  const d = JSON.parse(m.data)
  if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id) }
  if (d.method === 'Runtime.exceptionThrown') errores.push(d.params.exceptionDetails.exception?.description ?? d.params.exceptionDetails.text)
  if (d.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(d.params.type))
    errores.push(d.params.type + ': ' + d.params.args.map((a) => a.value ?? a.description).join(' '))
}
const cdp = (method, params = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })) })
const ev = async (expr) => (await cdp('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })).result?.result?.value
const foto = async (nombre) => {
  const r = await cdp('Page.captureScreenshot', { format: 'png' })
  writeFileSync(`${out}/${nombre}.png`, Buffer.from(r.result.data, 'base64'))
}

await cdp('Runtime.enable'); await cdp('Page.enable')
await cdp('Emulation.setDeviceMetricsOverride', { width: +W, height: +H, deviceScaleFactor: 1, mobile: +W < 768 })
await cdp('Page.navigate', { url })
await espera(3000)
console.log('fps', await ev(`new Promise(r=>{let n=0;const t=performance.now();(function f(){n++;performance.now()-t<2000?requestAnimationFrame(f):r(n/2)})()})`))

// Bot: "Comprar todo" (M), Comprimir apenas se puede, y en Cascada/Mutaciones compra lo que alcance.
await ev(`(() => {
  document.querySelector('details').open = true;
  [...document.querySelectorAll('details button')].find(b => b.textContent.trim() === '×50').click();
  window.__t0 = performance.now(); window.__log = [];
  setInterval(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyM', key: 'm' }));
    const c = document.querySelector('button.comprimir');
    if (c && !c.disabled) { c.click(); window.__log.push(((performance.now()-window.__t0)/1000).toFixed(0) + ' s reales'); }
  }, 250);
  let i = 0;
  setInterval(() => {
    const tabs = [...document.querySelectorAll('[role=tab]')];
    if (tabs.length < 2) return;
    tabs[1 + (i++ % (tabs.length - 1))].click();
    setTimeout(() => { document.querySelectorAll('button.fila:not(:disabled)').forEach(b => b.click()); tabs[0].click(); }, 50);
  }, 600);
})()`)

const t0 = Date.now()
let fotos = 0
while (Date.now() - t0 < 20 * 60_000) {
  await espera(5000)
  const e = await ev(`({ e: document.querySelector('.energia')?.textContent, m: document.querySelector('.comprimir')?.textContent.replace(/\\s+/g,' ').trim(),
    tabs: [...document.querySelectorAll('[role=tab]')].map(t=>t.textContent).join('/'), autos: document.querySelectorAll('.auto').length,
    n: window.__log.length, fin: !!document.querySelector('.final') })`)
  console.log(Math.round((Date.now() - t0) / 1000) + 's', JSON.stringify(e))
  if (e.n >= 3 && fotos === 0) { await foto('tienda-media'); fotos++ }
  if (e.fin) {
    for (const ms of [500, 1500, 1500, 1500]) { await espera(ms); await foto('infinito-' + fotos++) }
    await espera(1500)
    console.log('final', await ev(`document.querySelector('.final').innerText`))
    await foto('final')
    break
  }
}
console.log('compresiones (tiempo real):', await ev('JSON.stringify(window.__log)'))
console.log('errores:', JSON.stringify(errores))
ws.close(); edge.kill()
process.exit(0)
