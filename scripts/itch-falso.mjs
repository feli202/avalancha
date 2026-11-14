// Imita a itch.io: sirve dist/ en una subcarpeta, dentro de un iframe de otro origen, y los archivos
// gzip salen con Content-Encoding: gzip (itch lo hace con todo archivo que empieza con 1f 8b).
// uso: npm run build && node scripts/itch-falso.mjs dist [puerto] [--sin-gzip]
import { createServer } from 'node:http'
import { readFileSync } from 'node:fs'
import { extname, join, normalize } from 'node:path'

const dist = process.argv[2], puerto = +(process.argv[3] ?? 4180), conGzip = !process.argv.includes('--sin-gzip')
const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff', '.bin': 'application/octet-stream' }
const SUB = '/html/1234567/'

createServer((req, res) => {
  const ruta = new URL(req.url, 'http://x').pathname
  if (ruta === '/') {
    res.setHeader('content-type', 'text/html')
    return res.end(`<!doctype html><title>itch falso</title><body style="margin:0;background:#222">
<iframe id="juego" src="http://127.0.0.1:${puerto}${SUB}index.html" width="1280" height="720" style="border:0" allow="autoplay; fullscreen"></iframe>`)
  }
  if (!ruta.startsWith(SUB)) { res.statusCode = 404; return res.end('no') }
  try {
    const b = readFileSync(join(dist, normalize(ruta.slice(SUB.length))))
    res.setHeader('content-type', TIPOS[extname(ruta)] ?? 'application/octet-stream')
    if (conGzip && b[0] === 0x1f && b[1] === 0x8b) res.setHeader('content-encoding', 'gzip')
    res.end(b)
  } catch { res.statusCode = 404; res.end('no') }
}).listen(puerto, () => console.log(`http://localhost:${puerto}/`))
