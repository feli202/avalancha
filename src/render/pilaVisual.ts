// La pila en pantalla (SPEC 6.1–6.3): habla con el worker y dibuja con WebGL2.
// No conoce la economía: recibe G, el Caudal y el brillo de cada altura.
import { LADO } from './pila'
import type { Pedido, Respuesta } from './pila.worker'

/** SPEC 6.3: tope de granos por segundo de la simulación visual. */
export const RITMO_MAX = 3000
const DESTELLO_S = 0.3
const PX_MAX = 28 // tamaño máximo de una celda, en px CSS (para que el primer grano no ocupe la pantalla)

// SPEC 6.1, por altura de celda: 0 = Jade, 1 = Violeta, 2 = Coral, 3 = Ámbar.
const COLORES = [0x2dd4a7, 0x9b7bff, 0xff6b6b, 0xffb547]
/** Altura de celda de cada color, en el orden de CFG.colores (Ámbar, Coral, Jade, Violeta). */
export const ALTURA_DE_COLOR = [3, 2, 0, 1]

/** SPEC 6.2: brillo 0..1 a partir del log10 del multiplicador del color, saturando suave. */
export const brillo = (log10Mult: number) => log10Mult / (log10Mult + 4)

const VERT = `#version 300 es
void main() { gl_Position = vec4(vec2(gl_VertexID & 1, gl_VertexID >> 1) * 4.0 - 1.0, 0.0, 1.0); }`

const FRAG = `#version 300 es
precision highp float;
uniform sampler2D u_alturas;  // R8: granos de la celda
uniform sampler2D u_derrumbe; // R32F: segundo del último derrumbe (negativo = nunca)
uniform vec2 u_tam;           // tamaño del canvas en px
uniform float u_escala;       // px por celda
uniform float u_ahora;
uniform float u_destello;     // 0 con "reducir movimiento"
uniform vec4 u_brillo;        // 0..1 por altura
uniform vec3 u_color[4];
out vec4 o;
void main() {
  vec2 p = gl_FragCoord.xy - 0.5 * u_tam;
  // Fondo azul noche (#07080F) con viñeteado.
  vec3 col = mix(vec3(0.050, 0.058, 0.115), vec3(0.012, 0.014, 0.028), smoothstep(0.1, 0.8, length(p / u_tam.y)));
  ivec2 c = ivec2(floor(p / u_escala + 0.5)) + ${LADO >> 1};
  if (all(greaterThanEqual(c, ivec2(0))) && all(lessThan(c, ivec2(${LADO})))) {
    int h = min(int(texelFetch(u_alturas, c, 0).r * 255.0 + 0.5), 3);
    float t = texelFetch(u_derrumbe, c, 0).r;
    // Adentro de la pila = tiene granos o alguna vez se derrumbó. Afuera queda el fondo.
    if (h > 0 || t >= 0.0) {
      float b = u_brillo[h];
      col = u_color[h] * mix(0.78, 1.0, b) + 0.18 * b * b;
      float f = clamp(1.0 - (u_ahora - t) / ${DESTELLO_S}, 0.0, 1.0);
      col += u_destello * f * f * 0.55; // aditivo
    }
  }
  o = vec4(col, 1.0);
}`

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

  private gl: WebGL2RenderingContext | null
  private worker = new Worker(new URL('./pila.worker.ts', import.meta.url), { type: 'module' })
  private obs: ResizeObserver
  private uni: Record<string, WebGLUniformLocation | null> = {}
  private texAlturas: WebGLTexture | null = null
  private texDerrumbe: WebGLTexture | null = null

  private alturas: Uint8Array | null = new Uint8Array(LADO * LADO)
  private tDerrumbe = new Float32Array(LADO * LADO).fill(-1)
  private sucio = true
  private radio = 0
  private escala = 0

  // --- granos ---
  private gen = 0
  private reiniciar = false
  private ocupado = false
  private estable = true
  /** Granos que faltan soltar. */
  private pendientes = 0
  /** Parte entera de G ya pasada a `pendientes` (mientras la pila es la real). */
  private contados = 0
  private gAntes = 0
  private soltados = 0
  /** Granos soltados cuando el primero cayó al sumidero; 0 = todavía entra todo. */
  private capacidad = 0

  // --- tiempo y medidas ---
  private inicio = performance.now()
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

    const gl = (this.gl = canvas.getContext('webgl2', { alpha: false, antialias: false }))
    if (!gl) {
      console.error('WebGL2 no disponible: la pila no se dibuja')
      return
    }
    const prog = gl.createProgram()
    for (const [tipo, src] of [[gl.VERTEX_SHADER, VERT], [gl.FRAGMENT_SHADER, FRAG]] as const) {
      const sh = gl.createShader(tipo)!
      gl.shaderSource(sh, src)
      gl.compileShader(sh)
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh) ?? 'shader')
      gl.attachShader(prog, sh)
    }
    gl.linkProgram(prog)
    gl.useProgram(prog)
    for (const u of ['u_alturas', 'u_derrumbe', 'u_tam', 'u_escala', 'u_ahora', 'u_destello', 'u_brillo', 'u_color'])
      this.uni[u] = gl.getUniformLocation(prog, u)
    gl.bindVertexArray(gl.createVertexArray())
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1) // 513 no es múltiplo de 4
    const textura = (unidad: number, interno: number) => {
      const t = gl.createTexture()
      gl.activeTexture(gl.TEXTURE0 + unidad)
      gl.bindTexture(gl.TEXTURE_2D, t)
      gl.texStorage2D(gl.TEXTURE_2D, 1, interno, LADO, LADO)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
      return t
    }
    this.texAlturas = textura(0, gl.R8)
    this.texDerrumbe = textura(1, gl.R32F)
    gl.uniform1i(this.uni.u_alturas, 0)
    gl.uniform1i(this.uni.u_derrumbe, 1)
    gl.uniform3fv(this.uni.u_color, COLORES.flatMap((c) => [c >> 16, (c >> 8) & 255, c & 255].map((v) => v / 255)))
    gl.uniform1f(this.uni.u_destello, matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 1)
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
    if (!this.capacidad) {
      // SPEC 6.3: mientras entra, la pila de pantalla es la real: se suelta cada grano.
      const g = Math.floor(granos)
      this.pendientes += g - this.contados
      this.contados = g
    } else {
      // Estado estacionario: sigue cayendo arena al ritmo visual; si el worker no da abasto, no se acumula.
      this.pendientes = Math.min(this.pendientes + Math.min(caudal, RITMO_MAX) * real, RITMO_MAX)
      this.escalaK = Math.max(0, Math.floor(Math.log10(granos / this.capacidad)))
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
    this.pendientes = this.contados = this.soltados = this.capacidad = this.escalaK = this.radio = this.avalancha = 0
    this.alturas = new Uint8Array(LADO * LADO)
    this.tDerrumbe.fill(-1)
    this.sucio = true
  }

  private pedir() {
    if (this.ocupado || (this.pendientes < 1 && this.estable && !this.reiniciar)) return
    const p: Pedido = { granos: Math.floor(this.pendientes), reiniciar: this.reiniciar, gen: this.gen }
    this.worker.postMessage(p)
    this.reiniciar = false
    this.ocupado = true
  }

  private recibir(r: Respuesta) {
    this.ocupado = false
    if (r.gen === this.gen) {
      this.pendientes -= r.hechos
      this.soltados += r.hechos
      this.estable = r.estable
      this.avalancha = r.tamano
      this.radio = r.radio
      if (r.perdidos > 0 && !this.capacidad) {
        this.capacidad = this.soltados
        this.pendientes = 0
      }
      for (const i of r.celdas) this.tDerrumbe[i] = this.ahora
      this.alturas = r.alturas
      this.sucio = true
      this.m.granosSeg += r.hechos
      this.m.derrumbesSeg += r.tamano
      this.m.workerMs += r.ms
    }
    this.pedir() // si quedó trabajo, que el worker no espere al próximo cuadro
  }

  private dibujar(dt: number, brillos: number[]) {
    const { gl, canvas, uni } = this
    if (!gl) return
    if (this.sucio) {
      this.sucio = false
      if (this.alturas) {
        gl.bindTexture(gl.TEXTURE_2D, this.texAlturas)
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, LADO, LADO, gl.RED, gl.UNSIGNED_BYTE, this.alturas)
        this.alturas = null
      }
      gl.bindTexture(gl.TEXTURE_2D, this.texDerrumbe)
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, LADO, LADO, gl.RED, gl.FLOAT, this.tDerrumbe)
    }
    // Encuadre: la pila entera, con celdas de un número entero de píxeles (cuadradas y nítidas).
    const lado = Math.min(canvas.width, canvas.height)
    const entra = (0.94 * lado) / (2 * Math.min(this.radio + 2, LADO / 2) + 1)
    const objetivo = entra >= 1 ? Math.min(Math.floor(entra), Math.round(PX_MAX * devicePixelRatio)) : entra
    this.escala = this.escala ? this.escala + (objetivo - this.escala) * (1 - Math.exp(-dt * 6)) : objetivo
    if (Math.abs(objetivo - this.escala) < 0.02) this.escala = objetivo

    gl.viewport(0, 0, canvas.width, canvas.height)
    gl.uniform2f(uni.u_tam, canvas.width, canvas.height)
    gl.uniform1f(uni.u_escala, this.escala)
    gl.uniform1f(uni.u_ahora, this.ahora)
    gl.uniform4fv(uni.u_brillo, brillos)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
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
