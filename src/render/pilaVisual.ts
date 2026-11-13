// La pila en pantalla (SPEC 6.1–6.3): habla con el worker y dibuja con WebGL2.
// No conoce la economía: recibe G, el Caudal y el brillo de cada altura.
import { LADO } from './pila'
import FOTOS from '../assets/pilas.json'
import type { Pedido, Respuesta } from './pila.worker'
import { Lienzo } from './lienzo'

/** SPEC 6.3: tope de granos por segundo de la simulación visual. */
export const RITMO_MAX = 3000
const ENTERO_DESDE = 3 // px reales por celda desde los que se redondea a un entero
/** Granos de la pila llena y redonda (la última foto: capacidad + 12 %, ver scripts/snapshots.mjs). */
const LLENA = FOTOS.granos[FOTOS.granos.length - 1]
const FUNDIDO_S = 0.2 // fundido al saltar a una foto
const PX_MAX = 28 // tamaño máximo de una celda, en px CSS (para que el primer grano no ocupe la pantalla)
/** SPEC 6.2: una avalancha es "grande" si supera esta cantidad de veces el promedio. */
const AVALANCHA_GRANDE = 30
const AVALANCHAS_PARA_PROMEDIO = 20 // avalanchas antes de confiar en el promedio
const ALEJAR_S = 0.8 // animación de alejamiento al saltar de escala

/** Altura de celda de cada color, en el orden de CFG.colores (Ámbar, Coral, Jade, Violeta). */
export const ALTURA_DE_COLOR = [3, 2, 0, 1]
/** Color CSS de cada altura de celda (SPEC 6.1; las variables cambian con la paleta para daltonismo). */
export const COLOR_CSS = ['var(--jade)', 'var(--violeta)', 'var(--coral)', 'var(--ambar)']

/** SPEC 6.2: brillo 0..1 a partir del log10 del multiplicador del color, saturando suave. */
export const brillo = (log10Mult: number) => log10Mult / (log10Mult + 4)

export interface Medidas {
  fps: number
  /** Cuadro más largo del último segundo, en ms. */
  peorCuadro: number
  /** Granos que el worker soltó en el último segundo. */
  granosSeg: number
  derrumbesSeg: number
  /** ms de trabajo del worker en el último segundo. */
  workerMs: number
  /** ms de hilo principal por cuadro (promedio): repartir granos, subir texturas y dibujar. */
  cuadroMs: number
}

export class PilaVisual {
  /** Derrumbes del último pedido al worker (el tamaño de la avalancha del cuadro). */
  avalancha = 0
  /** SPEC 6.3: k de "1 grano = 10^k granos"; 0 mientras la pila de pantalla es la real. */
  escalaK = 0
  alMedir?: (m: Medidas) => void
  /** SPEC 6.2: avalancha de más de 30× el promedio; recibe cuántas veces el promedio. */
  alAvalancha?: (veces: number) => void
  /** Avalancha de un grano solo (muestra de la distribución real, ver pila.worker.ts), con sus derrumbes. */
  alMuestra?: (derrumbes: number) => void
  /** Cada avalancha terminada, con sus derrumbes (el sismógrafo). */
  alTamano?: (derrumbes: number) => void

  private lz: Lienzo
  private worker = new Worker(new URL('./pila.worker.ts', import.meta.url), { type: 'module' })
  private obs: ResizeObserver

  private alturas: Uint8Array | null = new Uint8Array(LADO * LADO)
  private tDerrumbe = new Float32Array(LADO * LADO).fill(-1)
  private sucio = true
  private radio = 0
  private escala = 0
  private px = 0
  private ultimas: Uint8Array = new Uint8Array(LADO * LADO)
  private destello = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 1
  private alejarDesde = -1
  /** Llegó una foto: el próximo cuadro guarda lo que se veía antes de subirla, para fundir. */
  private fundir = false
  private fundidoDesde = -1

  // --- avalanchas: una avalancha = pedidos seguidos hasta que la pila queda estable ---
  private avTamano = 0
  private avGranos = 0
  /** Promedio móvil de derrumbes por grano. */
  private avPromedio = 0
  private avCuenta = 0

  // --- granos ---
  private gen = 0
  private reiniciar = false
  private ocupado = false
  private estable = true
  /** Granos que faltan soltar. */
  private pendientes = 0
  private gAntes = 0
  /** min(G, pila llena): hasta dónde tiene que llegar la pila de pantalla. */
  private objetivo = 0
  private soltados = 0
  /** Granos que entran hasta que el primero cae al sumidero. */
  private capacidad = FOTOS.capacidad

  // --- tiempo y medidas ---
  private inicio = performance.now() - 1000 // ahora ≥ 1 s: un derrumbe en t = 0 ya no destella (las fotos lo usan)
  private ahora = 0
  private m: Medidas = { fps: 0, peorCuadro: 0, granosSeg: 0, derrumbesSeg: 0, workerMs: 0, cuadroMs: 0 }
  private mDesde = 0

  constructor(private canvas: HTMLCanvasElement) {
    this.worker.onmessage = (e: MessageEvent<Respuesta>) => this.recibir(e.data)
    // Tamaño en píxeles reales del dispositivo: sin esto, con zoom del 125 % la pila sale borrosa.
    this.obs = new ResizeObserver(([e]) => {
      const dp = e.devicePixelContentBoxSize?.[0]
      canvas.width = dp ? dp.inlineSize : Math.round(e.contentRect.width * devicePixelRatio)
      canvas.height = dp ? dp.blockSize : Math.round(e.contentRect.height * devicePixelRatio)
    })
    try {
      this.obs.observe(canvas, { box: 'device-pixel-content-box' })
    } catch {
      this.obs.observe(canvas) // Safari
    }

    this.lz = new Lienzo(canvas)
    this.destellos = !this.destello
  }

  /** Colores de cada altura (paletas.ts). */
  set paleta(p: number[]) {
    this.lz.colores = p
  }

  /** Efecto de avalancha (índice en EFECTOS). */
  set efecto(n: number) {
    this.lz.efecto = n
  }

  /** SPEC 6.8 "Reducir destellos": apaga destellos de derrumbe, mica y el alejamiento de cámara. */
  set destellos(reducir: boolean) {
    this.destello = reducir ? 0 : 1
    this.lz.destello = this.destello
  }

  /** Radio de la pila en pantalla, en px CSS. */
  get radioCss() {
    // Por el tamaño real del canvas y no devicePixelRatio: con zoom o emulación no siempre coinciden.
    return ((this.radio + 0.5) * this.escala * this.canvas.clientWidth) / (this.canvas.width || 1)
  }

  /** Color CSS de la altura más frecuente dentro de la pila. */
  colorDominante() {
    const n = [0, 0, 0, 0]
    const a = this.ultimas
    for (let i = 0; i < a.length; i++) if (a[i] || this.tDerrumbe[i] >= 0) n[Math.min(a[i], 3)]++
    return COLOR_CSS[n.indexOf(Math.max(...n))]
  }

  /**
   * Un cuadro: reparte los granos que tocan y dibuja.
   * @param granos G de la economía  @param caudal F, granos por segundo
   * @param brillos brillo 0..1 de cada altura de celda (0 a 3)
   */
  cuadro(ahoraMs: number, granos: number, caudal: number, brillos: number[]) {
    const ahora = (ahoraMs - this.inicio) / 1000
    const t0 = performance.now()
    const real = ahora - this.ahora
    const dt = Math.min(0.1, real) // para las animaciones
    this.medir(ahoraMs, real * 1000)
    this.ahora = ahora

    if (granos < this.gAntes) this.vaciar() // Compresión: la pila arranca de cero
    this.gAntes = granos
    // La pila de pantalla sigue a la real hasta llenarse (SPEC 6.3: mientras entra, cada grano). Si queda muy atrás,
    // pedir() salta a la foto más grande que no se pase.
    this.objetivo = Math.min(granos, LLENA)
    const falta = Math.floor(this.objetivo - this.soltados)
    if (falta >= 1 || this.soltados < this.capacidad) this.pendientes = Math.max(falta, 0)
    else {
      // Estado estacionario: sigue cayendo arena al ritmo del Caudal; si el worker no da abasto, no se acumula.
      this.pendientes = Math.min(this.pendientes + Math.min(caudal, RITMO_MAX) * real, RITMO_MAX)
      const k = Math.max(0, Math.floor(Math.log10(granos / this.capacidad)))
      // Con una foto recién cargada el salto no es de escala sino de la pila entera: ya lo cubre el fundido.
      if (k > this.escalaK && this.destello && !this.fundir && this.fundidoDesde < 0) this.alejarDesde = ahora
      this.escalaK = k
    }
    this.pedir()
    this.dibujar(dt, brillos)
    this.m.cuadroMs += performance.now() - t0
  }

  destruir() {
    this.worker.terminate()
    this.obs.disconnect()
  }

  private vaciar() {
    this.gen++
    this.reiniciar = true
    this.estable = true
    this.pendientes = this.soltados = this.escalaK = this.radio = this.avalancha = 0
    this.avTamano = this.avGranos = this.avPromedio = this.avCuenta = 0
    this.ultimas = new Uint8Array(LADO * LADO)
    this.alturas = new Uint8Array(LADO * LADO)
    this.tDerrumbe.fill(-1)
    this.sucio = true
  }

  private pedir() {
    if (this.ocupado) return
    const foto = this.fotoQueConviene()
    if (foto < 0 && this.pendientes < 1 && this.estable && !this.reiniciar) return
    const p: Pedido = { granos: Math.floor(this.pendientes), reiniciar: this.reiniciar, gen: this.gen, foto }
    this.worker.postMessage(p)
    this.reiniciar = false
    this.ocupado = true
  }

  /** La foto más grande que no pasa el objetivo, si la pila quedó más atrás de lo que alcanza en ~1 s; si no, -1. */
  private fotoQueConviene() {
    if (this.fundir || this.fundidoDesde >= 0 || this.objetivo - this.soltados <= RITMO_MAX) return -1
    let i = FOTOS.granos.length - 1
    while (i >= 0 && FOTOS.granos[i] > this.objetivo) i--
    return i >= 0 && FOTOS.granos[i] > this.soltados ? i : -1
  }

  private recibir(r: Respuesta) {
    this.ocupado = false
    if (r.gen === this.gen && r.foto >= 0) {
      this.soltados = FOTOS.granos[r.foto]
      this.pendientes = 0
      this.estable = true
      this.radio = r.radio
      this.tDerrumbe.fill(-1)
      for (const i of r.celdas) this.tDerrumbe[i] = 0 // adentro, sin destello
      this.alturas = this.ultimas = r.alturas
      this.avTamano = this.avGranos = 0
      this.fundir = this.sucio = true
      this.escala = 0 // encuadre de golpe: el fundido ya se ve con la escala nueva
    } else if (r.gen === this.gen) {
      this.pendientes -= r.hechos
      this.soltados += r.hechos
      this.estable = r.estable
      this.avalancha = r.tamano
      this.radio = r.radio
      for (const i of r.celdas) this.tDerrumbe[i] = this.ahora
      this.alturas = this.ultimas = r.alturas
      this.contarAvalancha(r)
      for (const m of r.muestras) this.alMuestra?.(m)
      this.sucio = true
      this.m.granosSeg += r.hechos
      this.m.derrumbesSeg += r.tamano
      this.m.workerMs += r.ms
    }
    this.pedir() // si quedó trabajo, que el worker no espere al próximo cuadro
  }

  // shortcut: el worker suelta los granos en lotes y no separa avalanchas; con flujo continuo (estado estacionario)
  // se comparan derrumbes por grano de cada tanda, así que "Avalancha ×N" sale sobre todo con pocos granos por segundo.
  // Para separarlas de verdad, el worker tendría que medir cada grano.
  private contarAvalancha(r: Respuesta) {
    this.avTamano += r.tamano
    this.avGranos += r.hechos
    if (!r.estable || !this.avGranos) return
    this.alTamano?.(this.avTamano)
    const porGrano = this.avTamano / this.avGranos
    const veces = this.avPromedio ? porGrano / this.avPromedio : 0
    if (this.avCuenta >= AVALANCHAS_PARA_PROMEDIO && veces > AVALANCHA_GRANDE) this.alAvalancha?.(Math.round(veces))
    // Promedio móvil: sigue al crecimiento de la pila (las avalanchas promedio crecen con el radio).
    this.avPromedio += (porGrano - this.avPromedio) / Math.min(++this.avCuenta, 200)
    this.avTamano = this.avGranos = 0
  }

  private dibujar(dt: number, brillos: number[]) {
    const { lz } = this
    if (!lz.gl) return
    const pxAntes = this.px
    const px = (this.px = this.encuadre(dt)) // px reales por celda
    if (this.fundir) {
      // Lo que se veía hasta ahora (texturas y escala viejas) queda en u_viejo y se funde con la foto nueva.
      this.fundir = false
      lz.pintar(pxAntes || px, brillos, 0, this.ahora, devicePixelRatio)
      lz.guardarViejo()
      this.fundidoDesde = this.ahora
    }
    if (this.sucio) {
      this.sucio = false
      lz.subir(this.alturas, this.tDerrumbe)
      this.alturas = null
    }
    let f = 0
    if (this.fundidoDesde >= 0) {
      f = 1 - (this.ahora - this.fundidoDesde) / FUNDIDO_S
      if (f <= 0) (this.fundidoDesde = -1), (f = 0)
    }
    this.ultimosBrillos = brillos
    lz.pintar(px, brillos, f, this.ahora, devicePixelRatio)
  }

  private ultimosBrillos = [0, 0, 0, 0]
  /** Foto del mandala: dibuja el cuadro de nuevo y devuelve el canvas (leerlo en la misma tarea), el centro y el radio en px reales. */
  foto() {
    this.lz.pintar(this.px, this.ultimosBrillos, 0, this.ahora, devicePixelRatio)
    return { canvas: this.canvas, r: (this.radio + 0.5) * this.px }
  }

  /** Acerca la escala a la que corresponde (la pila en el 80 % del lado corto) y devuelve los px reales por celda. */
  private encuadre(dt: number) {
    const { canvas } = this
    // Encuadre: la pila entera en el 80 % del lado corto, con celdas de un número entero de píxeles (cuadradas y nítidas).
    const lado = Math.min(canvas.width, canvas.height)
    const entra = (0.8 * lado) / (2 * Math.min(this.radio + 2, LADO / 2) + 1)
    // Celdas de menos de ENTERO_DESDE px: tamaño fraccionario (la pila en el 80 % aunque no entren 2 px por celda).
    const objetivo = entra >= ENTERO_DESDE ? Math.min(Math.floor(entra), Math.round(PX_MAX * devicePixelRatio)) : entra
    this.escala = this.escala ? this.escala + (objetivo - this.escala) * (1 - Math.exp(-dt * 6)) : objetivo
    if (Math.abs(objetivo - this.escala) < 0.02) this.escala = objetivo
    // Salto de escala (SPEC 6.3): la cámara arranca cerca y se aleja.
    const t = this.alejarDesde < 0 ? 1 : (this.ahora - this.alejarDesde) / ALEJAR_S
    if (t >= 1) this.alejarDesde = -1
    const alejar = 1 + 0.6 * (1 - Math.min(t, 1)) ** 3
    return this.escala * alejar
  }

  private medir(ahoraMs: number, cuadroMs: number) {
    const m = this.m
    m.fps++
    m.peorCuadro = Math.max(m.peorCuadro, cuadroMs)
    if (ahoraMs - this.mDesde < 1000) return
    if (this.mDesde) this.alMedir?.({ ...m, fps: (m.fps * 1000) / (ahoraMs - this.mDesde), cuadroMs: m.cuadroMs / m.fps })
    this.mDesde = ahoraMs
    this.m = { fps: 0, peorCuadro: 0, granosSeg: 0, derrumbesSeg: 0, workerMs: 0, cuadroMs: 0 }
  }
}
