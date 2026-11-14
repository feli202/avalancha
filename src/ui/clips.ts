// Modo grabación (solo desarrollo, panel de debug): clips verticales de 1080×1920 para TikTok, Reels y Shorts.
// Cada clip es un guion: el estado de la pila y la cámara salen del tiempo, así que se repite igual cada vez.
// Se graba un canvas 2D que compone la pila (WebGL) con los textos y efectos, más el audio del juego (Web Audio);
// el servidor de Vite lo pasa a MP4 H.264 en marketing/clips/ (vite.config.ts). La economía no se toca.
import FOTOS from '../assets/pilas.json'
import { COLORES_PILA, PALETAS, css } from '../render/paletas'
import { RITMO_MAX, type PilaVisual } from '../render/pilaVisual'
import { txt } from '../strings'
import { en } from '../strings/en'
import { es } from '../strings/es'
import { grabacion } from './grabacion'
import { juego } from './juego.svelte'
import * as sonido from './sonido'

const W = 1080, H = 1920, FPS = 60
// Zona segura de 9:16: las apps tapan ~250 px arriba, ~480 abajo (botones y descripción) y ~120 a la derecha.
const ARRIBA = 330 // centro de la primera línea de texto
const ANCHO_TEXTO = 800 // centrado: de x = 140 a 940
const CIERRE = 2 // s con el nombre del juego antes del empalme
const EMPALME = 0.5 // s finales: funde hacia el primer cuadro, así el clip se repite sin corte
const PREVIA = 1.2 // s sin grabar antes de cada clip: la pila carga su foto
const FUENTE = "'Space Grotesk', system-ui, sans-serif"
const TINTA = '#e8e9f3', FONDO = '#07080f'
const LLENA = FOTOS.granos[FOTOS.granos.length - 1]
const BRILLO = [0.55, 0.55, 0.55, 0.55] // colores de una partida avanzada

type Textos = typeof es
interface Escena {
  granos: number; caudal?: number; zoom?: number; ritmo?: number
  /** El disco de la pila escalado, girado y aclarado (implosión, colapso, transiciones). */
  disco?: { escala: number; giro: number; brillo?: number }
}
interface C {
  t: number; dura: number; x: Textos; pila: PilaVisual; g: CanvasRenderingContext2D
  /** Radio de la pila en px del clip. */
  radio: number
  /** true en el único cuadro en que t cruza `s` (disparar sonidos y avalanchas una vez). */
  pasa: (s: number) => boolean
  memo: Record<string, unknown>
}
interface Clip { id: string; dura: number; escena: (c: C) => Escena; dibujar: (c: C) => void }

const clamp = (k: number) => Math.min(1, Math.max(0, k))
const suave = (k: number) => (k = clamp(k), k * k * (3 - 2 * k))
/** De `a` a `b` en escala logarítmica (los granos crecen como en el juego). */
const exp = (a: number, b: number, k: number) => Math.round(a * (b / a) ** clamp(k))

/**
 * Texto grande centrado, con un salto suave al aparecer; `desde`/`hasta` en s. Corta en líneas de ANCHO_TEXTO.
 * Devuelve la y del renglón siguiente (aunque todavía no se vea), para apilar textos sin que se pisen.
 */
function texto(c: C, s: string, y: number, desde: number, hasta = Infinity, o: { tam?: number; peso?: number; color?: string; sombra?: boolean } = {}) {
  const { g, t } = c
  const tam = o.tam ?? 96
  g.save()
  g.font = `${o.peso ?? 700} ${tam}px ${FUENTE}`
  const lineas: string[] = []
  for (const p of s.split(' ')) {
    const l = lineas.length ? `${lineas[lineas.length - 1]} ${p}` : p
    if (lineas.length && g.measureText(l).width <= ANCHO_TEXTO) lineas[lineas.length - 1] = l
    else lineas.push(p)
  }
  // Lo que arranca en t = 0 ya está en el primer cuadro (el gancho, y el empalme del final cae sobre él).
  const entra = desde <= 0 ? 1 : clamp((t - desde) / 0.25)
  const a = Math.min(entra, clamp((hasta - t) / 0.25))
  if (a > 0) {
    g.globalAlpha = a
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    g.fillStyle = o.color ?? TINTA
    if (o.sombra !== false) (g.shadowColor = 'rgb(7 8 15 / 0.95)'), (g.shadowBlur = tam * 0.4)
    const sube = desde <= 0 ? 0 : 40 * (1 - suave((t - desde) / 0.35)) ** 2
    lineas.forEach((l, i) => g.fillText(l, W / 2, y + sube + i * tam * 1.1))
  }
  g.restore()
  return y + lineas.length * tam * 1.1
}

/** El nombre del juego al final; `claro`: sobre la pantalla blanca del Infinito. */
function cierre(c: C, claro = false, y = 900) {
  const desde = c.dura - EMPALME - CIERRE
  const a = clamp((c.t - desde) / 0.4)
  if (a <= 0) return
  if (!claro) (c.g.fillStyle = `rgb(7 8 15 / ${0.65 * a})`), c.g.fillRect(0, 0, W, H)
  c.g.letterSpacing = '0.14em'
  texto(c, c.x.titulo.toUpperCase(), y, desde, Infinity, { tam: 140, color: claro ? FONDO : TINTA, sombra: !claro })
  c.g.letterSpacing = '0px'
  texto(c, c.x.clips.lema, y + 130, desde + 0.3, Infinity, { tam: 50, peso: 400, color: claro ? 'rgb(7 8 15 / 0.7)' : 'rgb(232 233 243 / 0.8)', sombra: !claro })
}

/** Destello blanco que sale del centro (la Compresión del juego); p de 0 a 1. */
function destello(g: CanvasRenderingContext2D, p: number) {
  if (p <= 0 || p >= 1) return
  const r = 2400 * (0.2 + 0.8 * p)
  const d = g.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, r)
  d.addColorStop(0, '#fff')
  d.addColorStop(0.04, 'rgb(255 255 255 / 0.9)')
  d.addColorStop(0.18, 'rgb(255 255 255 / 0.25)')
  d.addColorStop(0.45, 'rgb(255 255 255 / 0)')
  g.save()
  g.globalAlpha = p < 0.2 ? p / 0.2 : 1 - (p - 0.2) / 0.8
  g.fillStyle = d
  g.fillRect(0, 0, W, H)
  g.restore()
}

/** Remolino de los cuatro colores que se cierra con la implosión; e de 0 a 1. */
function remolino(c: C, e: number) {
  if (e <= 0 || e >= 1) return
  const { g } = c
  const cono = g.createConicGradient(e * 9.4, W / 2, H / 2)
  COLORES_PILA.forEach((col, i) => cono.addColorStop(i / 4, css(col)))
  cono.addColorStop(1, css(COLORES_PILA[0]))
  g.save()
  g.globalCompositeOperation = 'screen'
  g.globalAlpha = clamp(e * 5)
  g.filter = 'blur(10px)'
  g.strokeStyle = cono
  g.lineWidth = c.radio * 0.35 * (1 - 0.9 * e)
  g.beginPath()
  g.arc(W / 2, H / 2, c.radio * 1.15 * (1 - 0.97 * e), 0, Math.PI * 2)
  g.stroke()
  g.restore()
}

/** Implosión de la Compresión (0,9 s desde `t0`): el disco gira, se achica y se enciende. */
function implosion(t: number, t0: number): Escena['disco'] {
  const e = clamp((t - t0) / 0.9) ** 2.2
  return { escala: 1 - 0.98 * e, giro: 2.1 * e, brillo: 1 + 2 * e }
}

// --- Infinito: tres compresiones rápidas, la última pila, el blanco, el colapso y la pantalla blanca ---
const CICLO = 2.4, LLENAR = 1.2, CICLOS = 3
const FINAL = CICLO * CICLOS // la última pila se llena
const BLANCO = FINAL + 1.4 // el blanco crece 2 s desde el centro
const COLAPSO = BLANCO + 2 // y colapsa en 0,8 s
const PANTALLA = COLAPSO + 0.8

const CLIPS: Clip[] = [
  {
    id: 'regla', dura: 15,
    // Un grano cada 0,6 s (el cuarto derrumba) y después timelapse hasta la pila llena; la cámara se aleja.
    escena: ({ t }) => ({
      granos: t < 2.4 ? 1 + Math.floor(t / 0.6) : exp(5, LLENA, (t - 2.4) / 10),
      zoom: (1 + 3 * (1 - suave((t - 2.2) / 4))) * (1 - 0.12 * suave((t - 9) / 4)),
    }),
    dibujar: (c) => {
      const y = texto(c, c.x.clips.regla[0], ARRIBA, 0)
      texto(c, c.x.clips.regla[1], y, 1.2, Infinity, { tam: 72, peso: 500 })
      cierre(c)
    },
  },
  {
    id: 'avalancha', dura: 10,
    // Pila llena: una tanda de granos de golpe en el centro, y otra en cámara lenta mientras la cámara se acerca.
    escena: (c) => {
      for (const s of [0.15, 4]) if (c.pasa(s)) c.pila.echar(RITMO_MAX), sonido.avalancha(1000)
      return { granos: LLENA, caudal: 120, ritmo: 1 - 0.8 * suave((c.t - 3.4) / 0.6), zoom: 1 + 0.18 * suave((c.t - 3.6) / 4.5) }
    },
    dibujar: (c) => {
      const y = texto(c, c.x.clips.avalancha[0], ARRIBA, 0, 3.2)
      texto(c, c.x.clips.avalancha[1], y, 0.8, 3.2, { tam: 72, peso: 500 })
      texto(c, c.x.clips.avalancha[2], ARRIBA, 4.3)
      cierre(c)
    },
  },
  {
    id: 'compresion', dura: 8,
    // La pila llena implota (0,4–1,3 s), destello, y renace de cero hasta llenarse otra vez.
    escena: (c) => {
      if (c.pasa(0.4)) sonido.compresion(900)
      if (c.t < 1.3) return { granos: LLENA, caudal: 300, disco: implosion(c.t, 0.4) }
      return { granos: c.t < 1.5 ? 0 : exp(1000, LLENA, (c.t - 1.5) / 3.8), caudal: 300 }
    },
    dibujar: (c) => {
      remolino(c, clamp((c.t - 0.4) / 0.9))
      destello(c.g, (c.t - 1.2) / 0.7)
      texto(c, c.x.clips.compresion[0], ARRIBA, 0, 1.2)
      const y = texto(c, c.x.clips.compresion[1], ARRIBA, 1.9)
      texto(c, c.x.clips.compresion[2], y, 2.7, Infinity, { tam: 72, peso: 500 })
      cierre(c)
    },
  },
  {
    id: 'infinito', dura: 15,
    escena: (c) => {
      const { t } = c
      for (let i = 0; i < CICLOS; i++) if (c.pasa(i * CICLO + LLENAR + 0.2)) sonido.compresion(900)
      if (c.pasa(BLANCO)) sonido.infinito(2.8, 1)
      if (t < FINAL) {
        const u = t % CICLO
        if (u < LLENAR + 0.2) return { granos: exp(3000, LLENA, u / LLENAR), caudal: 300 }
        return { granos: LLENA, caudal: 300, disco: implosion(u, LLENAR + 0.2) }
      }
      const granos = exp(3000, LLENA, (t - FINAL) / LLENAR)
      return { granos, caudal: 300, disco: t > COLAPSO ? { escala: 1 - clamp((t - COLAPSO) / 0.8) ** 3, giro: 0 } : undefined }
    },
    dibujar: (c) => {
      const { g, t } = c
      for (let i = 0; i < CICLOS; i++) {
        remolino(c, clamp((t - i * CICLO - LLENAR - 0.2) / 0.9))
        destello(g, (t - i * CICLO - LLENAR - 1) / 0.7)
        texto(c, c.x.clips.infinito.compresion(15 + i), ARRIBA, i * CICLO, (i + 1) * CICLO - 0.15)
      }
      if (t > BLANCO && t < PANTALLA) {
        // Blanco desde el centro hacia afuera; colapsa junto con la pila.
        const r = c.radio * 1.06 * suave((t - BLANCO) / 2) * (1 - clamp((t - COLAPSO) / 0.8) ** 3)
        if (r > 1) {
          const b = g.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, r)
          b.addColorStop(0, '#fff')
          b.addColorStop(0.78, '#fff')
          b.addColorStop(0.93, 'rgb(255 255 255 / 0.6)')
          b.addColorStop(1, 'rgb(255 255 255 / 0)')
          g.save()
          g.shadowColor = 'rgb(255 255 255 / 0.5)'
          g.shadowBlur = 60
          g.fillStyle = b
          g.fillRect(0, 0, W, H)
          g.restore()
        }
      }
      if (t >= PANTALLA) {
        g.fillStyle = `rgb(255 255 255 / ${clamp((t - PANTALLA) / 0.15)})`
        g.fillRect(0, 0, W, H)
        texto(c, '∞', 620, PANTALLA + 0.1, Infinity, { tam: 300, peso: 300, color: FONDO, sombra: false })
        const y = texto(c, c.x.clips.infinito.fin, 840, PANTALLA + 0.5, Infinity, { tam: 72, peso: 600, color: FONDO, sombra: false })
        cierre(c, true, Math.max(1110, y + 120))
      }
    },
  },
  {
    id: 'unica', dura: 12,
    // Cuatro mandalas (tamaños y paletas de los logros) que se suceden con un golpe de luz; el disco gira despacio.
    escena: (c) => {
      const i = Math.min(3, Math.floor(c.t / 2.5))
      const [granos, paleta] = ([[30_000, 'brasa'], [100_000, 'glaciar'], [300_000, 'aurora'], [LLENA, 'oroViejo']] as const)[i]
      if (c.memo.i !== i) (c.memo.i = i), (c.pila.paleta = PALETAS[paleta])
      const golpe = i ? 1 - suave((c.t - i * 2.5) / 0.5) : 0
      return { granos, caudal: 200, disco: { escala: 1 + 0.12 * golpe, giro: 0.12 * c.t } }
    },
    dibujar: (c) => {
      for (const i of [1, 2, 3]) destello(c.g, (c.t - i * 2.5 + 0.1) / 0.5)
      const y = texto(c, c.x.clips.unica[0], ARRIBA, 0)
      texto(c, c.x.clips.unica[1], y, 1, Infinity, { tam: 72, peso: 500 })
      cierre(c)
    },
  },
]
export const IDS = CLIPS.map((c) => c.id)

let g: CanvasRenderingContext2D
let lienzo: HTMLCanvasElement, fondo: HTMLCanvasElement, primer: HTMLCanvasElement, pc: HTMLCanvasElement

function canvas1080() {
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  return c
}

/** La pila (y el disco transformado sobre el fondo vacío) en el lienzo del clip. */
function componer(e: Escena, c: C) {
  g.globalAlpha = 1
  g.filter = 'none'
  const d = e.disco
  if (!d) return void g.drawImage(pc, 0, 0, W, H)
  g.drawImage(fondo, 0, 0)
  g.save()
  g.translate(W / 2, H / 2)
  g.rotate(d.giro)
  g.scale(d.escala, d.escala)
  g.beginPath()
  g.arc(0, 0, c.radio + 12, 0, Math.PI * 2)
  g.clip()
  if (d.brillo) g.filter = `brightness(${d.brillo}) saturate(${1 + 0.3 * (d.brillo - 1)})`
  g.drawImage(pc, -W / 2, -H / 2, W, H)
  g.restore()
}

/**
 * Corre un clip cuadro a cuadro: `previa` s quieto en t = 0, de 0 a su duración y COLA s más en el último cuadro.
 * Con `rec` graba todo eso (el grabador pierde cuadros al arrancar y al parar) y devuelve en qué segundo de la
 * grabación empieza el clip: ffmpeg corta desde ahí.
 */
const COLA = 0.6
function correr(clip: Clip, x: Textos, previa: number, rec?: MediaRecorder) {
  const pila = grabacion.pila!
  let enPrevia = true, antes = -1, inicio = 0
  const desde = performance.now()
  const finPrevia = desde + previa * 1000
  rec?.start()
  const c: C = { t: 0, dura: clip.dura, x, pila, g, radio: 0, memo: {}, pasa: (s) => !enPrevia && antes < s && s <= c.t }
  return new Promise<number>((listo) => {
    grabacion.cuadro = (ms) => {
      if (enPrevia && ms >= finPrevia) (enPrevia = false), (inicio = ms)
      if (!enPrevia && ms - inicio >= (clip.dura + COLA) * 1000) return void ((grabacion.cuadro = () => {}), listo((inicio - desde) / 1000))
      c.t = enPrevia ? 0 : Math.min(clip.dura, (ms - inicio) / 1000)
      c.radio = (pila.radioCss * W) / (pc.clientWidth || 1)
      const e = clip.escena(c)
      pila.ritmo = e.ritmo ?? 1
      pila.zoom = e.zoom ?? 1
      pila.cuadro(ms, e.granos, e.caudal ?? 0, BRILLO)
      componer(e, c)
      clip.dibujar(c)
      if (enPrevia) return
      if (antes < 0) primer.getContext('2d')!.drawImage(lienzo, 0, 0)
      const f = (c.t - (clip.dura - EMPALME)) / EMPALME
      if (f > 0) (g.globalAlpha = clamp(f)), g.drawImage(primer, 0, 0), (g.globalAlpha = 1)
      antes = c.t
    }
  })
}

const espera = (s: number) => new Promise((r) => setTimeout(r, s * 1000))
const tipo = () => ['video/webm;codecs=h264,opus', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus'].find((t) => MediaRecorder.isTypeSupported(t))

/** Graba los clips pedidos en español y en inglés, los manda a convertir y recarga (la partida no se tocó). */
export async function grabarClips(ids: string[]) {
  const pila = grabacion.pila
  if (!pila) return
  pc = document.querySelector<HTMLCanvasElement>('.pila canvas')!
  // La pila de pantalla en 1080×1920 px reales (se sale de la ventana; no importa, se ve el lienzo del clip).
  const caja = pc.parentElement!
  Object.assign(caja.style, { inset: '0 auto auto 0', width: `${W / devicePixelRatio}px`, height: `${H / devicePixelRatio}px`, transition: 'none' })
  caja.querySelector<HTMLElement>('.tope')!.style.display = 'none'
  lienzo = canvas1080()
  fondo = canvas1080()
  primer = canvas1080()
  g = lienzo.getContext('2d')!
  // La vista previa tapa toda la interfaz.
  Object.assign(lienzo.style, { position: 'fixed', inset: '0', width: '100%', height: '100%', objectFit: 'contain', background: '#000', zIndex: '100' })
  const estado = document.createElement('p')
  Object.assign(estado.style, { position: 'fixed', left: '1rem', top: '1rem', zIndex: '101', margin: '0', fontSize: '0.85rem' })
  document.body.append(lienzo, estado)

  juego.velocidad = 0 // la economía espera: el guion no la usa y la partida queda como estaba
  pila.radioMax = Infinity
  pila.destellos = false
  pila.ahorro = false
  pila.efecto = 0
  sonido.fondo(4)
  await document.fonts.load(`700 96px ${FUENTE}`)
  const audio = sonido.salida()
  // El fondo vacío (detrás del disco cuando implota o gira): la pila sin granos.
  await correr({ id: 'fondo', dura: 0.3, escena: () => ({ granos: 0 }), dibujar: () => {} }, es, 0.5)
  fondo.getContext('2d')!.drawImage(lienzo, 0, 0)

  // El Infinito al final: su sonido calla la música unos 10 s.
  const lista = ids.map((id) => CLIPS.find((c) => c.id === id)!).sort((a, b) => +(a.id === 'infinito') - +(b.id === 'infinito'))
    .flatMap((clip) => (['es', 'en'] as const).map((l) => ({ clip, l })))
  try {
    for (const [i, { clip, l }] of lista.entries()) {
      // A veces el grabador se queda sin cuadros a mitad de camino (el servidor revisa el largo): se graba otra vez.
      for (let intento = 1; ; intento++) {
        if (i && lista[i - 1].clip.id === 'infinito') await espera(10)
        estado.textContent = txt.debug.grabando(i + 1, lista.length, `${clip.id}-${l}`)
        pila.paleta = COLORES_PILA
        const video = lienzo.captureStream(FPS).getVideoTracks()
        const rec = new MediaRecorder(new MediaStream([...video, ...(audio?.getAudioTracks() ?? [])]), { mimeType: tipo(), videoBitsPerSecond: 24e6, audioBitsPerSecond: 192e3 })
        const partes: Blob[] = []
        rec.ondataavailable = (e) => partes.push(e.data)
        const parado = new Promise((r) => (rec.onstop = r))
        const desde = await correr(clip, l === 'es' ? es : en, PREVIA, rec)
        rec.stop()
        await parado
        video.forEach((v) => v.stop())
        estado.textContent = txt.debug.convirtiendo
        const r = await fetch(`/__clip?nombre=${clip.id}-${l}&dura=${clip.dura}&desde=${desde.toFixed(3)}`, { method: 'POST', body: new Blob(partes, { type: rec.mimeType }) })
        if (r.ok) break
        const error = await r.text()
        if (r.status !== 409 || intento >= 3) throw new Error(error)
        console.warn(error)
      }
    }
  } catch (e) {
    console.error(e)
    estado.textContent = txt.debug.falloClip(String(e))
    return // queda a la vista; recargar a mano
  }
  estado.textContent = txt.debug.grabado(lista.length)
  await espera(1.5)
  location.replace(location.pathname) // sin ?grabar, que no vuelva a empezar
}
