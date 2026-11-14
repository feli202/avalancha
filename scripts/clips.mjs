// Modo grabación (src/ui/clips.ts): plugin de Vite que recibe el WebM de un clip y lo pasa a MP4 H.264 en
// marketing/clips/ con ffmpeg. Solo en `npm run dev`.
import { spawn } from 'node:child_process'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

/** @returns {import('vite').Plugin} */
export function clips() {
  return {
    name: 'clips',
    apply: 'serve',
    configureServer(server) {
      const dir = resolve(server.config.root, 'marketing/clips')
      server.middlewares.use('/__clip', (req, res) => {
        const u = new URL(req.url ?? '', 'http://x')
        const nombre = u.searchParams.get('nombre') ?? ''
        const dura = Number(u.searchParams.get('dura'))
        const desde = Number(u.searchParams.get('desde')) // segundo de la grabación en que empieza el clip
        // El servidor escucha en la red local (host: true): solo esta máquina escribe archivos y corre ffmpeg.
        const local = ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress ?? '')
        if (req.method !== 'POST' || !local || !/^[a-z0-9-]+$/.test(nombre) || !(dura > 0 && dura <= 60) || !(desde >= 0 && desde <= 10)) {
          res.statusCode = 400
          return res.end('pedido inválido')
        }
        const partes = []
        req.on('data', (d) => partes.push(d))
        req.on('end', () => {
          mkdirSync(dir, { recursive: true })
          const webm = resolve(dir, `${nombre}.webm`)
          writeFileSync(webm, Buffer.concat(partes))
          const mp4 = resolve(dir, `${nombre}.mp4`)
          const ff = spawn('ffmpeg', [
            '-y', '-loglevel', 'error', '-i', webm, '-ss', String(desde), '-t', String(dura),
            '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', '60',
            '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', mp4,
          ])
          let error = ''
          ff.stderr.on('data', (d) => (error += d))
          ff.on('error', (e) => { res.statusCode = 500; res.end(String(e)) })
          ff.on('close', (code) => {
            if (code !== 0) return void ((res.statusCode = 500), res.end(error))
            rmSync(webm)
            // El grabador a veces deja de recibir cuadros: si el video quedó corto, 409 y el navegador graba de nuevo.
            const fp = spawn('ffprobe', ['-v', 'error', '-select_streams', 'v', '-show_entries', 'stream=duration', '-of', 'csv=p=0', mp4])
            let salida = ''
            fp.stdout.on('data', (d) => (salida += d))
            fp.on('close', () => {
              const v = Number(salida)
              res.statusCode = v >= dura - 0.05 ? 200 : 409
              res.end(res.statusCode === 200 ? 'ok' : `${nombre}: video de ${v} s, se esperaban ${dura}`)
            })
          })
        })
      })
    },
  }
}
