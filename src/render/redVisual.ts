// Bloque 9 de CORRECCIONES_CAPA1: la Red como pila 3D de cristal vista en diagonal. Cada nodo es una columna sobre una base
// de hielo; su altura es el nivel (0 a 4 cubos, cada uno del color de su nivel). Cerrado = escarcha opaca; anillo 3 = bloque
// de hielo grueso con grietas. Mismas reglas que los Estratos: un solo renderer, creado al entrar y destruido al salir,
// render a demanda (solo mientras algo se mueve), sin shadowMap, pixelRatio tope 1,5.
import {
  AdditiveBlending, BoxGeometry, BufferGeometry, Group, Mesh, PerspectiveCamera, PlaneGeometry, Raycaster, Scene,
  ShaderMaterial, Vector2, Vector3, WebGLRenderer,
} from 'three'

/** Cómo se ve un nodo: escarcha (cerrado), hielo (anillo 3 bajo la Escarcha), vacío (abierto sin niveles) o n cubos. */
export type Modo = 'escarcha' | 'hielo' | 'vacio' | 'cristal'
export interface Vista { modo: Modo; n: number }
export interface Datos {
  /** id → posición [x, y] en el rombo (y hacia arriba). */
  pos: Record<string, number[]>
  vecinos: Record<string, string[]>
  vista: Record<string, Vista>
  quieta: boolean
}

const LADO = 0.56, ALTO = 0.4, PASO = 0.46 // cubo y paso de la columna, en unidades de la grilla (1 = un nodo)
const BASE = 0.16
const ESCARCHA = 0.1, HIELO = 0.22 // losas de los cerrados: el anillo 3 más gruesa; las dos muy por debajo de un cubo
const AZ = Math.PI / 4, EL = (35 * Math.PI) / 180 // cámara en diagonal a ~35° de altura
const GIRO = 0.45, EL_MIN = 0.4, EL_MAX = 0.95 // cuánto deja rotar el arrastre
// Lo que tiene que entrar en pantalla: las puntas del rombo de radio 3 (con medio cubo de borde), de la base a la columna llena.
const CAJA = [[3.45, 0], [-3.45, 0], [0, 3.45], [0, -3.45]].flatMap(([x, z]) => [-0.2, 1.95].map((y) => [x, y, z]))
const CENTRO_Y = 0.7
const DERRUMBE_MS = 1300, LLEGA = 0.62 // duración y fracción en que el fragmento llega al vecino

const rgb = (hex: number) => [(hex >> 16) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255]

const V = `
varying vec2 v_uv; varying vec3 v_n; varying vec3 v_p; varying vec3 v_wp;
void main() {
  v_uv = uv;
  vec4 w = modelMatrix * vec4(position, 1.);
  v_wp = w.xyz;
  v_n = normalize(mat3(modelMatrix) * normal);
  vec4 mv = viewMatrix * w;
  v_p = mv.xyz;
  gl_Position = projectionMatrix * mv;
}`
// Entorno chico procedural (cielo frío arriba, noche abajo, dos bandas de luz): lo leen el reflejo y la refracción falsa.
const ENV = `
vec3 env(vec3 d) {
  float y = d.y * 0.5 + 0.5;
  vec3 c = mix(vec3(0.01, 0.02, 0.05), vec3(0.35, 0.6, 0.75), smoothstep(0.35, 1., y));
  c += vec3(0.9, 0.97, 1.) * smoothstep(0.985, 1., abs(sin(d.x * 2.6 + d.z * 1.3))) * smoothstep(0.4, 0.8, y);
  return c + vec3(0.7, 0.9, 1.) * pow(max(dot(d, normalize(vec3(-0.4, 0.8, 0.45))), 0.), 24.);
}`
// Cristal: facetas (bisel falso en el borde de cada cara), refracción y reflejo del entorno, brillo en las aristas.
const CRISTAL_F = `
uniform vec3 u_color; uniform float u_alfa; uniform float u_luz;
varying vec2 v_uv; varying vec3 v_n; varying vec3 v_p; varying vec3 v_wp;
${ENV}
void main() {
  vec3 n = normalize(v_n), ver = normalize(v_wp - cameraPosition);
  vec2 e2 = min(v_uv, 1. - v_uv);
  float e = min(e2.x, e2.y);
  float bisel = smoothstep(0.16, 0.0, e), arista = smoothstep(0.035, 0.0, e);
  float fr = pow(1. - abs(dot(n, -ver)), 2.);
  vec3 refr = env(refract(ver, n, 0.7)), refl = env(reflect(ver, n));
  float dentro = exp(-dot(v_uv - 0.5, v_uv - 0.5) * 5.);
  vec3 c = u_color * (0.25 + 0.9 * refr.b + 0.45 * dentro) * u_luz + refl * (0.25 + 0.75 * fr) + vec3(0.8, 0.95, 1.) * (bisel * 0.22 + arista * 0.9);
  gl_FragColor = vec4(c, clamp(u_alfa + fr * 0.3 + bisel * 0.25 + arista, 0., 1.));
}`
// Escarcha lisa (cerrados): losa mate con luz suave, arista fría y un grano fino de destellos en la cara de arriba.
// Sin ruido en manchas ni grietas: el protagonista es el cristal; esto es el suelo helado de donde sale.
const HIELO_F = `
uniform vec3 u_color; uniform float u_brillo;
varying vec2 v_uv; varying vec3 v_n; varying vec3 v_p; varying vec3 v_wp;
float h2(vec2 p) { return fract(sin(dot(p, vec2(12.98, 78.23))) * 43758.5); }
void main() {
  vec3 n = normalize(v_n), ver = normalize(v_wp - cameraPosition);
  float luz = 0.55 + 0.45 * max(dot(n, normalize(vec3(-0.4, 0.8, 0.45))), 0.);
  float arriba = step(0.5, n.y);
  vec2 e2 = min(v_uv, 1. - v_uv);
  float arista = smoothstep(0.07, 0.0, min(e2.x, e2.y));
  float fr = pow(1. - abs(dot(n, -ver)), 2.);
  float centro = 1. - length(v_uv - 0.5) * 0.5;
  float destello = step(0.992, h2(floor(v_wp.xz * 70.))) * arriba * u_brillo;
  vec3 c = u_color * luz * mix(1., centro, arriba) + vec3(0.8, 0.93, 1.) * (arista * 0.3 + fr * 0.22 + destello * 0.7);
  gl_FragColor = vec4(c, 1.);
}`
// Halo de hover y de selección: caja apenas más grande, suma luz en los bordes de la silueta.
const HALO_F = `
uniform vec3 u_color; uniform float u_k;
varying vec2 v_uv; varying vec3 v_n; varying vec3 v_p; varying vec3 v_wp;
void main() {
  vec3 ver = normalize(v_wp - cameraPosition);
  float fr = pow(1. - abs(dot(normalize(v_n), -ver)), 1.5);
  vec2 e2 = min(v_uv, 1. - v_uv);
  float k = u_k * (fr * 0.8 + smoothstep(0.06, 0., min(e2.x, e2.y)) * 0.6);
  gl_FragColor = vec4(u_color * k, k); // alfa = luz: con el canvas transparente, el halo no tapa el fondo
}`
// El suelo: un resplandor frío debajo de la pila, sin sombra real.
const SUELO_F = `
varying vec2 v_uv;
void main() {
  float r = length(v_uv - 0.5) * 2.;
  gl_FragColor = vec4(0.35, 0.7, 0.85, smoothstep(1., 0., r) * 0.18);
}`

type Arrastre = { x: number; y: number; az: number; el: number; movio: boolean }
type Derrumbe = { id: string; t0: number; vecinos: string[]; congelados: Map<string, Vista> }

export class RedVisual {
  /** Se eligió un nodo con un clic sobre la escena. */
  alElegir?: (id: string) => void
  /** El puntero pasó a otro nodo (o a ninguno) sobre la escena. */
  alResaltar?: (id: string | null) => void
  /** Después de cada cuadro: x, y (px CSS) de la punta de cada columna, en el orden de `ids`, para los nombres HTML. */
  alCuadro?: (xy: Float32Array) => void

  ids: string[] = []
  private gl: WebGLRenderer
  private escena = new Scene()
  private camara = new PerspectiveCamera(32, 1, 0.1, 100)
  private cubo = new BoxGeometry(LADO, ALTO, LADO).translate(0, ALTO / 2, 0)
  private caja = new BoxGeometry(1, 1, 1).translate(0, 0.5, 0)
  private cristal: ShaderMaterial[]
  private fantasma: ShaderMaterial
  private escarcha: ShaderMaterial
  private hielo: ShaderMaterial
  private base: ShaderMaterial
  private halos: Mesh<BoxGeometry, ShaderMaterial>[]
  private fragmentos: Mesh[] = []
  private nodos = new Map<string, Group>()
  private visto = new Map<string, string>() // id → clave de lo que tiene armado su grupo
  private d: Datos = { pos: {}, vecinos: {}, vista: {}, quieta: false }
  private derrumbe: Derrumbe | null = null
  private hover: string | null = null
  private elegido: string | null = null
  private az = AZ
  private el = EL
  private arrastre: Arrastre | null = null
  private rc = new Raycaster()
  private v = new Vector3()
  private xy = new Float32Array(0)
  private raf = 0
  private vivo = true
  private ro: ResizeObserver

  constructor(private canvas: HTMLCanvasElement, colores: number[]) {
    const movil = matchMedia('(pointer: coarse)').matches
    this.gl = new WebGLRenderer({ canvas, alpha: true, antialias: !movil })
    this.gl.setPixelRatio(Math.min(devicePixelRatio, movil ? 1 : 1.5))
    this.gl.shadowMap.enabled = false

    const mat = (f: string, u: Record<string, unknown>, extra: object = {}) =>
      new ShaderMaterial({ vertexShader: V, fragmentShader: f, uniforms: Object.fromEntries(Object.entries(u).map(([k, value]) => [k, { value }])), ...extra })
    const vidrio = { transparent: true, depthWrite: false }
    this.cristal = colores.map((c) => mat(CRISTAL_F, { u_color: rgb(c), u_alfa: 0.55, u_luz: 1 }, vidrio))
    this.fantasma = mat(CRISTAL_F, { u_color: rgb(0x9fe3f5), u_alfa: 0.1, u_luz: 0.45 }, vidrio)
    this.escarcha = mat(HIELO_F, { u_color: rgb(0x31495b), u_brillo: 1 })
    this.hielo = mat(HIELO_F, { u_color: rgb(0x22384a), u_brillo: 0.6 })
    this.base = mat(HIELO_F, { u_color: rgb(0x14222f), u_brillo: 0 })
    this.halos = [0.55, 1].map((k) => {
      const h = new Mesh(this.caja, mat(HALO_F, { u_color: rgb(0x9fe3f5), u_k: k }, { transparent: true, depthWrite: false, blending: AdditiveBlending }))
      h.visible = false
      this.escena.add(h)
      return h
    })
    for (let i = 0; i < 4; i++) {
      const f = new Mesh(this.cubo, this.cristal[3])
      f.visible = false
      this.fragmentos.push(f)
      this.escena.add(f)
    }
    const suelo = new Mesh(
      new PlaneGeometry(9, 9).rotateX(-Math.PI / 2),
      new ShaderMaterial({ vertexShader: V, fragmentShader: SUELO_F, transparent: true, depthWrite: false }),
    )
    suelo.position.y = -BASE - 0.01
    this.escena.add(suelo)

    canvas.addEventListener('pointerdown', this.alBajar)
    canvas.addEventListener('pointermove', this.alMover)
    canvas.addEventListener('pointerup', this.alSoltar)
    canvas.addEventListener('pointercancel', this.alCancelar)
    canvas.addEventListener('pointerleave', this.alSalir)
    document.addEventListener('visibilitychange', this.pedir)
    this.ro = new ResizeObserver(() => {
      const w = canvas.clientWidth, h = canvas.clientHeight
      if (!w || !h) return
      this.gl.setSize(w, h, false)
      this.camara.aspect = w / h
      this.camara.updateProjectionMatrix()
      this.pedir()
    })
    this.ro.observe(canvas)
  }

  /** El estado del juego. Barato: solo rearma los nodos cuya vista cambió. */
  poner(d: Datos) {
    if (!this.ids.length) {
      this.ids = Object.keys(d.pos)
      this.xy = new Float32Array(this.ids.length * 2)
    }
    const quieta = this.d.quieta
    this.d = d
    let cambio = d.quieta !== quieta
    for (const id of this.ids) cambio = this.armar(id) || cambio
    if (cambio) this.pedir() // el juego llama en cada tick: sin cambios, no se dibuja
  }

  /** El nodo id llegó a 4: la columna se desarma y manda un fragmento a cada vecino, que se despierta cuando le llega. */
  derrumbar(id: string) {
    if (this.d.quieta) return
    const vecinos = this.d.vecinos[id] ?? []
    // Lo que se veía antes de la compra: los vecinos siguen así hasta que les llega su fragmento.
    const congelados = new Map(vecinos.map((v) => [v, this.d.vista[v]]))
    this.derrumbe = { id, t0: performance.now(), vecinos, congelados }
    this.pedir()
  }

  resaltar(id: string | null) {
    if (id === this.hover) return
    this.hover = id
    this.alResaltar?.(id)
    this.canvas.style.cursor = id ? 'pointer' : ''
    this.pedir()
  }
  elegir(id: string | null) {
    this.elegido = id
    this.pedir()
  }

  destruir() {
    this.vivo = false
    cancelAnimationFrame(this.raf)
    this.ro.disconnect()
    const c = this.canvas
    c.removeEventListener('pointerdown', this.alBajar)
    c.removeEventListener('pointermove', this.alMover)
    c.removeEventListener('pointerup', this.alSoltar)
    c.removeEventListener('pointercancel', this.alCancelar)
    c.removeEventListener('pointerleave', this.alSalir)
    document.removeEventListener('visibilitychange', this.pedir)
    for (const m of [...this.cristal, this.fantasma, this.escarcha, this.hielo, this.base]) m.dispose()
    this.escena.traverse((o) => {
      const m = o as Mesh<BufferGeometry, ShaderMaterial>
      m.geometry?.dispose()
      m.material?.dispose()
    })
    this.gl.dispose()
    this.gl.forceContextLoss() // suelta el contexto ya: si no, queda vivo hasta que pase el recolector
  }

  // ---------- nodos ----------

  private vistaDe(id: string): Vista {
    return this.derrumbe?.congelados.get(id) ?? this.d.vista[id] ?? { modo: 'escarcha', n: 0 }
  }

  /** Rearma el grupo del nodo si cambió lo que tiene que mostrar. Geometrías y materiales son compartidos. */
  private armar(id: string): boolean {
    const v = this.vistaDe(id), clave = `${v.modo}${v.n}`
    if (this.visto.get(id) === clave) return false
    this.visto.set(id, clave)
    let g = this.nodos.get(id)
    if (!g) {
      g = new Group()
      const [x, y] = this.d.pos[id]
      g.position.set(x, 0, -y)
      g.userData.id = id
      this.nodos.set(id, g)
      this.escena.add(g)
    }
    g.clear()
    const caja = (m: ShaderMaterial, l: number, a: number, y = 0) => {
      const b = new Mesh(this.caja, m)
      b.scale.set(l, a, l)
      b.position.y = y
      g.add(b)
    }
    if (v.modo === 'vacio' || v.modo === 'cristal') caja(this.base, 0.84, BASE, -BASE) // los cerrados son su propia losa
    if (v.modo === 'escarcha') caja(this.escarcha, 0.74, ESCARCHA, -BASE)
    else if (v.modo === 'hielo') caja(this.hielo, 0.84, HIELO, -BASE)
    else if (v.modo === 'vacio') g.add(new Mesh(this.cubo, this.fantasma))
    else for (let i = 0; i < v.n; i++) {
      const c = new Mesh(this.cubo, this.cristal[i])
      c.position.y = i * PASO
      c.userData.i = i
      g.add(c)
    }
    return true
  }

  private alto(id: string) {
    const v = this.vistaDe(id)
    return v.modo === 'hielo' ? HIELO - BASE : v.modo === 'escarcha' ? ESCARCHA - BASE : Math.max(1, v.n) * PASO - (PASO - ALTO)
  }

  // ---------- cuadros (solo cuando algo cambió o se mueve) ----------

  private pedir = () => {
    if (this.vivo && !this.raf && !document.hidden) this.raf = requestAnimationFrame(this.cuadro)
  }

  private cuadro = (ahora: number) => {
    this.raf = 0
    const sigue = this.animar(ahora)

    this.encuadrar()

    const hover = this.hover === this.elegido ? null : this.hover
    for (const [h, id] of [[this.halos[0], hover], [this.halos[1], this.elegido]] as const) {
      const g = id ? this.nodos.get(id) : undefined
      h.visible = !!g
      if (!g) continue
      const a = this.alto(id!) + 0.12
      h.position.set(g.position.x, -BASE - 0.02, g.position.z)
      h.scale.set(0.92, a + BASE + 0.02, 0.92)
    }

    this.gl.render(this.escena, this.camara)

    if (this.alCuadro) {
      const w = this.canvas.clientWidth, h = this.canvas.clientHeight
      this.ids.forEach((id, i) => {
        const g = this.nodos.get(id)!
        this.v.set(g.position.x, this.alto(id) + 0.08, g.position.z).project(this.camara)
        this.xy[i * 2] = ((this.v.x + 1) / 2) * w
        this.xy[i * 2 + 1] = ((1 - this.v.y) / 2) * h
      })
      this.alCuadro(this.xy)
    }
    if (sigue) this.pedir()
  }

  /** La cámara mira la pila desde (az, el) a la distancia justa para que la caja de la pila llene la escena, con lugar para los nombres. */
  private encuadrar() {
    const dir = new Vector3(Math.sin(this.az) * Math.cos(this.el), Math.sin(this.el), Math.cos(this.az) * Math.cos(this.el))
    let dist = 12
    for (let i = 0; i < 3; i++) { // la proyección no es lineal en la distancia: tres pasadas alcanzan
      this.camara.position.copy(dir).multiplyScalar(dist).add(this.v.set(0, CENTRO_Y, 0))
      this.camara.lookAt(0, CENTRO_Y, 0)
      this.camara.updateMatrixWorld()
      let m = 0
      for (const [x, y, z] of CAJA) {
        this.v.set(x, y, z).project(this.camara)
        m = Math.max(m, Math.abs(this.v.x), Math.abs(this.v.y) * 1.08)
      }
      dist *= 0.35 + 0.65 * (m / 0.94)
    }
  }

  /** El derrumbe: los cubos se separan y tiemblan, un fragmento vuela a cada vecino en arco y la columna se vuelve a apilar. */
  private animar(ahora: number) {
    const d = this.derrumbe
    if (!d) return false
    const g = this.nodos.get(d.id)
    const t = Math.min(1, (ahora - d.t0) / DERRUMBE_MS)
    if (!g) return false
    // Separación: sube rápido, se mantiene mientras vuelan los fragmentos, baja al final.
    const abre = Math.min(1, t / 0.18) * (1 - Math.max(0, (t - 0.7) / 0.3) ** 2)
    for (const c of g.children) {
      const i = c.userData.i as number | undefined
      if (i === undefined) continue
      const temblor = Math.sin(ahora * 0.09 + i * 2) * 0.03 * abre
      c.position.set(temblor * (i % 2 ? 1 : -1), i * PASO + i * 0.22 * abre, temblor * (i % 2 ? -1 : 1))
      c.rotation.y = (i % 2 ? 1 : -1) * 0.5 * abre
    }
    const tope = 3 * PASO + 0.66
    d.vecinos.forEach((id, k) => {
      const f = this.fragmentos[k], o = this.nodos.get(id)
      if (!o) return
      const u = Math.max(0, Math.min(1, (t - 0.12) / (LLEGA - 0.12)))
      f.visible = u > 0 && u < 1
      f.scale.setScalar(0.42)
      f.position.set(g.position.x + (o.position.x - g.position.x) * u, tope * (1 - u) + 1.4 * Math.sin(Math.PI * u), g.position.z + (o.position.z - g.position.z) * u)
      f.rotation.set(u * 5, u * 7, 0)
      if (u >= 1 && d.congelados.delete(id)) this.armar(id)
    })
    if (t < 1) return true
    for (const f of this.fragmentos) f.visible = false
    this.derrumbe = null
    for (const id of d.vecinos) this.armar(id)
    this.visto.delete(d.id) // los cubos vuelven a su lugar
    this.armar(d.id)
    return false
  }

  // ---------- puntero: arrastrar rota un poco, clic elige ----------

  private tocado(e: PointerEvent) {
    const r = this.canvas.getBoundingClientRect()
    this.rc.setFromCamera(new Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), this.camara)
    for (const hit of this.rc.intersectObjects([...this.nodos.values()], true)) {
      const id = hit.object.parent?.userData.id as string | undefined
      if (id) return id
    }
    return null
  }
  private alBajar = (e: PointerEvent) => {
    this.canvas.setPointerCapture(e.pointerId)
    this.arrastre = { x: e.clientX, y: e.clientY, az: this.az, el: this.el, movio: false }
  }
  private alMover = (e: PointerEvent) => {
    const a = this.arrastre
    if (!a) return this.resaltar(this.tocado(e))
    const dx = e.clientX - a.x, dy = e.clientY - a.y
    if (!a.movio && Math.hypot(dx, dy) < 5) return
    a.movio = true
    const h = this.canvas.clientHeight
    this.az = Math.max(AZ - GIRO, Math.min(AZ + GIRO, a.az - (dx / h) * 1.5))
    this.el = Math.max(EL_MIN, Math.min(EL_MAX, a.el + (dy / h) * 1.5))
    this.pedir()
  }
  private alSoltar = (e: PointerEvent) => {
    const a = this.arrastre
    this.arrastre = null
    if (a && !a.movio) {
      const id = this.tocado(e)
      if (id) this.alElegir?.(id)
    }
  }
  private alCancelar = () => (this.arrastre = null)
  private alSalir = () => {
    if (!this.arrastre) this.resaltar(null)
  }
}
