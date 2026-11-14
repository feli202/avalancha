// Sonido (SPEC 6.7): todo sintetizado con Web Audio, sin archivos. Todo lo tonal usa la misma escala (ESCALA).
import { ajustes } from './ajustes.svelte'

const VOCES_MAX = 12 // derrumbes y golpes a la vez (SPEC 6.7); compras, acordes y música no cuentan
const JUNTAR_MS = 50 // los derrumbes de este lapso suenan como uno
const GOLPE_CADA_MS = 1500 // golpes graves: como mucho uno por lapso
const RAIZ = 146.83 // Re3
const ESCALA = [0, 2, 4, 7, 9] // pentatónica mayor: cualquier combinación de notas consuena
/** Grado de la escala por compra; en una octava alta. */
const GRADO_COMPRA: Record<string, number> = { caudal: 0, ambar: 1, coral: 2, jade: 3, violeta: 4, other: 5 }

/** Frecuencia de un grado de la escala (0 = Re3; 5 = Re4; negativos, más grave). */
export function nota(grado: number) {
  const o = Math.floor(grado / ESCALA.length)
  return RAIZ * 2 ** ((ESCALA[grado - o * ESCALA.length] + 12 * o) / 12)
}

let ctx: AudioContext | null = null
let general: GainNode, efectos: GainNode, musica: GainNode, eco: GainNode
let arena: AudioBuffer
let voces = 0
let capas = 0

/** Un AudioContext solo arranca después de un gesto: se crea con el primer toque o tecla. */
function abrir() {
  if (ctx) return void ctx.resume()
  const c = (ctx = new AudioContext())
  // Un limitador suave al final: muchas cosas a la vez nunca saturan.
  const lim = c.createDynamicsCompressor()
  lim.threshold.value = -12
  lim.ratio.value = 6
  lim.connect(c.destination)
  limitador = lim
  general = c.createGain()
  general.connect(lim)
  efectos = c.createGain()
  musica = c.createGain()
  efectos.connect(general)
  musica.connect(general)
  // Reverberación de una sala grande, con una respuesta de ruido que decae (generada, no grabada).
  const rev = c.createConvolver()
  const largo = c.sampleRate * 3.5
  const ir = c.createBuffer(2, largo, c.sampleRate)
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch)
    for (let i = 0; i < largo; i++) d[i] = (Math.random() * 2 - 1) * Math.exp((-4 * i) / largo)
  }
  rev.buffer = ir
  eco = c.createGain()
  eco.gain.value = 0.35
  eco.connect(rev).connect(general)
  arena = granos(c)
  aplicarVolumen()
  fondo(capas)
  setInterval(componer, 500)
}
addEventListener('pointerdown', abrir)
addEventListener('keydown', abrir)
document.addEventListener('visibilitychange', () => ctx && (document.hidden ? ctx.suspend() : ctx.resume()))

let limitador: DynamicsCompressorNode
/** Modo grabación: la salida del juego como MediaStream (null si el audio todavía no arrancó). */
export function salida(): MediaStream | null {
  if (!ctx) return null
  const d = ctx.createMediaStreamDestination()
  limitador.connect(d)
  return d.stream
}

export function aplicarVolumen() {
  if (!ctx) return
  general.gain.value = ajustes.volumen
  efectos.gain.value = ajustes.volEfectos
  musica.gain.value = ajustes.volMusica
}

const listo = () => ctx !== null && ctx.state === 'running'
const azar = (a: number, b: number) => a + Math.random() * (b - a)

/** 4 s de chasquidos sueltos y suavizados: la textura de la arena. Se toca en trozos al azar, así nunca suena igual. */
function granos(c: AudioContext) {
  const b = c.createBuffer(1, c.sampleRate * 4, c.sampleRate)
  const d = b.getChannelData(0)
  let y = 0, z = 0, prev = 0
  for (let i = 0; i < d.length; i++) {
    const x = Math.random() < 0.006 ? (Math.random() * 2 - 1) * Math.random() : 0
    y = y * 0.55 + x // cada grano: un golpecito que se apaga en unas muestras
    z = 0.995 * (z + y - prev) // sin continua
    prev = y
    d[i] = z
  }
  return b
}

/** Envolvente de percusión en `g`: sube en `ataque` y se apaga en `cola` segundos. */
function envolvente(g: GainNode, t: number, pico: number, ataque: number, cola: number) {
  g.gain.setValueAtTime(0, t)
  g.gain.linearRampToValueAtTime(pico, t + ataque)
  g.gain.setTargetAtTime(0, t + ataque, cola / 4)
}

/** Una voz de los derrumbes o los golpes; devuelve false si ya hay VOCES_MAX sonando. */
function voz(nodo: AudioScheduledSourceNode, dura: number) {
  if (voces >= VOCES_MAX) return false
  voces++
  nodo.onended = () => voces--
  // la arena empieza en un punto al azar: nunca suena igual
  if (nodo instanceof AudioBufferSourceNode) nodo.start(0, azar(0, Math.max(0, nodo.buffer!.duration - dura)))
  else nodo.start()
  nodo.stop(ctx!.currentTime + dura)
  return true
}

let pendiente = 0
/** Una avalancha (en derrumbes); las de un mismo lapso se suman. Más grande: más larga, más fuerte y más grave. */
export function derrumbe(n: number) {
  if (n <= 0 || !listo()) return
  if (!pendiente) setTimeout(() => { arenita(pendiente); pendiente = 0 }, JUNTAR_MS)
  pendiente += n
}

function arenita(n: number) {
  if (voces >= VOCES_MAX) return // sin voces libres, ni se arman los nodos (M16)
  const c = ctx!
  const t = Math.min(1, Math.log10(n + 1) / 5) // 0 = un derrumbe, 1 = 100.000
  const dura = 0.06 + 0.9 * t
  const src = c.createBufferSource()
  src.buffer = arena
  src.playbackRate.value = azar(0.85, 1.15) * (1.2 - 0.5 * t)
  const f = c.createBiquadFilter()
  f.type = 'bandpass'
  f.frequency.value = azar(0.9, 1.1) * (2600 - 1700 * t) // cálido: nunca agudo
  f.Q.value = 0.7
  const g = c.createGain()
  envolvente(g, c.currentTime, 0.25 + 0.75 * t, 0.004 + 0.04 * t, dura)
  src.connect(f).connect(g).connect(efectos)
  if (t > 0.5) g.connect(eco)
  voz(src, dura + 0.1)
}

let ultimoGolpe = -Infinity
/** Avalancha grande (pilaVisual: muchas veces la promedio): golpe grave con cola larga. */
export function avalancha(veces: number) {
  if (!listo() || performance.now() - ultimoGolpe < GOLPE_CADA_MS) return
  ultimoGolpe = performance.now()
  const c = ctx!
  const t0 = c.currentTime
  const fuerza = Math.min(1, Math.log10(veces) / 3)
  // El cuerpo: un seno que cae de tono.
  const o = c.createOscillator()
  o.frequency.setValueAtTime(nota(-5) * 0.75, t0) // ~55 Hz
  o.frequency.exponentialRampToValueAtTime(nota(-10) * 0.75, t0 + 1.2)
  const g = c.createGain()
  envolvente(g, t0, 0.5 + 0.4 * fuerza, 0.015, 3)
  o.connect(g).connect(efectos)
  g.connect(eco)
  // El retumbe: arena muy filtrada, lenta.
  const r = c.createBufferSource()
  r.buffer = arena
  r.playbackRate.value = 0.25
  r.loop = true
  const f = c.createBiquadFilter()
  f.type = 'lowpass'
  f.frequency.value = 300
  const gr = c.createGain()
  envolvente(gr, t0, 1.2 + fuerza, 0.05, 4)
  r.connect(f).connect(gr).connect(efectos)
  gr.connect(eco)
  if (voz(o, 3.5)) voz(r, 4.5)
}

/** Campana cristalina: parciales inarmónicos que se apagan rápido, los agudos antes. */
function campana(frec: number, cuando: number, vol: number, largo = 1.6, salida: AudioNode = efectos) {
  const c = ctx!
  for (const [razon, peso] of [[1, 1], [2.76, 0.35], [5.4, 0.15], [8.93, 0.06]]) {
    const o = c.createOscillator()
    o.frequency.value = frec * razon
    const g = c.createGain()
    envolvente(g, cuando, vol * peso, 0.003, largo / razon ** 0.6)
    o.connect(g).connect(salida)
    g.connect(eco)
    o.start(cuando)
    o.stop(cuando + largo + 0.5)
  }
}

/** Nota suave de acorde (dos triangulares apenas desafinadas). */
function tono(frec: number, cuando: number, vol: number, largo: number, salida: AudioNode = efectos) {
  const c = ctx!
  const g = c.createGain()
  envolvente(g, cuando, vol, 0.03, largo)
  g.connect(salida)
  g.connect(eco)
  for (const d of [-4, 4]) {
    const o = c.createOscillator()
    o.type = 'triangle'
    o.frequency.value = frec
    o.detune.value = d
    o.connect(g)
    o.start(cuando)
    o.stop(cuando + largo + 0.5)
  }
}

/** Compra a mano: una campana por color, en su grado de la escala. */
export function compra(id: string) {
  if (!listo()) return
  campana(nota(10 + (GRADO_COMPRA[id] ?? 5)) * azar(0.998, 1.002), ctx!.currentTime, 0.18)
}

/** Acordes breves: arpegio rápido de notas de la escala. */
const ACORDES = { milestone: [5, 7, 9], ring: [3, 5, 8, 10], color: [0, 5, 7, 9, 12] }
export function hito(cual: keyof typeof ACORDES) {
  if (!listo()) return
  const t = ctx!.currentTime
  ACORDES[cual].forEach((g, i) => {
    tono(nota(g), t + i * 0.06, 0.12, 2.2)
    campana(nota(g + 5), t + i * 0.06, 0.05, 1.2)
  })
}

/** Compresión: implosión que baja de tono durante `ms` y un acorde de recompensa al final. */
export function compresion(ms: number) {
  if (!listo()) return
  const c = ctx!
  const t0 = c.currentTime
  const t1 = t0 + ms / 1000
  const o = c.createOscillator()
  o.type = 'sawtooth'
  o.frequency.setValueAtTime(nota(5), t0)
  o.frequency.exponentialRampToValueAtTime(nota(-10), t1)
  const r = c.createBufferSource()
  r.buffer = arena
  r.loop = true
  r.playbackRate.setValueAtTime(2, t0)
  r.playbackRate.exponentialRampToValueAtTime(0.3, t1)
  const f = c.createBiquadFilter()
  f.type = 'lowpass'
  f.frequency.setValueAtTime(4000, t0)
  f.frequency.exponentialRampToValueAtTime(120, t1)
  const g = c.createGain()
  g.gain.setValueAtTime(0.05, t0)
  g.gain.linearRampToValueAtTime(0.5, t1 - 0.05) // se cierra sobre sí misma
  g.gain.linearRampToValueAtTime(0, t1)
  o.connect(f)
  r.connect(f)
  f.connect(g).connect(efectos)
  for (const n of [o, r]) { n.start(t0); n.stop(t1 + 0.05) }
  for (const [i, gr] of [0, 2, 4, 5, 7].entries()) {
    tono(nota(gr), t1 + i * 0.05, 0.13, 3)
    campana(nota(gr + 10), t1 + 0.1 + i * 0.08, 0.06, 2)
  }
}

let silencioHasta = 0
/** Infinito (SPEC 6.6): crescendo durante el blanco y el colapso, un segundo de silencio y el acorde final. */
export function infinito(crece: number, silencio: number) {
  if (!listo()) return
  const c = ctx!
  const t0 = c.currentTime
  const t1 = t0 + crece
  const t2 = t1 + silencio
  silencioHasta = performance.now() + (crece + silencio + 6) * 1000
  musica.gain.setTargetAtTime(0, t0, crece / 3)
  efectos.gain.cancelScheduledValues(t0)
  efectos.gain.setValueAtTime(ajustes.volEfectos, t0)
  efectos.gain.setValueAtTime(0, t1) // todo lo demás calla con el colapso
  efectos.gain.setValueAtTime(ajustes.volEfectos, t2 - 0.01)
  const g = c.createGain()
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(0.5, t1)
  g.gain.setValueAtTime(0, t1)
  g.connect(general)
  for (const [i, gr] of [-5, 0, 2, 4, 7, 9, 12].entries()) {
    const o = c.createOscillator()
    o.type = 'sawtooth'
    o.frequency.setValueAtTime(nota(gr), t0)
    o.frequency.exponentialRampToValueAtTime(nota(gr + 5), t1) // sube una octava
    o.detune.value = (i % 2 ? 1 : -1) * 6
    const f = c.createBiquadFilter()
    f.frequency.setValueAtTime(300, t0)
    f.frequency.exponentialRampToValueAtTime(6000, t1)
    o.connect(f).connect(g)
    o.start(t0)
    o.stop(t1 + 0.01)
  }
  // El acorde final, largo; sin eco antes para que el silencio sea silencio.
  for (const [i, gr] of [-10, -5, 0, 4, 7, 9, 14].entries()) {
    tono(nota(gr), t2 + i * 0.04, 0.1, 7, general)
    if (gr >= 0) campana(nota(gr + 10), t2 + 0.2 + i * 0.12, 0.05, 4, general)
  }
  musica.gain.setTargetAtTime(ajustes.volMusica, t2 + 6, 3)
}

// Música de fondo generativa: cada color desbloqueado suma una capa; cada capa elige al azar su próxima nota.
type Capa = { grados: number[]; largo: [number, number]; vol: number; forma: OscillatorType; corte: number; siguiente: number }
const CAPAS: Capa[] = [
  { grados: [-10, -5, -8], largo: [14, 24], vol: 0.07, forma: 'sawtooth', corte: 300, siguiente: 0 }, // bordón grave
  { grados: [0, 2, 3, 4, 5], largo: [9, 16], vol: 0.045, forma: 'sawtooth', corte: 700, siguiente: 0 }, // pad medio
  { grados: [5, 6, 7, 8, 9, 10], largo: [7, 13], vol: 0.03, forma: 'triangle', corte: 1800, siguiente: 0 }, // pad alto
  { grados: [10, 11, 12, 13, 14, 15], largo: [2, 5], vol: 0.04, forma: 'sine', corte: 8000, siguiente: 0 }, // destellos
]

/** El pad de fondo gana una capa por color desbloqueado. */
export function fondo(n: number) {
  capas = n
}

function componer() {
  if (!listo() || performance.now() < silencioHasta) return
  const ahora = ctx!.currentTime
  CAPAS.forEach((k, i) => {
    if (i >= capas || ahora < k.siguiente) return
    const largo = azar(...k.largo)
    const t = ahora + 0.1
    k.siguiente = ahora + largo * azar(0.45, 0.8) // las notas se superponen
    if (i === 3) return void campana(nota(k.grados[Math.floor(Math.random() * k.grados.length)]), t, k.vol, largo, musica)
    // Dos notas a la vez (con la quinta a veces) entran y salen despacio, con un filtro que respira.
    const grado = k.grados[Math.floor(Math.random() * k.grados.length)]
    for (const g of Math.random() < 0.5 ? [grado] : [grado, grado + 3]) pad(nota(g), t, largo, k)
  })
}

function pad(frec: number, t: number, largo: number, k: Capa) {
  const c = ctx!
  const f = c.createBiquadFilter()
  f.type = 'lowpass'
  f.frequency.setValueAtTime(k.corte * 0.6, t)
  f.frequency.linearRampToValueAtTime(k.corte * azar(1, 1.6), t + largo / 2)
  f.frequency.linearRampToValueAtTime(k.corte * 0.6, t + largo)
  const g = c.createGain()
  g.gain.setValueAtTime(0, t)
  g.gain.linearRampToValueAtTime(k.vol, t + largo * 0.4)
  g.gain.linearRampToValueAtTime(0, t + largo)
  f.connect(g).connect(musica)
  g.connect(eco)
  for (const d of [-7, 7]) {
    const o = c.createOscillator()
    o.type = k.forma
    o.frequency.value = frec
    o.detune.value = d + azar(-3, 3)
    o.connect(f)
    o.start(t)
    o.stop(t + largo + 0.1)
  }
}
