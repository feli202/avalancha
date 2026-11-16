// Captura las maquetas con Edge headless por CDP (sin dependencias).
// uso: node mockups/estratos/capturar.mjs [n ...] [--ancho 1366 --alto 768 --sufijo ""]
import { spawn } from 'node:child_process'
import { writeFileSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const dir = dirname(fileURLToPath(import.meta.url))
const args = process.argv.slice(2)
const opt = (k, d) => { const i = args.indexOf(k); return i < 0 ? d : args.splice(i, 2)[1] }
const W = +opt('--ancho', 1366), H = +opt('--alto', 768), SUF = opt('--sufijo', '')
const nums = args.length ? args : ['1', '2', '3', '4', '5']
const perfil = resolve(process.env.TEMP ?? dir, 'avalancha-maquetas-perfil')
mkdirSync(perfil, { recursive: true })
const edge = spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', [
  '--headless=new', '--remote-debugging-port=9341', `--user-data-dir=${perfil}`, `--window-size=${W},${H}`, '--allow-file-access-from-files', 'about:blank',
])
const espera = (ms) => new Promise((r) => setTimeout(r, ms))
let pag
for (let i = 0; i < 100 && !pag; i++) { await espera(300); try { pag = await (await fetch('http://127.0.0.1:9341/json/new?about:blank', { method: 'PUT' })).json() } catch {} }
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
await cdp('Runtime.enable'); await cdp('Page.enable')
await cdp('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false })
for (const n of nums) {
  errores.length = 0
  await cdp('Page.navigate', { url: pathToFileURL(resolve(dir, `opcion-${n}.html`)).href })
  await espera(3500)
  const r = await cdp('Runtime.evaluate', { expression: 'JSON.stringify({sh: document.documentElement.scrollHeight, h: innerHeight, sw: document.documentElement.scrollWidth, w: innerWidth})', returnByValue: true })
  writeFileSync(resolve(dir, `opcion-${n}${SUF}.png`), Buffer.from((await cdp('Page.captureScreenshot', { format: 'png' })).result.data, 'base64'))
  console.log(`opcion-${n}${SUF}`, r.result.result.value, errores.length ? errores : 'sin errores')
}
edge.kill()
process.exit(0)
