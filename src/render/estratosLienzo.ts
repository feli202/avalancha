// Correcciones Capa 1, bloque 11 (en 2D): la escena de los Estratos en canvas 2D, en pixel art como la pila.
// Arriba, la base de la pila principal (la pila llena de verdad, achatada); debajo, el embudo de embudo.ts, que corre en
// estratos.worker.ts. Se crea al entrar a la pantalla y se destruye al salir: el worker solo corre con la pantalla abierta.
// Dibuja cuando llegan celdas nuevas (20 por segundo) o hay una animación (roca que se rompe, veta); nada con la pestaña oculta.
import { ALTO, ANCHO, BANDAS, PARED, PORO, ROCA, armarMuro, banda, type Banda } from './embudo'
import type { Entrada, Salida } from './estratos.worker'
import { celdasLlena } from './miniPilas'

export interface Datos extends Entrada {
  /** El estrato elegido (la ficha del costado). */
  foco: number
  /** Al tope: con la veta brillante. */
  tope: boolean[]
  /** Rótulo de la izquierda (número) y de la derecha (aporte, o el costo si está cerrado). */
  numeros: string[]
  derecha: string[]
  /** El próximo estrato se puede abrir: la roca ya se agrieta. */
  sePuedeAbrir: boolean
  /** Reducir destellos: sin veta que respira, sin grietas que laten ni roca que vuela. */
  quieta: boolean
}

const MARGEN_ARRIBA = 0.11 // del alto: lugar para la base de la pila
const HIELO = [159, 227, 245], SED = [122, 78, 40], NOCHE = [4, 6, 13]
const mezcla = (a: number[], b: number[], t: number) => a.map((v, k) => Math.round(v + (b[k] - v) * t))
const hash = (i: number) => { const s = Math.sin(i * 127.1) * 43758.5; return s - Math.floor(s) }
const rgb = (c: number) => [c >> 16, (c >> 8) & 255, c & 255]

interface Trozo { x: number; y: number; vx: number; vy: number; c: string; t: number }

export class EstratosLienzo {
  /** El jugador tocó un estrato. */
  alFoco?: (k: number) => void
  private ctx: CanvasRenderingContext2D
  private worker = new Worker(new URL('./estratos.worker.ts', import.meta.url), { type: 'module' })
  private obs: ResizeObserver
  private grilla = document.createElement('canvas')
  private g: CanvasRenderingContext2D
  private img: ImageData
  private celdas: Uint8Array = new Uint8Array(ANCHO * ALTO)
  private muro = new Uint8Array(ANCHO * ALTO)
  private cuentas: number[] = []
  private poros: boolean[] = []
  private d?: Datos
  private colores: number[][] = []
  private madre?: HTMLCanvasElement
  private trozos: Trozo[] = []
  private cuadro = 0
  private sucio = false
  private abiertos = -1
  private cel = 1; private ox = 0; private oy = 0; private W = 0; private H = 0

  constructor(private canvas: HTMLCanvasElement, colores: number[]) {
    this.ctx = canvas.getContext('2d')!
    this.grilla.width = ANCHO; this.grilla.height = ALTO
    this.g = this.grilla.getContext('2d')!
    this.img = this.g.createImageData(ANCHO, ALTO)
    this.paleta(colores)
    this.worker.onmessage = (m: MessageEvent<Salida>) => { this.celdas = m.data.celdas; this.cuentas = m.data.cuentas; this.poros = m.data.poros; this.pedir() }
    this.obs = new ResizeObserver(() => this.medir())
    this.obs.observe(canvas)
    canvas.addEventListener('pointerdown', this.tocar)
    // La arena trae los colores en la misma proporción que la pila llena.
    celdasLlena().then((h) => {
      const n = [0, 0, 0, 0]
      for (const v of h) if (v) n[v - 1]++
      const t = n.reduce((a, b) => a + b, 0)
      if (t) this.worker.postMessage({ pesos: n.map((v) => v / t) })
      this.alturas = h
      this.madre = undefined
      this.pedir()
    }).catch(() => {})
  }
  private alturas?: Uint8Array<ArrayBufferLike>

  /** Colores de la arena por altura (0 a 3), los de la pila equipada. */
  paleta(c: number[]) {
    this.colores = c.map(rgb)
    this.madre = undefined
    this.pedir()
  }

  poner(d: Datos) {
    if (this.abiertos >= 0 && d.abiertos > this.abiertos && !d.quieta) for (let k = this.abiertos; k < d.abiertos; k++) this.romper(k)
    this.abiertos = d.abiertos
    this.d = d
    // Los estratos cerrados son roca también en el worker; el muro de acá es para dibujar.
    armarMuro(this.muro, d.abiertos)
    const e: Entrada = { abiertos: d.abiertos, objetivo: d.objetivo, chorro: d.chorro }
    this.worker.postMessage(e)
    this.pedir()
  }

  destruir() {
    cancelAnimationFrame(this.cuadro)
    this.worker.terminate()
    this.obs.disconnect()
    this.canvas.removeEventListener('pointerdown', this.tocar)
    this.madre = undefined
  }

  private medir() {
    const r = this.canvas.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1)
    this.W = r.width; this.H = r.height
    this.canvas.width = Math.round(r.width * dpr); this.canvas.height = Math.round(r.height * dpr)
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    const arriba = Math.max(28, this.H * MARGEN_ARRIBA), lados = this.W < 500 ? 40 : 64
    // Celdas de px físicos enteros (pixel art nítido también con densidad 2 o 3), salvo que no entre ni a 1 px.
    const c = Math.min((this.W - lados) / ANCHO, (this.H - arriba - 4) / ALTO)
    this.cel = c * dpr >= 1 ? Math.floor(c * dpr) / dpr : Math.max(0.5, c)
    this.ox = Math.round((this.W - ANCHO * this.cel) / 2)
    // El casquete de la pila arriba (hasta un tercio de su radio) y el embudo debajo; el bloque, centrado en el alto.
    const casquete = ANCHO * this.cel * 0.5 * 0.34, alto = ALTO * this.cel
    const oy = Math.max(arriba, Math.min(casquete, this.H - 4 - alto))
    this.oy = Math.round(oy + Math.max(0, (this.H - 4 - alto - oy) / 2))
    this.madre = undefined
    this.pedir()
  }

  private tocar = (e: PointerEvent) => {
    const r = this.canvas.getBoundingClientRect(), y = (e.clientY - r.top - this.oy) / this.cel
    for (let k = BANDAS - 1; k >= 0; k--) if (y >= banda(k).y - 3) { this.alFoco?.(k); return }
  }

  /** La roca del estrato que se abre salta en pedazos. */
  private romper(k: number) {
    const b = banda(k)
    for (let n = 0; n < 160; n++) {
      const x = b.a + hash(n * 3.1 + k) * (b.b - b.a), y = b.y + hash(n * 7.7 + k) * (b.piso - b.y)
      this.trozos.push({ x, y, vx: (hash(n * 1.3) - 0.5) * 30, vy: -10 - hash(n * 5.9) * 25, c: ['#151a24', '#1b2130', '#0d1017', '#27303f'][n & 3], t: 0 })
    }
  }

  private pedir() {
    if (this.sucio) return
    this.sucio = true
    this.cuadro = requestAnimationFrame(this.dibujar)
  }

  private ultimo = 0
  private dibujar = (t: number) => {
    this.sucio = false
    const d = this.d, { ctx, cel, ox, oy } = this
    ctx.clearRect(0, 0, this.W, this.H)
    if (!d || !this.colores.length) return
    const dt = Math.min(0.05, (t - (this.ultimo || t)) / 1000); this.ultimo = t
    this.pintarMadre(ctx)
    this.pintarGrilla(d)
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(this.grilla, ox, oy, ANCHO * cel, ALTO * cel)
    let animando = false
    for (let k = 0; k < BANDAS; k++) {
      const b = banda(k), x0 = ox + b.a * cel, x1 = ox + (b.b + 1) * cel, y0 = oy + b.y * cel, y1 = oy + b.piso * cel
      if (k < d.abiertos && d.tope[k]) { this.veta(ctx, x0, x1, y1 + cel / 2, d.quieta ? 0 : t); animando ||= !d.quieta }
      if (k >= d.abiertos) this.grabado(ctx, b, d, k)
      if (k === d.abiertos && d.sePuedeAbrir) { this.grieta(ctx, b, d.quieta ? 0 : t); animando ||= !d.quieta }
      // rótulos
      const fs = Math.max(11, Math.min(14, cel * 3.4))
      ctx.font = `600 ${fs}px 'Space Grotesk', system-ui, sans-serif`; ctx.textBaseline = 'middle'
      ctx.textAlign = 'right'; ctx.fillStyle = k === d.foco ? '#9fe3f5' : k < d.abiertos ? 'rgb(232 233 243 / 0.7)' : 'rgb(232 233 243 / 0.35)'
      ctx.fillText(d.numeros[k], x0 - cel * 2 - 6, (y0 + y1) / 2)
      if (k < d.abiertos) { ctx.textAlign = 'left'; ctx.fillStyle = '#9fe3f5'; ctx.fillText(d.derecha[k], x1 + cel * 2 + 6, (y0 + y1) / 2) }
      if (k === d.foco) { // el elegido: un marco fino de hielo
        ctx.strokeStyle = 'rgb(159 227 245 / 0.85)'; ctx.lineWidth = 1
        ctx.strokeRect(Math.round(x0 - cel * 2.5) + 0.5, Math.round(y0 - cel * 1.5) + 0.5, Math.round(x1 - x0 + cel * 5), Math.round(y1 - y0 + cel * 3))
      }
    }
    // pedazos de roca
    for (let i = this.trozos.length - 1; i >= 0; i--) {
      const p = this.trozos[i]
      p.t += dt; p.vy += 60 * dt; p.x += p.vx * dt; p.y += p.vy * dt
      if (p.t > 1.1) { this.trozos.splice(i, 1); continue }
      ctx.globalAlpha = 1 - p.t / 1.1; ctx.fillStyle = p.c
      ctx.fillRect(ox + p.x * cel, oy + p.y * cel, cel * 2, cel * 2)
    }
    ctx.globalAlpha = 1
    if (animando || this.trozos.length) this.pedir()
  }

  /** La pila llena achatada, vista desde abajo: en sombra, con el aro claro, y la arena saliendo por el centro. */
  private pintarMadre(ctx: CanvasRenderingContext2D) {
    if (!this.alturas) return
    if (!this.madre) {
      const n = Math.round(Math.sqrt(this.alturas.length)), cv = document.createElement('canvas')
      cv.width = cv.height = n
      const g = cv.getContext('2d')!, im = g.createImageData(n, n)
      for (let i = 0; i < this.alturas.length; i++) {
        const v = this.alturas[i]
        if (!v) continue
        const c = mezcla(this.colores[v - 1], NOCHE, 0.25)
        im.data.set([c[0], c[1], c[2], 255], i * 4)
      }
      g.putImageData(im, 0, 0)
      this.madre = cv
    }
    // Solo asoma el casquete de abajo: la pila está arriba, fuera de cuadro, y la arena sale por el centro.
    const R = ANCHO * this.cel * 0.5, cx = this.ox + (ANCHO * this.cel) / 2, cy = this.oy + 2 * this.cel - R
    ctx.save()
    ctx.beginPath(); ctx.rect(0, 0, this.W, this.oy + 2 * this.cel); ctx.clip() // nunca por encima de los estratos
    ctx.imageSmoothingEnabled = true
    ctx.drawImage(this.madre, cx - R, cy - R, 2 * R, 2 * R)
    const g = ctx.createRadialGradient(cx, cy, R * 0.55, cx, cy, R)
    g.addColorStop(0, 'rgb(4 6 13 / 0.5)'); g.addColorStop(1, 'rgb(4 6 13 / 0.05)')
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = 'rgb(234 246 255 / 0.55)'; ctx.lineWidth = 1
    ctx.beginPath(); ctx.arc(cx, cy, R + 1, 0, Math.PI * 2); ctx.stroke()
    ctx.restore()
  }

  private pintarGrilla(d: Datos) {
    const px = this.img.data, cel = this.celdas, m = this.muro
    // Fondo de cada bandeja abierta según lo llena que está: hielo claro → sedimento compacto, más hondo de color.
    const fondo: number[][] = [], piso: number[][] = [], espesor: number[] = []
    for (let k = 0; k < BANDAS; k++) {
      const ll = Math.min(1, (this.cuentas[k] ?? 0) / Math.max(1, (banda(k).b - banda(k).a + 1) * (banda(k).piso - banda(k).y)))
      fondo[k] = [...mezcla(mezcla(HIELO, SED, ll), NOCHE, 0.72 + k * 0.025), 255]
      piso[k] = [...mezcla(mezcla(HIELO, SED, ll), NOCHE, 0.25 + ll * 0.3), 255]
      espesor[k] = 1 + Math.round(ll * 2)
    }
    const bandaDe = new Int8Array(ALTO).fill(-1)
    for (let k = 0; k < BANDAS; k++) { const b = banda(k); for (let y = b.y; y <= b.piso + espesor[k]; y++) bandaDe[y] = k }
    for (let y = 0; y < ALTO; y++) {
      const k = bandaDe[y], b = k >= 0 ? banda(k) : null
      for (let x = 0; x < ANCHO; x++) {
        const i = y * ANCHO + x, o = i * 4, v = cel[i]
        let c: number[] | null = null
        if (v && m[i] !== ROCA) { const s = this.colores[v - 1]; c = [s[0], s[1], s[2], 255] }
        else if (m[i] === ROCA) c = ROCAS[(Math.floor(hash(x * 7.1 + y * 131.3) * 3) + (Math.sin(y * 0.9 + Math.sin(x * 0.13) * 1.6) > 0.6 ? 1 : 0))]
        else if (m[i] === PORO && this.poros[k]) c = null // poro abierto: hueco
        else if (m[i] === PARED || m[i] === PORO) c = b && y === b.piso ? piso[k] : MURO
        else if (b && k < d.abiertos && x >= b.a && x <= b.b) c = y < b.piso ? fondo[k] : piso[k] // espesor del piso
        if (!c) { px[o + 3] = 0; continue }
        px[o] = c[0]; px[o + 1] = c[1]; px[o + 2] = c[2]; px[o + 3] = c[3]
      }
    }
    this.g.putImageData(this.img, 0, 0)
  }

  /** La veta del estrato en su tope: una línea quebrada violeta que respira lento. */
  private veta(ctx: CanvasRenderingContext2D, x0: number, x1: number, y: number, t: number) {
    ctx.save()
    ctx.strokeStyle = `rgb(194 168 255 / ${t ? 0.65 + 0.25 * Math.sin(t / 900) : 0.75})`; ctx.lineWidth = Math.max(1, this.cel * 0.5)
    ctx.shadowColor = '#9b7bff'; ctx.shadowBlur = 6
    ctx.beginPath(); ctx.moveTo(x0, y)
    for (let k = 1; k <= 30; k++) ctx.lineTo(x0 + ((x1 - x0) * k) / 30, y + (hash(k * 3) - 0.5) * this.cel)
    ctx.stroke(); ctx.restore()
  }

  private grabado(ctx: CanvasRenderingContext2D, b: Banda, d: Datos, k: number) {
    const cx = this.ox + ((b.a + b.b + 1) / 2) * this.cel, cy = this.oy + ((b.y + b.piso) / 2) * this.cel
    ctx.save(); ctx.font = `600 ${Math.max(10, Math.min(13, this.cel * 3))}px 'Space Grotesk', system-ui, sans-serif`
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    const txt = d.derecha[k]
    ctx.fillStyle = 'rgb(0 0 0 / 0.8)'; ctx.fillText(txt, cx, cy - 1)
    ctx.fillStyle = 'rgb(234 246 255 / 0.1)'; ctx.fillText(txt, cx, cy + 1)
    ctx.fillStyle = 'rgb(159 190 215 / 0.5)'; ctx.fillText(txt, cx, cy)
    ctx.restore()
  }

  private grieta(ctx: CanvasRenderingContext2D, b: Banda, t: number) {
    ctx.fillStyle = `rgb(159 227 245 / ${t ? 0.35 + 0.2 * Math.sin(t / 700) : 0.45})`
    const c = this.cel
    let x = (b.a + b.b) / 2, y = b.y
    while (y < b.piso) { ctx.fillRect(this.ox + Math.round(x) * c, this.oy + y * c, c, c); x += Math.round((hash(y * 9 + x) - 0.5) * 3); y++ }
  }
}

const MURO = [58, 92, 118, 255]
const ROCAS = [[11, 14, 20, 255], [16, 20, 28, 255], [21, 26, 36, 255], [27, 33, 48, 255]]
