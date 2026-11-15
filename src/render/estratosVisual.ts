// SPEC_CAPA1 §7.4: la escena 3D de los Estratos. Arriba la sombra de la pila; debajo, ocho losas con su mini pila.
// Se crea al entrar a la pantalla y se destruye al salir (un solo contexto WebGL además del de la pila).
// Dibuja a demanda: un cuadro cuando cambia la cámara o el estado; las partículas, a 30 fps como mucho; nada con la pestaña oculta.
import {
  BufferAttribute, BufferGeometry, CylinderGeometry, DataTexture, Mesh, PerspectiveCamera, PlaneGeometry, Points, RedFormat,
  Scene, ShaderMaterial, Vector3, WebGLRenderer,
} from 'three'

export const N = 64 // lado del heightmap de cada mini pila
const C = N / 2
const ESTRATOS = 8
const RADIO = 2, ALTO = 0.4, SEP = 3 // de la losa y entre losas, en unidades de la escena
const SOMBRA_Y = 2.3 // la sombra de la pila, sobre el estrato 1
const POR_HUECO = 250 // partículas por hueco: 8 × 250 = 2000 (el tope de la spec)
const LLENA = 6000 // granos de una mini pila que ya llega al borde
const REGENERAR_MS = 500 // heightmaps a 2 Hz
const CUADRO_PARTICULAS_MS = 1000 / 30

// El sumidero de la mini pila: fuera del círculo inscrito (redonda, como la principal).
const FUERA = new Uint8Array(N * N)
for (let i = 0; i < N * N; i++) FUERA[i] = Math.hypot((i % N) - C, Math.floor(i / N) - C) > C - 1.5 ? 1 : 0

/** Mini pila abeliana de N×N: suelta `granos` en el centro y la deja estable. Los que llegan al sumidero se pierden. */
export function soltar(h: Uint16Array, granos: number) {
  const c = C * N + C
  const cola = [c]
  const dar = (j: number, n: number) => {
    if (FUERA[j]) return
    h[j] += n
    if (h[j] >= 4) cola.push(j)
  }
  h[c] += granos
  while (cola.length) {
    const i = cola.pop()!
    const n = h[i] >> 2
    if (!n) continue
    h[i] &= 3
    dar(i - 1, n); dar(i + 1, n); dar(i - N, n); dar(i + N, n)
  }
}

export interface Datos {
  abiertos: number
  /** s_k: log10 de granos de cada estrato. */
  s: number[]
  /** γ_k de cada estrato, en veces el γ base de la config. */
  gamma: number[]
  /** Reducir destellos: sin partículas en movimiento ni cámara animada. */
  quieta: boolean
}

const rgb = (hex: number) => [(hex >> 16) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255]
const lleno = (s: number) => s / (s + 15) // 0..1: cuánto se ve de llena la mini pila (visual, no es balance)

const LOSA_V = `
varying vec3 v_p; varying vec3 v_w;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.);
  v_p = mv.xyz; v_w = (modelMatrix * vec4(position, 1.)).xyz;
  gl_Position = projectionMatrix * mv;
}`
// Caras planas (la normal sale de las derivadas): hielo translúcido con brillo fino en las aristas, o roca oscura.
const LOSA_F = `
uniform vec3 u_color; uniform float u_alfa; uniform float u_roca;
varying vec3 v_p; varying vec3 v_w;
void main() {
  vec3 n = normalize(cross(dFdx(v_p), dFdy(v_p)));
  float luz = 0.35 + 0.65 * max(dot(n, normalize(vec3(0.3, 0.8, 0.5))), 0.);
  float borde = pow(1. - abs(dot(n, normalize(-v_p))), 2.);
  float grano = fract(sin(dot(floor(v_w * 14.), vec3(12.98, 78.23, 37.72))) * 43758.5) - 0.5;
  vec3 c = u_color * luz + grano * 0.05 * u_roca + vec3(0.62, 0.89, 0.96) * borde * (0.5 - 0.42 * u_roca);
  gl_FragColor = vec4(c, u_alfa + borde * 0.35);
}`
const PILA_V = `
uniform sampler2D u_alt; uniform float u_alto; uniform float u_radio;
varying vec2 v_uv; varying vec3 v_p;
void main() {
  v_uv = uv;
  float h = texture2D(u_alt, (uv * ${N - 1}. + 0.5) / ${N}.).r * 255.;
  float r = length(uv - 0.5) * 2. / u_radio;
  vec3 p = position;
  p.y += u_alto * (1. - smoothstep(0., 1., r)) * (0.75 + 0.25 * h / 3.);
  vec4 mv = modelViewMatrix * vec4(p, 1.);
  v_p = mv.xyz;
  gl_Position = projectionMatrix * mv;
}`
const PILA_F = `
uniform sampler2D u_alt; uniform float u_radio; uniform vec3 u_col[4];
varying vec2 v_uv; varying vec3 v_p;
void main() {
  if (length(v_uv - 0.5) * 2. > u_radio) discard;
  int h = int(texture2D(u_alt, v_uv).r * 255. + 0.5);
  vec3 n = normalize(cross(dFdx(v_p), dFdy(v_p)));
  gl_FragColor = vec4(u_col[h] * (0.45 + 0.75 * max(dot(n, normalize(vec3(0.3, 0.8, 0.5))), 0.)), 1.);
}`
const UV_V = `varying vec2 v_uv; void main() { v_uv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`
// Sombra falsa: un quad con gradiente (sin shadowMap).
const SOMBRA_F = `
varying vec2 v_uv;
void main() {
  float r = length(v_uv - 0.5) * 2.;
  float aro = smoothstep(0.05, 0., abs(r - 0.8)) * 0.22;
  gl_FragColor = vec4(vec3(0.62, 0.89, 0.96) * aro, smoothstep(1., 0.3, r) * 0.92 + aro);
}`
// Partículas: buffer fijo; la posición sale de la fase y del tiempo en el shader. position = (x, fase, z).
const GRANOS_V = `
attribute float a_i;
uniform float u_t; uniform float u_px; uniform float u_n[${ESTRATOS}];
varying float v_a;
void main() {
  float g = floor(a_i / ${POR_HUECO}.), j = a_i - g * ${POR_HUECO}.;
  float ALTO0 = g < 0.5 ? ${SOMBRA_Y.toFixed(2)} : ${(SEP - ALTO / 2).toFixed(2)};
  float f = fract(position.y + u_t * (0.12 + 0.1 * fract(position.y * 7.3)));
  vec4 mv = modelViewMatrix * vec4(position.x, -g * ${SEP}. + ALTO0 - f * (ALTO0 - ${(ALTO / 2).toFixed(2)}), position.z, 1.);
  v_a = j < u_n[int(g)] ? sin(f * 3.1416) : 0.;
  gl_Position = v_a > 0. ? projectionMatrix * mv : vec4(2., 2., 2., 1.);
  gl_PointSize = u_px / -mv.z;
}`
const GRANOS_F = `varying float v_a; void main() { gl_FragColor = vec4(0.85, 0.93, 1., v_a * 0.7); }`

export class EstratosVisual {
  /** El estrato que mira la cámara cambió. */
  alFoco?: (k: number) => void
  /** Después de cada cuadro: x, y (px CSS) del frente de cada losa, para los rótulos HTML. */
  alCuadro?: (xy: Float32Array) => void

  private gl: WebGLRenderer
  private escena = new Scene()
  private camara = new PerspectiveCamera(42, 1, 0.1, 100)
  private hielo: ShaderMaterial
  private roca: ShaderMaterial
  private losas: Mesh[] = []
  private pilas: Mesh<PlaneGeometry, ShaderMaterial>[] = []
  private granos: ShaderMaterial
  private h = Array.from({ length: ESTRATOS }, () => new Uint16Array(N * N))
  private d: Datos = { abiertos: 0, s: [], gamma: [], quieta: false }
  private pos = 0 // estrato (con decimales) que mira la cámara
  private destino = 0
  private foco = 0
  private arrastre: { y: number; pos: number } | null = null
  private rueda = 0
  private raf = 0
  private sucio = true
  private reloj = 0
  private regen = 0
  private antes = 0
  private vivo = true
  private xy = new Float32Array(ESTRATOS * 2)
  private v = new Vector3()
  private ro: ResizeObserver

  constructor(private canvas: HTMLCanvasElement, colores: number[]) {
    const movil = matchMedia('(pointer: coarse)').matches
    this.gl = new WebGLRenderer({ canvas, alpha: true, antialias: !movil })
    this.gl.setPixelRatio(Math.min(devicePixelRatio, movil ? 1 : 1.5))
    this.gl.shadowMap.enabled = false

    const losa = (color: number, alfa: number, roca: number) =>
      new ShaderMaterial({
        vertexShader: LOSA_V, fragmentShader: LOSA_F, transparent: alfa < 1, depthWrite: alfa === 1,
        uniforms: { u_color: { value: rgb(color) }, u_alfa: { value: alfa }, u_roca: { value: roca } },
      })
    this.hielo = losa(0x4f8fa8, 0.3, 0)
    this.roca = losa(0x14161f, 1, 1)
    const prisma = new CylinderGeometry(RADIO, RADIO, ALTO, 6) // hexágono: aristas a 60°
    const plano = new PlaneGeometry(RADIO * 1.7, RADIO * 1.7, N - 1, N - 1).rotateX(-Math.PI / 2)
    const col = new Float32Array(colores.flatMap(rgb))
    for (let k = 0; k < ESTRATOS; k++) {
      const m = new Mesh(prisma, this.roca)
      m.position.y = -k * SEP
      const tex = new DataTexture(new Uint8Array(N * N), N, N, RedFormat)
      const p = new Mesh(plano, new ShaderMaterial({
        vertexShader: PILA_V, fragmentShader: PILA_F,
        uniforms: { u_alt: { value: tex }, u_alto: { value: 0 }, u_radio: { value: 1 }, u_col: { value: col } },
      }))
      p.position.y = -k * SEP + ALTO / 2 + 0.01
      p.visible = false
      p.frustumCulled = false // el shader mueve los vértices
      this.losas.push(m)
      this.pilas.push(p)
      this.escena.add(m, p)
    }
    const sombra = new Mesh(
      new PlaneGeometry(RADIO * 2.4, RADIO * 2.4).rotateX(-Math.PI / 2),
      new ShaderMaterial({ vertexShader: UV_V, fragmentShader: SOMBRA_F, transparent: true, depthWrite: false }),
    )
    sombra.position.y = SOMBRA_Y
    this.escena.add(sombra)

    const n = ESTRATOS * POR_HUECO
    const p = new Float32Array(n * 3), ai = new Float32Array(n)
    for (let i = 0; i < n; i++) {
      // Reparto fijo (sin Math.random: la escena es la misma cada vez), más denso hacia el centro.
      const a = i * 2.39996, r = RADIO * 0.7 * ((i * 0.618034) % 1)
      p.set([Math.cos(a) * r, (i * 0.754877) % 1, Math.sin(a) * r], i * 3)
      ai[i] = i
    }
    const g = new BufferGeometry().setAttribute('position', new BufferAttribute(p, 3)).setAttribute('a_i', new BufferAttribute(ai, 1))
    this.granos = new ShaderMaterial({
      vertexShader: GRANOS_V, fragmentShader: GRANOS_F, transparent: true, depthWrite: false,
      uniforms: { u_t: { value: 0 }, u_px: { value: 1 }, u_n: { value: new Float32Array(ESTRATOS) } },
    })
    const puntos = new Points(g, this.granos)
    puntos.frustumCulled = false
    this.escena.add(puntos)

    canvas.addEventListener('wheel', this.alRodar, { passive: false })
    canvas.addEventListener('pointerdown', this.alBajar)
    canvas.addEventListener('pointermove', this.alMover)
    canvas.addEventListener('pointerup', this.alSoltar)
    canvas.addEventListener('pointercancel', this.alSoltar)
    document.addEventListener('visibilitychange', this.pedir)
    this.ro = new ResizeObserver(() => {
      const w = canvas.clientWidth, h = canvas.clientHeight
      if (!w || !h) return
      this.gl.setSize(w, h, false)
      this.camara.aspect = w / h
      this.camara.updateProjectionMatrix()
      this.granos.uniforms.u_px.value = h * this.gl.getPixelRatio() * 0.035
      this.pedir()
    })
    this.ro.observe(canvas)
    this.regen = window.setInterval(this.regenerar, REGENERAR_MS)
  }

  /** El estado del juego. Barato: solo redibuja si cambió lo que se ve ya (estratos abiertos, quieta). */
  poner(d: Datos) {
    const antes = this.d
    this.d = d
    if (d.abiertos === antes.abiertos && d.quieta === antes.quieta) return
    for (let k = 0; k < ESTRATOS; k++) {
      const abierto = k < d.abiertos
      this.losas[k].material = abierto ? this.hielo : this.roca
      if (abierto && !this.pilas[k].visible) {
        this.h[k].fill(0)
        soltar(this.h[k], Math.round(LLENA * lleno(d.s[k])) + 4)
        this.subir(k)
      }
      this.pilas[k].visible = abierto
    }
    this.particulas()
    this.pedir()
  }

  /** Lleva la cámara al estrato k. */
  ir(k: number) {
    this.destino = Math.max(0, Math.min(ESTRATOS - 1, k))
    this.pedir()
  }

  destruir() {
    this.vivo = false
    cancelAnimationFrame(this.raf)
    clearTimeout(this.reloj)
    clearInterval(this.regen)
    this.ro.disconnect()
    const c = this.canvas
    c.removeEventListener('wheel', this.alRodar)
    c.removeEventListener('pointerdown', this.alBajar)
    c.removeEventListener('pointermove', this.alMover)
    c.removeEventListener('pointerup', this.alSoltar)
    c.removeEventListener('pointercancel', this.alSoltar)
    document.removeEventListener('visibilitychange', this.pedir)
    for (const p of this.pilas) (p.material.uniforms.u_alt.value as DataTexture).dispose()
    this.hielo.dispose()
    this.roca.dispose()
    this.escena.traverse((o) => {
      const m = o as Mesh<BufferGeometry, ShaderMaterial>
      m.geometry?.dispose()
      m.material?.dispose()
    })
    this.gl.dispose()
    this.gl.forceContextLoss() // suelta el contexto ya: si no, queda vivo hasta que pase el recolector
  }

  // ---------- heightmaps y partículas ----------

  private subir(k: number) {
    const h = this.h[k], u = this.pilas[k].material.uniforms, tex = u.u_alt.value as DataTexture
    ;(tex.image.data as Uint8Array).set(h) // estable: 0..3
    tex.needsUpdate = true
    let r = 1
    for (let x = C; x < N; x++) if (h[C * N + x]) r = x - C + 1
    u.u_radio.value = r / C
    u.u_alto.value = 0.12 + 0.7 * lleno(this.d.s[k])
  }

  /** A 2 Hz: cada mini pila recibe granos según su γ y se vuelve a subir. */
  private regenerar = () => {
    if (document.hidden) return
    for (let k = 0; k < this.d.abiertos; k++) {
      soltar(this.h[k], Math.max(1, Math.min(8, Math.round(this.d.gamma[k]))))
      this.subir(k)
    }
    this.particulas()
    if (this.d.abiertos) this.pedir()
  }

  /** Cuántas partículas caen sobre cada estrato: proporcional a γ_k, hasta llenar su parte del buffer. */
  private particulas() {
    const n = this.granos.uniforms.u_n.value as Float32Array
    for (let k = 0; k < ESTRATOS; k++) n[k] = k < this.d.abiertos ? Math.min(POR_HUECO, Math.round(30 * this.d.gamma[k])) : 0
  }

  // ---------- cuadros ----------

  /** Pide un cuadro porque cambió algo (cámara, estado, tamaño). */
  private pedir = () => {
    this.sucio = true
    this.esperar()
  }
  private esperar = () => {
    if (this.vivo && !this.raf && !document.hidden) this.raf = requestAnimationFrame(this.cuadro)
  }

  private cuadro = (ahora: number) => {
    this.raf = 0
    clearTimeout(this.reloj)
    // Si solo caen partículas, 30 fps como mucho (también en pantallas de 120 Hz).
    if (!this.sucio && ahora - this.antes < CUADRO_PARTICULAS_MS - 2) return this.esperar()
    this.sucio = false
    const dt = Math.min(0.1, (ahora - this.antes) / 1000)
    this.antes = ahora
    const falta = this.destino - this.pos
    const mueve = !this.arrastre && Math.abs(falta) > 1e-3
    if (!this.arrastre) this.pos = mueve && !this.d.quieta ? this.pos + falta * (1 - Math.exp(-dt * 10)) : this.destino
    const foco = Math.round(this.pos)
    if (foco !== this.foco) this.alFoco?.((this.foco = foco))
    const cae = this.d.abiertos > 0 && !this.d.quieta
    if (cae) this.granos.uniforms.u_t.value += dt

    // La cámara baja con `pos`; en pantallas angostas se aleja para que entre la losa.
    const y = -this.pos * SEP, f = Math.max(1, 1.2 / this.camara.aspect)
    this.camara.position.set(0, y + 3.4 * f, 9.6 * f)
    this.camara.lookAt(0, y + 0.45, 0)
    this.gl.render(this.escena, this.camara)

    if (this.alCuadro) {
      const w = this.canvas.clientWidth, h = this.canvas.clientHeight
      for (let k = 0; k < ESTRATOS; k++) {
        this.v.set(0, -k * SEP - ALTO / 2, RADIO * 0.866).project(this.camara)
        this.xy[k * 2] = ((this.v.x + 1) / 2) * w
        this.xy[k * 2 + 1] = ((1 - this.v.y) / 2) * h
      }
      this.alCuadro(this.xy)
    }
    if (mueve) this.pedir()
    else if (cae) this.reloj = window.setTimeout(this.esperar, CUADRO_PARTICULAS_MS - 13)
  }

  // ---------- rueda y arrastre: la cámara baja de estrato en estrato ----------

  private alRodar = (e: WheelEvent) => {
    e.preventDefault()
    this.rueda += e.deltaY
    if (Math.abs(this.rueda) < 50) return // un trackpad manda muchos eventos chicos
    this.ir(Math.round(this.destino) + Math.sign(this.rueda))
    this.rueda = 0
  }
  private alBajar = (e: PointerEvent) => {
    this.canvas.setPointerCapture(e.pointerId)
    this.arrastre = { y: e.clientY, pos: this.pos }
  }
  private alMover = (e: PointerEvent) => {
    if (!this.arrastre) return
    // Arrastrar hacia arriba = bajar, como al desplazar una página; media pantalla por estrato.
    const p = this.arrastre.pos + (this.arrastre.y - e.clientY) / (this.canvas.clientHeight * 0.5)
    this.pos = Math.max(-0.3, Math.min(ESTRATOS - 0.7, p))
    this.pedir()
  }
  private alSoltar = () => {
    if (!this.arrastre) return
    this.arrastre = null
    this.ir(Math.round(this.pos))
  }
}
