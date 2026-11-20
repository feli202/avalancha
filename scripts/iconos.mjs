// Íconos de la app (PWA e iOS): una mini pila de la Capa 0 dibujada con el motor real del juego (Pila + Lienzo, el mismo
// shader de la Arena) sobre el fondo Noche, sin texto. Edge headless por CDP, sin dependencias, como las capturas.
// uso: npm run dev (en otra terminal) y node scripts/iconos.mjs http://localhost:5173
import { spawn } from 'node:child_process'
import { writeFileSync, mkdirSync } from 'node:fs'

const url = process.argv[2] ?? 'http://localhost:5173'
const GRANOS = 2500 // un mandala que se lee a 180 px (unas 35 celdas de lado)
// [archivo, lado en px, fracción del lado que ocupa la pila]. Maskable: la pila dentro del círculo seguro (80 %).
const ICONOS = [
  ['public/iconos/icono-192.png', 192, 0.86], ['public/iconos/icono-512.png', 512, 0.86],
  ['public/iconos/maskable-192.png', 192, 0.62], ['public/iconos/maskable-512.png', 512, 0.62],
  ['public/apple-touch-icon.png', 180, 0.8],
]

mkdirSync('public/iconos', { recursive: true })
const edge = spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', [
  '--headless=new', '--remote-debugging-port=9338', '--user-data-dir=D:/cache/edge-iconos', '--use-angle=d3d11', 'about:blank',
])
const espera = (ms) => new Promise((r) => setTimeout(r, ms))
let pag
for (let i = 0; i < 100 && !pag; i++) {
  await espera(300)
  try { pag = await (await fetch('http://127.0.0.1:9338/json/new?about:blank', { method: 'PUT' })).json() } catch {}
}
const ws = new WebSocket(pag.webSocketDebuggerUrl)
await new Promise((r) => (ws.onopen = r))
let id = 0
const pend = new Map()
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id) } }
const cdp = (method, params = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })) })
const ev = async (expr) => {
  const r = (await cdp('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })).result
  if (r?.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text)
  return r?.result?.value
}

await cdp('Page.navigate', { url })
await espera(3000)
const pngs = await ev(`(async () => {
  const { Pila, LADO } = await import('/src/render/pila.ts')
  const { Lienzo } = await import('/src/render/lienzo.ts')
  const { COLORES_PILA } = await import('/src/render/paletas.ts')
  const p = new Pila()
  for (let n = 0; n < ${GRANOS}; n++) { p.soltar(1); while (!p.estable) p.estabilizar(1e6) }
  const t = new Float32Array(LADO * LADO).fill(-1)
  for (const i of p.tomarCeldas()) t[i] = 0
  for (let i = 0; i < t.length; i++) if (p.h[i]) t[i] = 0
  const out = []
  for (const [lado, frac] of ${JSON.stringify(ICONOS.map(([, l, f]) => [l, f]))}) {
    const lz = new Lienzo(new OffscreenCanvas(lado, lado))
    lz.subir(p.h.slice(), t)
    lz.colores = COLORES_PILA
    lz.fondo = 'noche'
    lz.pintar((lado * frac) / (2 * p.radio + 1), [0.2, 0.2, 0.2, 0.2], 0, 100, 1)
    const b = await lz.canvas.convertToBlob({ type: 'image/png' })
    const bytes = new Uint8Array(await b.arrayBuffer())
    let s = ''; for (const x of bytes) s += String.fromCharCode(x)
    out.push(btoa(s))
  }
  return out
})()`)
ICONOS.forEach(([archivo], i) => { writeFileSync(archivo, Buffer.from(pngs[i], 'base64')); console.log(archivo) })
ws.close()
edge.kill()
