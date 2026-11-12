// La pila en pantalla (SPEC 6.1–6.3): habla con el worker y dibuja con WebGL2.
// No conoce la economía: recibe G, el Caudal y el brillo de cada altura.
import { LADO } from './pila'
import type { Pedido, Respuesta } from './pila.worker'

/** SPEC 6.3: tope de granos por segundo de la simulación visual. */
export const RITMO_MAX = 3000
const DESTELLO_S = 0.3
const PX_MAX = 28 // tamaño máximo de una celda, en px CSS (para que el primer grano no ocupe la pantalla)
const NIVELES = Math.floor(Math.log2(LADO)) + 1 // mipmaps de la grilla (el bloom)

// SPEC 6.1, por altura de celda: 0 = Jade, 1 = Violeta, 2 = Coral, 3 = Ámbar.
const COLORES = [0x2dd4a7, 0x9b7bff, 0xff6b6b, 0xffb547]
/** Altura de celda de cada color, en el orden de CFG.colores (Ámbar, Coral, Jade, Violeta). */
export const ALTURA_DE_COLOR = [3, 2, 0, 1]

/** SPEC 6.2: brillo 0..1 a partir del log10 del multiplicador del color, saturando suave. */
export const brillo = (log10Mult: number) => log10Mult / (log10Mult + 4)

const VERT = `#version 300 es
void main() { gl_Position = vec4(vec2(gl_VertexID & 1, gl_VertexID >> 1) * 4.0 - 1.0, 0.0, 1.0); }`

const COMUN = `#version 300 es
precision highp float;
uniform float u_ahora;
uniform float u_destello; // 0 con "Reducir destellos"
float hash(vec2 p) { vec3 q = fract(p.xyx * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
`

// Pasada 1, a la resolución de la grilla (513×513). Colores lineales guardados como sqrt(c/4): entran en RGBA8 con margen hasta 4.
// o: color de la arena (lo que ilumina la luz) y en alfa la altura (0 = afuera, (h + 1) / 4 adentro).
// luz: lo que la celda emite (luz propia que crece con el nivel, el violeta y los destellos). Se suma tal cual a la
// celda y sus mipmaps son el bloom; va aparte porque el promedio de los 4 colores vecinos es casi gris y lavaba la pila.
const FRAG_CELDAS = COMUN + `
layout(location = 0) out vec4 o;
layout(location = 1) out vec4 luz;
uniform sampler2D u_alturas;  // R8: granos de la celda
uniform sampler2D u_derrumbe; // R32F: segundo del último derrumbe (negativo = nunca)
uniform vec4 u_brillo;        // 0..1 por altura
uniform vec3 u_color[4];      // lineales
void main() {
  ivec2 c = ivec2(gl_FragCoord.xy);
  int h = min(int(texelFetch(u_alturas, c, 0).r * 255.0 + 0.5), 3);
  float t = texelFetch(u_derrumbe, c, 0).r;
  // Adentro de la pila = tiene granos o alguna vez se derrumbó. Afuera queda el fondo.
  if (h == 0 && t < 0.0) { o = luz = vec4(0.0); return; }
  float b = u_brillo[h];
  float r = hash(vec2(c));
  // Vida sin arena: respiración lenta desfasada por celda y una onda tenue que sale del centro.
  float vida = 1.0 + 0.05 * sin(u_ahora * (0.5 + 0.4 * r) + r * 6.283) + 0.04 * sin(u_ahora * 0.9 - length(vec2(c) - ${LADO >> 1}.0) * 0.07);
  vec3 col = u_color[h];
  // Luz propia: crece con el nivel del color hasta que la arena parece iluminada desde adentro.
  vec3 em = u_color[h] * 0.4 * b * b * vida;
  if (h == 1) {
    // Violeta, el más raro: más profundo que el plano y con brillo propio que late despacio.
    col *= vec3(0.55, 0.4, 0.55);
    em += u_color[1] * vec3(1.0, 0.7, 0.8) * (0.14 + 0.3 * b) * (0.8 + 0.2 * sin(u_ahora * 1.3 + r * 6.283));
  }
  // Destello de derrumbe (SPEC 6.2): aditivo, intenso y del color de la celda.
  float f = clamp(1.0 - (u_ahora - t) / ${DESTELLO_S}, 0.0, 1.0);
  em += u_destello * f * f * (u_color[h] * 1.4 + 0.04);
  o = vec4(sqrt(col * vida * 0.25), (float(h) + 1.0) * 0.25);
  luz = vec4(sqrt(em * 0.25), 1.0);
}`

// Pasada 2, a pantalla: arena con relieve por celda (bordes nítidos), luz rasante, grano fino y bloom.
const FRAG_PANTALLA = COMUN + `
out vec4 o;
uniform sampler2D u_celdas;
uniform sampler2D u_luz;
uniform vec2 u_tam;      // tamaño del canvas en px
uniform float u_escala;  // px por celda
uniform float u_dpr;
uniform vec4 u_brillo;
const float L = ${LADO}.0;
const vec3 LUZ = vec3(-0.5, 0.55, 0.67); // arriba a la izquierda (sin normalizar)

vec3 dec(vec4 v) { return v.rgb * v.rgb * 4.0; }
vec4 celda(ivec2 c) { return all(greaterThanEqual(c, ivec2(0))) && all(lessThan(c, ivec2(${LADO}))) ? texelFetch(u_celdas, c, 0) : vec4(0.0); }
// Altura de una vecina; afuera de la pila cuenta como la propia, así el contorno no hace un barranco con su franja de luz.
float alt(ivec2 c, float propia) { float a = celda(c).a; return a > 0.0 ? a * 4.0 - 1.0 : propia; }
// Bloom: mips de la luz. Cerca: el resplandor de cada celda que brilla; lejos: un velo suave.
vec3 halo(vec2 q) {
  vec2 uv = q / L;
  return 0.22 * (dec(textureLod(u_luz, uv, 1.0)) + dec(textureLod(u_luz, uv, 2.0)))
       + 0.07 * (dec(textureLod(u_luz, uv, 3.5)) + dec(textureLod(u_luz, uv, 5.0)));
}
// Comprime suave lo que pasa de 0,8 según el canal más alto, sin cambiar el tono: por canal, un ámbar brillante
// se iba a amarillo y un coral a rosa (lo "pastel").
vec3 hombro(vec3 x) {
  float m = max(max(x.r, x.g), x.b);
  return m > 0.8 ? x * (0.8 + 0.2 * (1.0 - exp(-(m - 0.8) / 0.2))) / m : x;
}

void main() {
  vec2 p = gl_FragCoord.xy - 0.5 * u_tam;
  // Fondo azul noche (#07080F): un poco más claro e índigo en el centro, esquinas casi negras.
  float r = length((p / u_tam.y) * vec2(0.85, 1.0) - vec2(0.0, 0.04));
  vec3 col = mix(vec3(0.0110, 0.0125, 0.0330), vec3(0.0021, 0.0024, 0.0048), smoothstep(0.0, 0.75, r));
  col *= 1.0 - 0.55 * smoothstep(0.6, 1.25, r);

  vec2 q = p / u_escala + L * 0.5;
  ivec2 c = ivec2(floor(q));
  vec2 f = fract(q) - 0.5; // posición dentro de la celda
  vec4 v = celda(c);
  if (v.a > 0.0) {
    float h = v.a * 4.0 - 1.0;
    float b = u_brillo[int(h + 0.5)];
    float forma = smoothstep(4.0, 14.0, u_escala / u_dpr); // celdas grandes (en px CSS): relieve dentro de la celda
    float hl = alt(c - ivec2(1, 0), h), hr = alt(c + ivec2(1, 0), h), hd = alt(c - ivec2(0, 1), h), hu = alt(c + ivec2(0, 1), h);
    // Celdas chicas: una pendiente por celda (nítida, sin mezclar vecinas).
    vec2 pend = -vec2(hr - hl, hu - hd) * 0.18;
    // Celdas grandes: bisel solo en los bordes que bajan hacia una vecina, más un domo leve: volumen con borde definido.
    vec2 borde = smoothstep(0.3, 0.5, abs(f));
    vec2 bisel = vec2(f.x > 0.0 ? h - hr : hl - h, f.y > 0.0 ? h - hu : hd - h) * borde * 0.55 + f * 0.35;
    vec3 N = normalize(vec3(mix(pend, bisel, forma), 1.0));
    float dif = max(dot(N, normalize(LUZ)), 0.0);
    // Grano fino de 1 px CSS, más marcado con celdas grandes para no ensuciar el dibujo con celdas de 1 px.
    float gr = hash(floor(gl_FragCoord.xy / max(1.0, floor(u_dpr))));
    vec3 alb = dec(v) * (1.0 + (gr - 0.5) * (0.06 + 0.16 * forma));
    // Con el brillo alto la luz de afuera pesa menos: manda la de adentro.
    vec3 arena = alb * mix(0.3 + 0.9 * dif, 0.8, 0.3 * b);
    float mica = u_destello * step(0.994, gr) * (0.5 + 0.5 * sin(u_ahora * 1.7 + hash(gl_FragCoord.yx) * 40.0)) * dif;
    // Lo que emite la celda, más fuerte en el centro del grano cuando las celdas son grandes.
    vec3 em = dec(texelFetch(u_luz, c, 0)) * mix(1.0, 0.35 + 1.1 * exp(-dot(f, f) * 6.0), forma);
    // Contorno limpio: la fila del borde (sobre los lados rectos de la pila es una barra de un solo color) se funde
    // a medias con el fondo.
    float afuera = step(celda(c - ivec2(1, 0)).a, 0.0) + step(celda(c + ivec2(1, 0)).a, 0.0) + step(celda(c - ivec2(0, 1)).a, 0.0) + step(celda(c + ivec2(0, 1)).a, 0.0);
    col = mix(arena + em + mica * (0.3 + 0.7 * alb), col, 0.6 * min(afuera, 1.0));
  }
  col = hombro(col + halo(q));
  // A sRGB, con un poco de ruido para que el degradado del fondo no haga escalones.
  col = mix(col * 12.92, 1.055 * pow(col, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, col));
  o = vec4(col + (hash(gl_FragCoord.xy + fract(u_ahora) * 97.0) - 0.5) / 255.0, 1.0);
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

type Uniformes = Record<string, WebGLUniformLocation | null>

export class PilaVisual {
  /** Derrumbes del último pedido al worker (el tamaño de la avalancha del cuadro). */
  avalancha = 0
  /** SPEC 6.3: k de "1 grano = 10^k granos"; 0 mientras la pila de pantalla es la real. */
  escalaK = 0
  alMedir?: (m: Medidas) => void

  private gl: WebGL2RenderingContext | null
  private worker = new Worker(new URL('./pila.worker.ts', import.meta.url), { type: 'module' })
  private obs: ResizeObserver
  private progCeldas: WebGLProgram | null = null
  private progPantalla: WebGLProgram | null = null
  private uniC: Uniformes = {}
  private uniP: Uniformes = {}
  private fbo: WebGLFramebuffer | null = null

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
    const programa = (frag: string, nombres: string[], uni: Uniformes) => {
      const prog = gl.createProgram()
      for (const [tipo, src] of [[gl.VERTEX_SHADER, VERT], [gl.FRAGMENT_SHADER, frag]] as const) {
        const sh = gl.createShader(tipo)!
        gl.shaderSource(sh, src)
        gl.compileShader(sh)
        if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh) ?? 'shader')
        gl.attachShader(prog, sh)
      }
      gl.linkProgram(prog)
      for (const u of nombres) uni[u] = gl.getUniformLocation(prog, u)
      return prog
    }
    this.progCeldas = programa(FRAG_CELDAS, ['u_alturas', 'u_derrumbe', 'u_ahora', 'u_destello', 'u_brillo', 'u_color'], this.uniC)
    this.progPantalla = programa(FRAG_PANTALLA, ['u_celdas', 'u_luz', 'u_tam', 'u_escala', 'u_ahora', 'u_destello', 'u_dpr', 'u_brillo'], this.uniP)
    gl.bindVertexArray(gl.createVertexArray())
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1) // 513 no es múltiplo de 4
    const textura = (unidad: number, interno: number, niveles = 1) => {
      const t = gl.createTexture()
      gl.activeTexture(gl.TEXTURE0 + unidad)
      gl.bindTexture(gl.TEXTURE_2D, t)
      gl.texStorage2D(gl.TEXTURE_2D, niveles, interno, LADO, LADO)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, niveles > 1 ? gl.LINEAR_MIPMAP_LINEAR : gl.NEAREST)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, niveles > 1 ? gl.LINEAR : gl.NEAREST)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
      return t
    }
    textura(0, gl.R8) // alturas: quedan atadas a su unidad
    textura(1, gl.R32F) // instante del último derrumbe
    const celdas = textura(2, gl.RGBA8)
    const luz = textura(3, gl.RGBA8, NIVELES) // queda atada a la unidad 3 para generar sus mipmaps
    this.fbo = gl.createFramebuffer()
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, celdas, 0)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, luz, 0)
    gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1])
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)

    const destello = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 1
    gl.useProgram(this.progCeldas)
    gl.uniform1i(this.uniC.u_alturas, 0)
    gl.uniform1i(this.uniC.u_derrumbe, 1)
    gl.uniform1f(this.uniC.u_destello, destello)
    // Los colores de SPEC 6.1 son sRGB; el shader trabaja en lineal y convierte al final.
    gl.uniform3fv(this.uniC.u_color, COLORES.flatMap((c) => [c >> 16, (c >> 8) & 255, c & 255].map((v) => (v / 255) ** 2.2)))
    gl.useProgram(this.progPantalla)
    gl.uniform1i(this.uniP.u_celdas, 2)
    gl.uniform1i(this.uniP.u_luz, 3)
    gl.uniform1f(this.uniP.u_destello, destello)
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
    const { gl, canvas, uniC, uniP } = this
    if (!gl) return
    if (this.sucio) {
      this.sucio = false
      if (this.alturas) {
        gl.activeTexture(gl.TEXTURE0)
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, LADO, LADO, gl.RED, gl.UNSIGNED_BYTE, this.alturas)
        this.alturas = null
      }
      gl.activeTexture(gl.TEXTURE1)
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, LADO, LADO, gl.RED, gl.FLOAT, this.tDerrumbe)
    }
    // Encuadre: la pila entera, con celdas de un número entero de píxeles (cuadradas y nítidas).
    const lado = Math.min(canvas.width, canvas.height)
    const entra = (0.94 * lado) / (2 * Math.min(this.radio + 2, LADO / 2) + 1)
    const objetivo = entra >= 1 ? Math.min(Math.floor(entra), Math.round(PX_MAX * devicePixelRatio)) : entra
    this.escala = this.escala ? this.escala + (objetivo - this.escala) * (1 - Math.exp(-dt * 6)) : objetivo
    if (Math.abs(objetivo - this.escala) < 0.02) this.escala = objetivo

    // Pasada 1: color y luz de cada celda a la grilla, y los mipmaps de la luz para el bloom.
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo)
    gl.viewport(0, 0, LADO, LADO)
    gl.useProgram(this.progCeldas)
    gl.uniform1f(uniC.u_ahora, this.ahora)
    gl.uniform4fv(uniC.u_brillo, brillos)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.activeTexture(gl.TEXTURE3)
    gl.generateMipmap(gl.TEXTURE_2D)

    // Pasada 2: a pantalla.
    gl.viewport(0, 0, canvas.width, canvas.height)
    gl.useProgram(this.progPantalla)
    gl.uniform2f(uniP.u_tam, canvas.width, canvas.height)
    gl.uniform1f(uniP.u_escala, this.escala)
    gl.uniform1f(uniP.u_ahora, this.ahora)
    gl.uniform1f(uniP.u_dpr, devicePixelRatio)
    gl.uniform4fv(uniP.u_brillo, brillos)
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
