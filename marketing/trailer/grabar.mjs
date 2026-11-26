// Tomas del tráiler en 4K: Playwright (Edge = Chromium) sobre el build de producción, con partidas de debug armadas con el núcleo real.
// Cuadro por cuadro con el reloj falso de Playwright: cada cuadro avanza 1/60 s de juego (o más, en los time-lapse) y se
// fotografía, así sale a 60 fps exactos aunque la máquina no llegue. Las animaciones CSS se pausan y se avanzan a mano con el
// mismo reloj. El audio sale de una pasada aparte en tiempo real (audio.mjs no hace falta: ver grabarAudio).
// uso: npm run dev · npx vite preview --port 4173 · node marketing/trailer/grabar.mjs [toma ...] [--v|--h]
import { chromium } from 'playwright-core'
import { mkdirSync, rmSync, writeFileSync, existsSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const AQUI = dirname(fileURLToPath(import.meta.url))
const DEV = 'http://localhost:5173/', PROD = 'http://localhost:4173/'
const FPS = 60, DT = 1000 / FPS
const args = process.argv.slice(2)
const formatos = args.includes('--h') ? ['h'] : args.includes('--v') ? ['v'] : ['v', 'h']
const pedidas = args.filter((a) => !a.startsWith('--'))
const VIEW = { v: { width: 540, height: 960 }, h: { width: 960, height: 540 } } // × DPR = 4K
const DPR = 4 // 2160×3840 y 3840×2160 reales (el juego dibuja a esa resolución, no se reescala)

const navegador = await chromium.launch({
  channel: 'msedge', headless: true,
  args: ['--use-angle=d3d11', '--autoplay-policy=no-user-gesture-required', '--disable-background-timer-throttling', '--disable-renderer-backgrounding'],
})

// ---------- Partidas, con el núcleo y el guardado reales (servidor de desarrollo) ----------
async function armarPartidas() {
  const p = await navegador.newPage()
  await p.goto(DEV)
  await p.waitForTimeout(3000)
  const r = await p.evaluate(() => Promise.all([import('/src/core/index.ts'), import('/src/guardado/guardado.ts'), import('/src/ui/juego.svelte.ts')]).then(([c, g, j]) => {
    const D = c.INFINITO.constructor, s0 = c.estadoInicial()
    const red = (o) => ({ ...s0.red, ...o })
    const todoAuto = Object.fromEntries(Object.keys(s0.auto).map((k) => [k, true]))
    const nadaAuto = Object.fromEntries(Object.keys(s0.auto).map((k) => [k, false]))
    const capa0 = { caudal: 48, colores: [120, 96, 78, 60], coloresDesbloqueados: 4, cascada: 10, compresiones: 14,
      mutaciones: { caudal: 4, colores: 3, expansion: 3, cascada: 2 }, tiempoTotal: 2.6 * 3600, tiempoCorrida: 500,
      auto: { ...nadaAuto, caudal: true, ambar: true, coral: true, jade: true, violeta: true, cascada: true, mutaciones: true } }
    const mitad11 = { infinitos: 24, compresiones: 17, caudal: 60, colores: [140, 110, 90, 70], cascada: 12, granos: 3e7, granosTotales: 1e9,
      mutaciones: { caudal: 5, colores: 5, expansion: 5, cascada: 5 }, cristales: D.pow10(19), cristalesTotales: D.pow10(19.4), energia: D.pow10(412), maxEnergia: D.pow10(412),
      red: red({ memoria: 4, eco: 4, sedimentacion: 3, defectos: 2, ruptura: 3, estratos: 4, compactacion: 3, presion: 3, engarces: 3, cascada_plus: 2, mutacion_plus: 2, inercia: 2, cristalografia: 4 }),
      estratos: { ...s0.estratos, abiertos: 6, s: [64, 60, 55, 50, 44, 38, 0, 0] }, defectos: { ...s0.defectos, completos: ['vacancia'] },
      coloresDesbloqueados: 4, tiempoTotal: 5.6 * 3600, tiempoCorrida: 140, tiempoInfinito: 140,
      auto: { ...todoAuto, infinito: false, compresion_auto: false },
      relicario: { ...s0.relicario, piezas: [1, 2, 3, 4, 5, 6].map((i) => ({ id: i, tipo: ['cauce', 'cascada', 'mutaciones'][i % 3], nivel: 1 + (i % 3), foto: '', inf: i })), equipadas: [1, 2, 3], pendiente: 0, faltan: 0, siguiente: 7 } }
    const E = (l) => ({ energia: D.pow10(l), maxEnergia: D.pow10(l) })
    const estados = {
      // a/b: pila vacía, Caudal 0 = un grano por segundo
      vacia: { ...s0, granos: 0, granosTotales: 0, energia: new D(0) },
      // c: la foto de 100 000 granos y 2 999 más que caen juntos en el centro (una sola tanda: RITMO_MAX = 3000)
      ...Object.fromEntries([3000, 10000, 30000, 100000, 300000].map((f) => [`tanda${f}`, { ...s0, ...capa0, granos: f + 2999, granosTotales: 9e8, caudal: 0, auto: nadaAuto, mutaciones: s0.mutaciones, ...E(2) }])),
      // d: corrida de la Capa 0 recién comprimida, con autocompradores: la pila crece y se enciende
      crece: { ...s0, ...capa0, granos: 39, granosTotales: 9e8, caudal: 12, colores: [0, 0, 0, 0], cascada: 0, mutaciones: s0.mutaciones, auto: { ...nadaAuto, ambar: true, coral: true, jade: true, violeta: true }, ...E(0) },
      // e: los números (misma corrida, arranca en 1e6)
      numeros: { ...s0, ...capa0, granos: 2e4, granosTotales: 9e8, caudal: 12, colores: [10, 8, 6, 4], cascada: 2, ...E(6) },
      // f: lista para comprimir
      comprimir: { ...s0, ...capa0, granos: 2.5e7, granosTotales: 9e8, ...E(247.3) },
      // g: a un paso del primer Infinito
      // g: Capa 0 con colores nivel 77: 7,9e307/s, llega de 1e306 a 1,8e308 en 2,3 s y salta la cinemática
      infinito: { ...s0, ...capa0, compresiones: 17, granos: 2.5e7, granosTotales: 9e8, colores: [77, 77, 77, 77], auto: nadaAuto, ...E(306) },
      red: { ...s0, ...mitad11 },
      reliquias: { ...s0, ...mitad11, relicario: { ...mitad11.relicario, pendiente: 25, faltan: 1 } },
      estratos: { ...s0, ...mitad11, energia: D.pow10(481.7), maxEnergia: D.pow10(481.7), estratos: { ...s0.estratos, abiertos: 7, s: [80, 76, 70, 64, 58, 52, 44, 0] } },
      // i: más allá del Infinito, corriendo hacia 1e1000
      romper: { ...s0, ...mitad11, ...E(470) },
      mandala: { ...s0, ...capa0, granos: 2.5e7, granosTotales: 9e8, auto: nadaAuto, ...E(200) },
      titulo: { ...s0, ...capa0, granos: 2.5e7, granosTotales: 9e8, ...E(247.3) },
    }
    const r = {}
    for (const [k, s] of Object.entries(estados)) {
      const vistos = { ...j.yaVisto(s, {}), punado: true, cristales: true, ...Object.fromEntries(['c1_cristales', 'c1_relicario', 'c1_red', 'c1_estratos', 'c1_automat', 'c1_defectos', 'c1_romper', 'reliquia_auto', 'c1_pulido', 'c1_anillo3', 'instalar'].map((x) => [x, true])) }
      r[k] = g.serializar({ estado: s, guardadoEn: 0, vistos, record: 1987654, logros: { granos: true, colores: true, llena: true, infinitoRapido: true } }) // las paletas de crece_*
    }
    return r
  }))
  await p.close()
  return r
}

// ---------- Una página del build de producción con una partida ----------
const SOLO_PILA = `body *{visibility:hidden!important} .pila,.pila *{visibility:visible!important} .avisos{display:none!important} .juego{--pila-radio-max:100vw!important} .pila{--pila-arriba:0px!important;--pila-abajo:0px!important;--fondo-abajo:0px!important;transition:none!important}`

async function abrir(partida, f, { idioma = 'en', ajustes = {}, audio = false } = {}) {
  const ctx = await navegador.newContext({ viewport: VIEW[f], deviceScaleFactor: DPR, isMobile: f === 'v', hasTouch: f === 'v' })
  const p = await ctx.newPage()
  p.real = audio
  p.on('pageerror', (e) => console.log('  error de página:', e.message))
  await p.goto(PROD + 'privacidad.html')
  const guardado = JSON.parse(partida); guardado.guardadoEn = Date.now()
  await p.evaluate(([g, a]) => {
    localStorage.clear()
    for (const k of ['instalar', 'comunidad', 'traer']) localStorage.setItem(`avalancha.${k}`, '1')
    localStorage.setItem('avalancha.ajustes', JSON.stringify(a))
    localStorage.setItem('avalancha.guardado', JSON.stringify(g))
  }, [guardado, { idioma, reducirDestellos: false, calma: false, volumen: 1, volEfectos: 0.9, volMusica: 0, marco: 'ninguno', ...ajustes }])
  // Con el reloj quieto desde antes de cargar: nada se mueve hasta el primer cuadro grabado (las fotos de la pila sí cargan).
  if (!audio) await p.clock.install(), await p.clock.pauseAt(Date.now())
  else await p.addInitScript(capturarAudio)
  await p.goto(PROD)
  await p.waitForTimeout(2500)
  await p.addStyleTag({ content: '.avisos{display:none!important}' })
  return p
}

/** Toca Jugar/Continuar. */
const entrar = async (p) => { await p.keyboard.press('Shift'); await p.evaluate(() => document.querySelector('.titulo button')?.click()); await p.addStyleTag({ content: '.titulo{display:none!important}' }) } // la tecla abre el audio (sonido.ts)

/** Termina de golpe las animaciones de entrada de la interfaz (con el time-lapse lento tardarían varios segundos). */
const sinEntrada = (p) => p.evaluate(() => document.getAnimations().forEach((a) => { try { a.finish() } catch {} }))

/** Corre `seg` segundos de juego sin grabar (en pasos de cuadro: la pila y el worker siguen el ritmo). */
async function adelantar(p, seg) {
  if (p.real) return p.waitForTimeout(seg * 1000)
  for (let t = 0; t < seg * 1000; t += DT) { await p.clock.runFor(DT); await p.waitForTimeout(3) }
}

/** Graba `seg` segundos cuadro por cuadro; `antes(i, t)` corre antes de cada cuadro (acciones con tiempo). `vel`: segundos de juego por segundo de video. */
async function grabar(p, nombre, seg, { antes, vel: velo = 1 } = {}) {
  const dir = resolve(AQUI, 'tomas', nombre)
  rmSync(dir, { recursive: true, force: true })
  mkdirSync(dir, { recursive: true })
  const n = Math.round(seg * FPS)
  const t0 = Date.now()
  for (let i = 0; i < n; i++) {
    if (antes) await antes(i, i / FPS)
    const vel = typeof velo === 'function' ? await velo(p, i) : velo
    // Pasos de 1/60 s como mucho (el bucle del juego y la pila esperan cuadros de ese tamaño).
    const pasos = Math.max(1, Math.round(vel))
    for (let k = 0; k < pasos; k++) {
      await p.clock.runFor((DT * vel) / pasos)
      // Las animaciones CSS no siguen el reloj falso: se pausan y avanzan lo mismo que el juego.
      await p.evaluate((dt) => { for (const a of document.getAnimations()) if (a.playState !== 'finished') { a.pause(); a.currentTime = (a.currentTime ?? 0) + dt } }, (DT * vel) / pasos)
      await p.waitForTimeout(pasos > 1 ? 4 : 12) // el worker de la pila contesta
    }
    await p.screenshot({ path: `${dir}/${String(i).padStart(4, '0')}.jpg`, type: 'jpeg', quality: 94 })
  }
  const mp4 = resolve(AQUI, 'tomas', `${nombre}.mp4`)
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', `${dir}/%04d.jpg`, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '16', '-pix_fmt', 'yuv420p', mp4])
  rmSync(dir, { recursive: true, force: true })
  console.log(`  ${nombre}: ${n} cuadros en ${((Date.now() - t0) / 1000).toFixed(0)} s`)
}

// ---------- Audio: pasada en tiempo real, con la salida del juego grabada (todo nodo que va a los parlantes) ----------
function capturarAudio() {
  const conectar = AudioNode.prototype.connect
  const destinos = new WeakMap()
  window.__audio = []
  AudioNode.prototype.connect = function (dest, ...r) {
    if (dest instanceof AudioDestinationNode) {
      let d = destinos.get(dest.context)
      if (!d) {
        d = dest.context.createMediaStreamDestination()
        destinos.set(dest.context, d)
        const rec = new MediaRecorder(d.stream, { mimeType: 'audio/webm;codecs=opus', audioBitsPerSecond: 256000 })
        rec.ondataavailable = (e) => e.data.size && window.__audio.push(e.data)
        rec.start()
        window.__rec = rec
      }
      conectar.call(this, d)
    }
    return conectar.call(this, dest, ...r)
  }
}
async function grabarAudio(p, nombre, seg, antes, vel = 1) {
  // Las acciones con tiempo, en tiempo real (el audio no puede ir cuadro por cuadro).
  const t0 = Date.now()
  for (let i = 0; i < seg * FPS; i++) {
    if (antes) await antes(i, i / FPS)
    const espera = t0 + ((i + 1) * 1000) / FPS - Date.now()
    if (espera > 0) await p.waitForTimeout(espera)
  }
  const b64 = await p.evaluate(() => new Promise((ok) => {
    if (!window.__rec) return ok('')
    window.__rec.onstop = async () => {
      const buf = await new Blob(window.__audio, { type: 'audio/webm' }).arrayBuffer()
      let s = ''; const u = new Uint8Array(buf)
      for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000))
      ok(btoa(s))
    }
    window.__rec.stop()
  }))
  if (!b64) return console.log(`  ${nombre}: sin audio`)
  const webm = resolve(AQUI, 'tomas', `${nombre}.webm`)
  writeFileSync(webm, Buffer.from(b64, 'base64'))
  // El grabador empezó con el primer sonido; lo que importa es el final: se alinea al final de la pasada.
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-sseof', `-${seg}`, '-i', webm, '-ac', '2', '-ar', '48000', ...(vel !== 1 ? ['-af', `atempo=${vel}`] : []), resolve(AQUI, 'tomas', `${nombre}.wav`)])
  rmSync(webm)
  console.log(`  ${nombre}: audio`)
}

// ---------- Tomas ----------
const rueda = async (p, dy) => { const v = p.viewportSize(); await p.mouse.move(v.width / 2, v.height / 2); await p.mouse.wheel(0, dy) }

const SOLO = async (p) => p.addStyleTag({ content: SOLO_PILA })
const ir = async (p, pantalla) => {
  await p.evaluate(() => document.querySelector('.capas .cristal')?.click()); await adelantar(p, 1.2)
  if (pantalla) await p.evaluate((x) => document.querySelector(`nav.sistemas [data-guia="c1_${x}"]`)?.click(), pantalla), await adelantar(p, 1.5)
}
const TOMAS = {
  // a + b: pantalla negra, cae un grano, después tres más y el cuarto derrumba. Zoom máximo.
  inicio: { seg: 5.5, partida: 'vacia', vel: 1.25, async prep(p) { await SOLO(p); await rueda(p, -4000); await entrar(p) } },
  // c: la pila llena con mucho Caudal (avalanchas por toda la pila); la cámara arranca cerca y se aleja
  avalancha: { seg: 6, partida: 'mandala', async prep(p) { await SOLO(p); await entrar(p); await adelantar(p, 3.4); await rueda(p, -1300) },
    antes: (p, i) => i > 30 && rueda(p, 4.5) },
  // d: time-lapse de una corrida desde 39 granos, con autocompradores
  crece: { seg: 6, partida: 'crece', vel: 20, audio: false, async prep(p) { await SOLO(p); await entrar(p) } },
  ...Object.fromEntries(['brasa', 'glaciar', 'aurora', 'oroViejo'].map((paleta) => [`crece_${paleta}`, { seg: 6, partida: 'crece', vel: 20, audio: false, abrir: { ajustes: { paleta } }, async prep(p) { await SOLO(p); await entrar(p) } }])),
  // e: la interfaz de la Capa 0, de 1e6 a 1e100 (cámara lenta: en el juego tarda 2 s)
  numeros: { texto: true, seg: 5.5, partida: 'numeros', vel: 0.45, audio: false, async prep(p) { await entrar(p); await p.waitForTimeout(100); await sinEntrada(p) } },
  // f: una Compresión (tecla C)
  comprimir: { texto: true, seg: 5, partida: 'comprimir', async prep(p) { await SOLO(p); await entrar(p); await adelantar(p, 3.4) },
    antes: (p, i) => i === 40 && p.keyboard.press('c') },
  // g: el primer Infinito, con su cinemática
  // La subida, en cámara lenta (llega en ~0,2 s de juego); desde el ∞, la cinemática a velocidad casi normal.
  infinito: { texto: true, seg: 8, partida: 'infinito', audio: false, vel: async (p) => (await p.evaluate(() => !!document.querySelector('.energia.infinito'))) ? 0.4 : 0.06,
    async prep(p) { await entrar(p); await p.waitForTimeout(100); await sinEntrada(p) } },
  // h: Cristalización
  red: { texto: true, seg: 5, partida: 'red', async prep(p) { await entrar(p); await adelantar(p, 3.4); await ir(p, 'red') } },
  reliquias: { texto: true, seg: 5, partida: 'reliquias', async prep(p) { await entrar(p); await adelantar(p, 3.4) } },
  estratos: { texto: true, seg: 6, partida: 'estratos', async prep(p) { await entrar(p); await adelantar(p, 3.4); await ir(p, 'estratos') } },
  defectos: { texto: true, seg: 4, partida: 'estratos', async prep(p) { await entrar(p); await adelantar(p, 3.4); await ir(p, 'defectos') } },
  // i: más allá del Infinito, de 1e470 a 1e1000 (en el juego tarda 1 s)
  // De 1e470 a 1e938 tarda 0,05 s de juego y después se frena: cámara lenta extrema hasta 1e900, después ×0,3 hasta pasar 1e1000.
  romper: { texto: true, seg: 6, partida: 'romper', audio: false, async prep(p) { await entrar(p); await p.waitForTimeout(100); await sinEntrada(p) },
    vel: async (p) => (await p.evaluate(() => +(document.querySelector('.energia')?.textContent.split('e')[1] ?? 0))) < 900 ? 0.006 : 0.3 },
  // Música de fondo: la generativa del juego (sonido.ts), sola, con la pila llena de cuatro colores. Solo audio, en tiempo real.
  musica: { seg: 55, partida: 'mandala', soloAudio: true, abrir: { ajustes: { volMusica: 1, volEfectos: 0 } }, async prep(p) { await entrar(p) } },
  // j: la pantalla de título del juego, sin el botón
  titulo: { seg: 9, partida: 'titulo', async prep(p) { await p.addStyleTag({ content: '.titulo button{visibility:hidden!important}' }) } },
}

const partidas = await armarPartidas()
mkdirSync(resolve(AQUI, 'tomas'), { recursive: true })
for (const nombre of pedidas.length ? pedidas : Object.keys(TOMAS)) {
  const t = TOMAS[nombre]
  for (const f of formatos) for (const idioma of t.texto ? ['en', 'es'] : ['en']) {
    if (args.includes('--es') && idioma !== 'es') continue
    const id = t.texto ? `${nombre}_${idioma}_${f}` : `${nombre}_${f}`
    console.log(id)
    if (t.soloAudio) {
      const pa = await abrir(partidas[t.partida], f, { ...t.abrir, audio: true })
      await t.prep(pa, f)
      await grabarAudio(pa, nombre, t.seg)
      await pa.context().close()
      continue
    }
    const p = await abrir(partidas[t.partida], f, { ...t.abrir, idioma })
    await t.prep(p, f)
    await grabar(p, id, t.seg, { vel: t.vel, antes: t.antes && ((i, s) => t.antes(p, i, s)) })
    await p.context().close()
    if (t.audio !== false && f === 'v' && idioma === 'en' && !args.includes('--sin-audio')) {
      const pa = await abrir(partidas[t.partida], f, { ...t.abrir, audio: true })
      await t.prep(pa, f)
      await grabarAudio(pa, nombre, t.seg * (t.vel ?? 1), t.antes && ((i, s) => t.antes(pa, i, s)), t.vel ?? 1)
      await pa.context().close()
    }
  }
}
await navegador.close()
