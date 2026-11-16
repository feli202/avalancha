// Las imágenes de los logros: mini pilas dibujadas con el mismo motor de la pila (Lienzo y las fotos de
// scripts/snapshots.mjs), cada una en un estado que representa su logro. Se generan una vez y quedan en memoria.
import { LADO, Pila } from './pila'
import url from '../assets/pilas.bin?url'
import FOTOS from '../assets/pilas.json'
import { leerFotos } from './fotos'
import { desdeFoto } from './instantanea'
import { Lienzo } from './lienzo'
import { COLORES_DALTONISMO, COLORES_PILA, EFECTOS, PALETAS } from './paletas'

/** Tamaño de cada imagen en px reales (la tarjeta la muestra a la mitad en px CSS). */
export const ANCHO = 360, ALTO = 240
const DPR = 2
const BASE = 10 // s: los derrumbes "viejos" quedan en 0, así no destellan
const CICLO = 2.4 // s: lo que dura la animación al pasar el mouse
const C = LADO >> 1
const MIN_PX = 2.4

type Estado = { alturas: Uint8Array; dentro: Uint8Array; radio: number }
type Trazos = (g: OffscreenCanvasRenderingContext2D, cx: number, cy: number, r: number) => void
interface Escena {
  /** Granos: 4 y 100 se calculan; los demás son fotos (FOTOS.granos), -1 = la pila llena. */
  granos: number
  brillos?: number[]
  /** Paleta propia (si no, la de siempre). */
  colores?: (base: number[]) => number[]
  /** Escala sobre la que hace entrar la pila entera. */
  zoom?: number
  /** La pila entera aunque las celdas queden chicas. */
  entera?: boolean
  /** Segundo del ciclo en que destella cada celda, o null. d: distancia al centro en celdas, a: ángulo, i: índice. */
  onda?: (d: number, a: number, i: number) => number | null
  /** Instante de la imagen quieta dentro del ciclo. */
  t?: number
  efecto?: string
  /** Fondo detrás de la pila (FONDOS); si no, Noche. */
  fondo?: string
  trazos?: Trazos
}

const azar = (i: number) => { const x = Math.sin(i * 12.9898) * 43758.5453; return x - Math.floor(x) }
const todo = (b: number) => [b, b, b, b]
const expansiva = (vel: number) => (d: number) => d / vel
const espiral = (d: number, a: number) => ((a / (2 * Math.PI) + 0.5 + d * 0.004) % 1) * CICLO
const lluvia = (_: number, __: number, i: number) => (azar(i) < 0.06 ? azar(i * 7.1) * CICLO : null)

const circulo = (g: OffscreenCanvasRenderingContext2D, cx: number, cy: number, r: number) => {
  g.beginPath()
  g.arc(cx, cy, r, 0, Math.PI * 2)
  g.stroke()
}
/** Anillos (SPEC 4.4): uno cada vez que la pila duplica los granos, o sea el radio × √2. */
const anillos = (n: number): Trazos => (g, cx, cy, r) => {
  g.lineWidth = 1.5
  for (let j = 0; j < n; j++) {
    g.strokeStyle = `rgb(232 233 243 / ${0.55 * (1 - j / n) + 0.08})`
    circulo(g, cx, cy, r * 1.04 * 2 ** (-j / 2))
  }
}
const resplandor = (alfa: number, tam: number): Trazos => (g, cx, cy, r) => {
  const gr = g.createRadialGradient(cx, cy, 0, cx, cy, r * tam)
  gr.addColorStop(0, `rgb(255 255 255 / ${alfa})`)
  gr.addColorStop(0.45, `rgb(255 250 240 / ${alfa * 0.6})`)
  gr.addColorStop(1, 'rgb(255 255 255 / 0)')
  g.fillStyle = gr
  g.fillRect(0, 0, ANCHO, ALTO)
}
const implosion = (anillosN: number): Trazos => (g, cx, cy, r) => {
  resplandor(0.85, 0.9)(g, cx, cy, r)
  g.lineWidth = 2
  for (let j = 0; j < anillosN; j++) {
    g.strokeStyle = `rgb(232 233 243 / ${0.5 * (1 - j / anillosN)})`
    circulo(g, cx, cy, r * (1.35 + j * 0.28))
  }
}

/** La escena de cada logro (claves de LOGROS). */
export const ESCENAS: Record<string, Escena> = {
  derrumbe: { granos: 4, zoom: 0.5, onda: () => 0.05, t: 0.1, brillos: todo(0.5) },
  granos: { granos: 100, brillos: todo(0.2) },
  avalancha: { granos: 1000, onda: expansiva(40), t: 0.35 },
  colores: { granos: 3000, brillos: todo(0.75) },
  hito: { granos: 3000, brillos: [0.05, 0.05, 0.05, 1] },
  anillo: { granos: 30000, entera: true, trazos: anillos(10) },
  llena: { granos: -1, entera: true, brillos: todo(0.3), trazos: (g, cx, cy, r) => { g.lineWidth = 2; g.strokeStyle = 'rgb(232 233 243 / 0.6)'; circulo(g, cx, cy, r * 1.03) } },
  alud: { granos: 10000, onda: expansiva(70), t: 0.6, brillos: todo(0.3) },
  compresion: { granos: 10000, zoom: 0.45, trazos: implosion(3) },
  sinAmbar: { granos: 3000, colores: (b) => [b[0], b[1], b[2], 0x1a1c26] },
  anilloMedio: { granos: 100000, trazos: anillos(25) },
  mandala: { granos: 30000, brillos: todo(1) },
  cascada: { granos: 10000, onda: expansiva(45), t: 0.9, efecto: 'cascada' },
  diez: { granos: 3000, zoom: 0.4, trazos: implosion(10) },
  relampago: { granos: 10000, onda: espiral, t: 1.2, efecto: 'relampago' },
  piloto: { granos: 30000, onda: lluvia, t: 1.2, brillos: todo(0.4) },
  mutacion: { granos: 10000, colores: (b) => [b[0], 0xff5fa0, b[2], b[3]], onda: lluvia, t: 1, efecto: 'mutante' },
  densidad: { granos: 30000, zoom: 0.7, brillos: todo(0.8) },
  anilloGrande: { granos: 300000, trazos: anillos(50) },
  record: { granos: -1, onda: expansiva(160), t: 0.8, brillos: todo(0.5) },
  mutaciones: { granos: 30000, colores: () => PALETAS.negativo, onda: lluvia, t: 1, efecto: 'mutante' },
  densidadAlta: { granos: 100000, zoom: 0.6, brillos: todo(1), trazos: resplandor(0.5, 0.35) },
  infinito: { granos: 30000, trazos: resplandor(1, 1.1) },
  infinitoRapido: { granos: 30000, onda: espiral, t: 0.8, efecto: 'blanco', trazos: resplandor(0.9, 0.6) },
}

/**
 * La escena de una clave: un logro (ESCENAS), o la vista previa de un cosmético de Ajustes:
 * 'paleta:ID' (la pila llena y redonda con esa paleta) o 'efecto:ID' (una onda de derrumbes con ese efecto).
 */
function escena(clave: string): Escena {
  const [tipo, id] = clave.split(':')
  if (tipo === 'paleta') return { granos: -1, entera: true, brillos: todo(0.45), colores: () => PALETAS[id] }
  if (tipo === 'efecto') return { granos: 10000, onda: expansiva(45), t: 0.45, efecto: id, brillos: todo(0.3) }
  if (tipo === 'fondo') return { granos: 3000, zoom: 0.35, fondo: id, brillos: todo(0.3) }
  if (tipo === 'rel') return { granos: 3000, entera: true, brillos: todo(0.35), colores: () => tinte(+id) }
  // shortcut: los logros secretos todavía no tienen escena propia (paso C); usan una genérica.
  return ESCENAS[clave] ?? { granos: 3000, brillos: todo(0.4) }
}
// ---------- reliquias (bloque 8): la cara de cada una es la pila de su Infinito ----------

/** Colores de nivel (los de la interfaz: Ámbar, Coral, Jade, Violeta) y los de daltonismo, como en index.html. */
const NIVELES = [0xffb547, 0xff6b6b, 0x2dd4a7, 0x9b7bff], NIVELES_DALT = [0x56b4e9, 0xe8743b, 0xf0e442, 0xe7a3cf]
const mezclar = (c: number, o: number, t: number) =>
  [16, 8, 0].reduce((a, sh) => a | (Math.round(((c >> sh) & 255) * (1 - t) + ((o >> sh) & 255) * t) << sh), 0)
/** La pila teñida con un color de nivel, con el mismo orden de brillo que la arena (3 granos la más oscura). */
function tinte(color: number) {
  const c = (base === COLORES_DALTONISMO ? NIVELES_DALT : NIVELES)[color % 4]
  return [c, mezclar(c, 0xffffff, 0.5), mezclar(c, 0, 0.42), mezclar(c, 0x04060d, 0.7)]
}

/** Radio de la pila entera en la imagen, en px reales (para dibujar alrededor, como los marcos). */
export const RADIO_ENTERA = 0.41 * ALTO

// ---------- las pilas ----------

let fotos: Promise<Uint8Array> | null = null
async function foto(n: number): Promise<Estado> {
  fotos ??= leerFotos(url)
    .catch((e) => { fotos = null; throw e }) // sin red: se reintenta la próxima vez
  const q = await fotos
  const Q = FOTOS.lado, base = n * Q * Q
  const alturas = new Uint8Array(LADO * LADO), dentro = new Uint8Array(LADO * LADO)
  // El cuadrante guardado, espejado (igual que pila.worker.ts); 4 = adentro con 0 granos, 0 = afuera.
  for (let y = -C; y <= C; y++)
    for (let x = -C; x <= C; x++) {
      const v = q[base + Math.abs(y) * Q + Math.abs(x)], i = (C + y) * LADO + C + x
      dentro[i] = v ? 1 : 0
      alturas[i] = v & 3
    }
  return { alturas, dentro, radio: FOTOS.radio[n] }
}

function calcular(granos: number): Estado {
  const p = new Pila()
  const dentro = new Uint8Array(LADO * LADO)
  for (let n = 0; n < granos; n++) {
    p.soltar(1)
    while (!p.estable) p.estabilizar(1e6)
  }
  for (const i of p.tomarCeldas()) dentro[i] = 1
  for (let i = 0; i < dentro.length; i++) if (p.h[i]) dentro[i] = 1
  return { alturas: p.h.slice(), dentro, radio: Math.max(p.radio, 1) }
}

const pilas = new Map<number, Promise<Estado>>()
function pila(granos: number) {
  if (!pilas.has(granos)) {
    const n = granos < 0 ? FOTOS.granos.length - 1 : FOTOS.granos.indexOf(granos)
    pilas.set(granos, n >= 0 ? foto(n) : Promise.resolve(calcular(granos)))
  }
  return pilas.get(granos)!
}

/** La pila llena para el fondo Fractal (Lienzo.fondoPila): altura + 1 por celda, 0 afuera. */
export const celdasLlena = () => pila(-1).then((e) => e.alturas.map((h, i) => (e.dentro[i] ? h + 1 : 0)))

// ---------- el dibujo ----------

let lz: Lienzo | null = null
let lienzo2d: OffscreenCanvas
let subida = '' // la escena cuyas texturas están cargadas
const listas = new Map<string, Estado>()
let base = COLORES_PILA

/** La paleta de las imágenes (la de daltonismo si está activada). Cambiarla rehace las imágenes. */
export function paletaBase(daltonismo: boolean) {
  const b = daltonismo ? COLORES_DALTONISMO : COLORES_PILA
  if (b === base) return
  base = b
  for (const p of cache.values()) p.then((bm) => bm.close(), () => {}) // M16: liberar los bitmaps de la paleta anterior
  cache.clear()
  subida = ''
}

function preparar(clave: string, e: Estado) {
  const esc = escena(clave)
  lz ??= new Lienzo(new OffscreenCanvas(ANCHO, ALTO))
  lienzo2d ??= new OffscreenCanvas(ANCHO, ALTO)
  if (subida === clave) return
  subida = clave
  const t = new Float32Array(LADO * LADO).fill(-1)
  for (let i = 0; i < t.length; i++) {
    if (!e.dentro[i]) continue
    const dx = (i % LADO) - C, dy = Math.floor(i / LADO) - C
    const s = esc.onda?.(Math.hypot(dx, dy), Math.atan2(dy, dx), i)
    t[i] = s == null ? 0 : BASE + s
  }
  lz.subir(e.alturas, t)
  lz.colores = esc.colores?.(base) ?? base
  lz.efecto = Math.max(0, EFECTOS.indexOf(esc.efecto ?? 'normal'))
  lz.fondo = esc.fondo ?? 'noche'
}

/** Dibuja la escena en el instante `s` del ciclo y devuelve el lienzo 2D con los trazos encima. */
function dibujar(clave: string, e: Estado, s: number, destello: number) {
  preparar(clave, e)
  const esc = escena(clave)
  const entra = Math.min((0.82 * ALTO) / (2 * e.radio + 1), 48)
  // Sin zoom propio, al menos MIN_PX por celda: las pilas grandes se recortan y se lee el mandala, no ruido.
  const px = esc.zoom ? entra * esc.zoom : esc.entera ? entra : Math.max(entra, MIN_PX)
  lz!.destello = destello
  lz!.pintar(px, esc.brillos ?? todo(0.15), 0, BASE + s, DPR)
  const g = lienzo2d.getContext('2d')!
  g.clearRect(0, 0, ANCHO, ALTO)
  g.drawImage(lz!.canvas, 0, 0)
  esc.trazos?.(g, ANCHO / 2, ALTO / 2, (e.radio + 0.5) * px)
  return lienzo2d
}

const cache = new Map<string, Promise<ImageBitmap>>()
// Una imagen por rato libre, en el orden en que se piden (las tarjetas de arriba primero): abrir un panel
// con 40 vistas previas no traba la pila. Safari no tiene requestIdleCallback.
let cola: Promise<unknown> = Promise.resolve()
const libre = () => new Promise<void>((ok) => ('requestIdleCallback' in window ? requestIdleCallback(() => ok(), { timeout: 50 }) : setTimeout(ok)))
/** La imagen quieta de un logro. */
export function imagen(clave: string): Promise<ImageBitmap> {
  if (!cache.has(clave)) {
    const foto = clave.startsWith('rel:') ? clave.split(':')[2] : '' // sin foto (reliquias de antes): una pila genérica
    const p = cola.then(libre).then(() => Promise.all([foto ? desdeFoto(foto) : pila(escena(clave).granos), escena(clave).fondo === 'fractal' && celdasLlena()])).then(([e, llena]) => {
      if (llena) (lz ??= new Lienzo(new OffscreenCanvas(ANCHO, ALTO))).fondoPila(llena)

      listas.set(clave, e)
      return dibujar(clave, e, escena(clave).t ?? 0, 1).transferToImageBitmap()
    })
    cola = p.catch(() => {})
    cache.set(clave, p.catch((e) => { cache.delete(clave); throw e }))
  }
  return cache.get(clave)!
}

/**
 * Acción de Svelte: un <canvas> con la mini pila del logro. Al pasar el mouse se anima (la escena corre su ciclo),
 * salvo con `quieta` (Reducir destellos).
 */
export function miniPila(canvas: HTMLCanvasElement, p: { clave: string; quieta: boolean }) {
  canvas.width = ANCHO
  canvas.height = ALTO
  const g = canvas.getContext('2d')!
  let raf = 0, vivo = true
  const quieta = () => imagen(p.clave).then((b) => vivo && !raf && (g.clearRect(0, 0, ANCHO, ALTO), g.drawImage(b, 0, 0)))
    .catch(() => {}) // sin las fotos (sin red): el lugar queda vacío
  const entrar = () => {
    const e = listas.get(p.clave)
    if (p.quieta || !e || raf) return
    const t0 = performance.now() - (escena(p.clave).t ?? 0) * 1000
    const paso = (ahora: number) => {
      g.clearRect(0, 0, ANCHO, ALTO)
      g.drawImage(dibujar(p.clave, e, ((ahora - t0) / 1000) % CICLO, 1), 0, 0)
      raf = requestAnimationFrame(paso)
    }
    raf = requestAnimationFrame(paso)
  }
  const salir = () => {
    cancelAnimationFrame(raf)
    raf = 0
    quieta()
  }
  const tarjeta = canvas.closest('[data-tarjeta]') ?? canvas
  tarjeta.addEventListener('pointerenter', entrar)
  tarjeta.addEventListener('pointerleave', salir)
  quieta()
  return {
    update(n: typeof p) { p = n; salir() },
    destroy() {
      vivo = false
      cancelAnimationFrame(raf)
      tarjeta.removeEventListener('pointerenter', entrar)
      tarjeta.removeEventListener('pointerleave', salir)
    },
  }
}

/** Acción de Svelte: la cara de una reliquia (su pila teñida con el color del nivel), un cuadrado del centro de la imagen. */
export function caraReliquia(canvas: HTMLCanvasElement, p: { foto: string; nivel: number }) {
  canvas.width = canvas.height = ALTO
  const g = canvas.getContext('2d')!
  let vivo = true
  const pintar = () => imagen(`rel:${p.nivel % 4}:${p.foto}`)
    .then((b) => vivo && (g.clearRect(0, 0, ALTO, ALTO), g.drawImage(b, (ANCHO - ALTO) / 2, 0, ALTO, ALTO, 0, 0, ALTO, ALTO)))
    .catch(() => {})
  pintar()
  return { update(n: typeof p) { if (n.foto !== p.foto || n.nivel % 4 !== p.nivel % 4) { p = n; pintar() } }, destroy() { vivo = false } }
}
