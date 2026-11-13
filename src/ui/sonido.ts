// Sonido (SPEC 6.7) con Web Audio. Los archivos de public/sfx son marcadores de posición (scripts/sfx.py).
import { ajustes } from './ajustes.svelte'

export type Tipo = 'derrumbes' | 'compras' | 'hitos' | 'fondo'
const VOCES_MAX = 12
const JUNTAR_MS = 50 // los derrumbes de este lapso suenan como una avalancha
const PADS = ['ambar', 'coral', 'jade', 'violeta']
const COMPRAS = new Set(['caudal', ...PADS])
const NOMBRES = [
  'topple_small', 'topple_medium', 'topple_large', 'chord_milestone', 'chord_ring', 'chord_color',
  ...[...COMPRAS, 'other'].map((c) => `buy_${c}`), ...PADS.map((c) => `pad_${c}`),
]

let ctx: AudioContext | null = null
let general: GainNode
const tipos = {} as Record<Tipo, GainNode>
const buffers: Record<string, AudioBuffer> = {}
const pads: GainNode[] = []
let voces = 0
let capas = 0

/** Un AudioContext solo arranca después de un gesto: se crea con el primer toque o tecla. */
function abrir() {
  if (ctx) return void ctx.resume()
  ctx = new AudioContext()
  general = ctx.createGain()
  general.connect(ctx.destination)
  for (const t of ['derrumbes', 'compras', 'hitos', 'fondo'] as Tipo[]) (tipos[t] = ctx.createGain()).connect(general)
  aplicarVolumen()
  // Safari no decodifica Vorbis: para él van las copias en AAC.
  const ext = new Audio().canPlayType('audio/ogg; codecs="vorbis"') ? 'ogg' : 'm4a'
  for (const n of NOMBRES)
    fetch(`${import.meta.env.BASE_URL}sfx/${n}.${ext}`)
      .then((r) => r.arrayBuffer())
      .then((b) => ctx!.decodeAudioData(b))
      .then((b) => { buffers[n] = b; if (n.startsWith('pad_')) fondo(capas) })
      .catch((e) => console.warn('sonido', n, e)) // sin ese sonido, el juego sigue
}
addEventListener('pointerdown', abrir)
addEventListener('keydown', abrir)
document.addEventListener('visibilitychange', () => ctx && (document.hidden ? ctx.suspend() : ctx.resume()))

export function aplicarVolumen() {
  if (!ctx) return
  general.gain.value = ajustes.volumen
  tipos.derrumbes.gain.value = ajustes.volDerrumbes
  tipos.compras.gain.value = ajustes.volCompras
  tipos.hitos.gain.value = ajustes.volHitos
  tipos.fondo.gain.value = ajustes.volFondo
}

function sonar(nombre: string, tipo: Tipo, volumen = 1, tono = 1) {
  const b = buffers[nombre]
  if (!ctx || !b || voces >= VOCES_MAX || ctx.state !== 'running') return
  const src = ctx.createBufferSource()
  const g = ctx.createGain()
  src.buffer = b
  src.playbackRate.value = tono
  g.gain.value = volumen
  src.connect(g).connect(tipos[tipo])
  voces++
  src.onended = () => voces--
  src.start()
}

let pendiente = 0
/** Derrumbes de una avalancha; las de un mismo cuadro se suman y suenan juntas, con volumen y tono según el tamaño. */
export function derrumbe(n: number) {
  if (n <= 0) return
  if (!pendiente) setTimeout(() => {
    const t = Math.min(1, Math.log10(pendiente + 1) / 4) // 0 = un derrumbe, 1 = 10.000
    sonar(pendiente < 10 ? 'topple_small' : pendiente < 300 ? 'topple_medium' : 'topple_large', 'derrumbes', 0.3 + 0.7 * t, 1.3 - 0.5 * t)
    pendiente = 0
  }, JUNTAR_MS)
  pendiente += n
}

/** Compra a mano: un clic por color; lo demás de la tienda, uno común. */
export const compra = (id: string) => sonar(`buy_${COMPRAS.has(id) ? id : 'other'}`, 'compras')

export const hito = (cual: 'milestone' | 'ring' | 'color') => sonar(`chord_${cual}`, 'hitos')

/** El pad de fondo gana una capa por color desbloqueado. */
export function fondo(n: number) {
  capas = n
  if (!ctx) return
  PADS.forEach((c, i) => {
    if (!pads[i] && buffers[`pad_${c}`]) {
      const src = ctx!.createBufferSource()
      src.buffer = buffers[`pad_${c}`]
      src.loop = true
      pads[i] = ctx!.createGain()
      pads[i].gain.value = 0
      src.connect(pads[i]).connect(tipos.fondo)
      src.start()
    }
    pads[i]?.gain.setTargetAtTime(i < n ? 0.5 : 0, ctx!.currentTime, 1.5) // entra despacio
  })
}
