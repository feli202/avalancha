// El dibujo de la pila con WebGL2, sin worker ni economía: lo usan la pila del juego (pilaVisual.ts) y las mini pilas
// de los logros (miniPilas.ts). Dos pasadas: la grilla de 513×513 (color y luz por celda) y la pantalla.
import { LADO } from './pila'
import { COLORES_PILA } from './paletas'

const DESTELLO_S = 0.3
const NIVELES = Math.floor(Math.log2(LADO)) + 1 // mipmaps de la grilla (el bloom)

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
uniform int u_efecto;
const vec4 PROPIA = vec4(0.3, 0.55, 0.05, 0.0); // luz propia base por altura: los raros brillan, el común no
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
  vec3 em = u_color[h] * (0.4 * b * b + PROPIA[h]) * vida;
  // Violeta, el más raro: el más luminoso, con un brillo que late despacio.
  if (h == 1) em += u_color[1] * (0.12 + 0.3 * b) * (0.8 + 0.2 * sin(u_ahora * 1.3 + r * 6.283));
  // Destello de derrumbe (SPEC 6.2): aditivo, intenso y del color de la celda. u_efecto cambia su forma (paletas.ts, EFECTOS).
  float dur = ${DESTELLO_S} * (u_efecto == 2 ? 3.0 : u_efecto == 5 ? 0.6 : 1.0);
  float f = clamp(1.0 - (u_ahora - t) / dur, 0.0, 1.0);
  vec3 fc = u_color[h] * 1.4 + 0.04;
  if (u_efecto == 1) fc = vec3(1.3);
  else if (u_efecto == 3) f *= 1.6 * step(0.65, hash(vec2(c) + floor(u_ahora * 24.0)));
  else if (u_efecto == 4) f = max(f, 0.8 * clamp(1.0 - abs(u_ahora - t - 0.3) / 0.12, 0.0, 1.0));
  else if (u_efecto == 5) fc = vec3(0.6, 1.0, 1.9);
  else if (u_efecto == 6) fc = u_color[(h + 1) & 3] * 1.7 + 0.04;
  else if (u_efecto == 7) fc = 1.4 * clamp(abs(fract(t * 0.7 + length(vec2(c) - ${LADO >> 1}.0) * 0.012 + vec3(0.0, 0.667, 0.333)) * 6.0 - 3.0) - 1.0, 0.0, 1.0);
  else if (u_efecto == 8) fc = vec3(1.7, 1.15, 0.35);
  em += u_destello * f * f * fc;
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
uniform int u_ss;        // muestras por eje y por píxel (supermuestreo al reducir)
uniform sampler2D u_viejo; // el cuadro de antes de saltar a una foto (sRGB)
uniform float u_fundido;   // 1 → 0 durante el fundido
const float L = ${LADO}.0;
const vec3 LUZ = vec3(-0.5, 0.55, 0.67); // arriba a la izquierda (sin normalizar)

vec3 dec(vec4 v) { return v.rgb * v.rgb * 4.0; }
vec4 celda(ivec2 c) { return all(greaterThanEqual(c, ivec2(0))) && all(lessThan(c, ivec2(${LADO}))) ? texelFetch(u_celdas, c, 0) : vec4(0.0); }
// Altura de una vecina; afuera de la pila cuenta como la propia, así el contorno no hace un barranco con su franja de luz.
float alt(ivec2 c, float propia) { float a = celda(c).a; return a > 0.0 ? a * 4.0 - 1.0 : propia; }
// Bloom: mips de la luz. Cerca: el resplandor de cada celda que brilla; lejos: un velo suave.
vec3 halo(vec2 q) {
  vec2 uv = q / L;
  // Fuera de la grilla, CLAMP_TO_EDGE estiraba la luz de la fila del borde en una cruz sobre el fondo: se apaga.
  vec2 fuera = max(-uv, uv - 1.0);
  float dentro = 1.0 - smoothstep(0.0, 0.01, max(fuera.x, fuera.y));
  return dentro * 0.22 * (dec(textureLod(u_luz, uv, 1.0)) + dec(textureLod(u_luz, uv, 2.0)))
       + dentro * 0.07 * (dec(textureLod(u_luz, uv, 3.5)) + dec(textureLod(u_luz, uv, 5.0)));
}
// Comprime suave lo que pasa de 0,8 según el canal más alto, sin cambiar el tono: por canal, un ámbar brillante
// se iba a amarillo y un coral a rosa (lo "pastel").
vec3 hombro(vec3 x) {
  float m = max(max(x.r, x.g), x.b);
  return m > 0.8 ? x * (0.8 + 0.2 * (1.0 - exp(-(m - 0.8) / 0.2))) / m : x;
}

// La arena en el punto q (en celdas): color ya multiplicado por su cobertura, y la cobertura (0 = fondo).
vec4 arenaEn(vec2 q) {
  ivec2 c = ivec2(floor(q));
  vec2 f = fract(q) - 0.5; // posición dentro de la celda
  vec4 v = celda(c);
  if (v.a <= 0.0) return vec4(0.0);
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
  float w = 1.0 - 0.6 * min(afuera, 1.0);
  return vec4((arena + em + mica * (0.3 + 0.7 * alb)) * w, w);
}

void main() {
  vec2 p = gl_FragCoord.xy - 0.5 * u_tam;
  // Fondo azul noche (#07080F): un poco más claro e índigo en el centro, esquinas casi negras.
  float r = length((p / u_tam.y) * vec2(0.85, 1.0) - vec2(0.0, 0.04));
  vec3 col = mix(vec3(0.0110, 0.0125, 0.0330), vec3(0.0021, 0.0024, 0.0048), smoothstep(0.0, 0.75, r));
  col *= 1.0 - 0.55 * smoothstep(0.6, 1.25, r);

  // Con la pila alejada (menos de ~2,5 px por celda) varias celdas caen en un píxel: se promedian u_ss × u_ss
  // muestras para que el centro no titile como ruido. Con celdas grandes, una sola: nítida.
  vec4 a = vec4(0.0);
  float n = float(u_ss);
  for (int i = 0; i < u_ss; i++)
    for (int j = 0; j < u_ss; j++)
      a += arenaEn((p + (vec2(i, j) + 0.5) / n - 0.5) / u_escala + L * 0.5);
  a /= n * n;
  col = col * (1.0 - a.a) + a.rgb;
  vec2 q = p / u_escala + L * 0.5;
  col = hombro(col + halo(q));
  // A sRGB, con un poco de ruido para que el degradado del fondo no haga escalones.
  col = mix(col * 12.92, 1.055 * pow(col, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, col));
  col += (hash(gl_FragCoord.xy + fract(u_ahora) * 97.0) - 0.5) / 255.0;
  if (u_fundido > 0.0) col = mix(col, texelFetch(u_viejo, ivec2(gl_FragCoord.xy), 0).rgb, u_fundido);
  o = vec4(col, 1.0);
}`

type Uniformes = Record<string, WebGLUniformLocation | null>

export class Lienzo {
  readonly gl: WebGL2RenderingContext | null
  private progCeldas: WebGLProgram | null = null
  private progPantalla: WebGLProgram | null = null
  private uniC: Uniformes = {}
  private uniP: Uniformes = {}
  private fbo: WebGLFramebuffer | null = null

  constructor(readonly canvas: HTMLCanvasElement | OffscreenCanvas) {
    const gl = (this.gl = canvas.getContext('webgl2', { alpha: false, antialias: false }) as WebGL2RenderingContext | null)
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
    this.progCeldas = programa(FRAG_CELDAS, ['u_alturas', 'u_derrumbe', 'u_ahora', 'u_destello', 'u_brillo', 'u_color', 'u_efecto'], this.uniC)
    this.progPantalla = programa(FRAG_PANTALLA, ['u_celdas', 'u_luz', 'u_tam', 'u_escala', 'u_ahora', 'u_destello', 'u_dpr', 'u_brillo', 'u_ss', 'u_viejo', 'u_fundido'], this.uniP)
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
    gl.activeTexture(gl.TEXTURE4)
    gl.bindTexture(gl.TEXTURE_2D, gl.createTexture())
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, 1, 1, 0, gl.RGB, gl.UNSIGNED_BYTE, null)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)

    gl.useProgram(this.progCeldas)
    gl.uniform1i(this.uniC.u_alturas, 0)
    gl.uniform1i(this.uniC.u_derrumbe, 1)
    gl.useProgram(this.progPantalla)
    gl.uniform1i(this.uniP.u_celdas, 2)
    gl.uniform1i(this.uniP.u_luz, 3)
    gl.uniform1i(this.uniP.u_viejo, 4)
    this.colores = COLORES_PILA
    this.destello = 1
  }

  /** Colores sRGB de cada altura; el shader trabaja en lineal y convierte al final. */
  set colores(p: number[]) {
    const { gl } = this
    if (!gl) return
    gl.useProgram(this.progCeldas)
    gl.uniform3fv(this.uniC.u_color, p.flatMap((c) => [c >> 16, (c >> 8) & 255, c & 255].map((v) => (v / 255) ** 2.2)))
  }

  /** 0 apaga destellos y mica ("Reducir destellos"). */
  set destello(v: number) {
    const { gl } = this
    if (!gl) return
    gl.useProgram(this.progCeldas)
    gl.uniform1f(this.uniC.u_destello, v)
    gl.useProgram(this.progPantalla)
    gl.uniform1f(this.uniP.u_destello, v)
  }

  /** Índice en EFECTOS (paletas.ts). */
  set efecto(n: number) {
    const { gl } = this
    if (!gl) return
    gl.useProgram(this.progCeldas)
    gl.uniform1i(this.uniC.u_efecto, n)
  }

  /** Sube los granos de cada celda (si cambiaron) y el segundo del último derrumbe (negativo = nunca, afuera si no tiene granos). */
  subir(alturas: Uint8Array | null, tDerrumbe: Float32Array) {
    const { gl } = this
    if (!gl) return
    if (alturas) {
      gl.activeTexture(gl.TEXTURE0)
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, LADO, LADO, gl.RED, gl.UNSIGNED_BYTE, alturas)
    }
    gl.activeTexture(gl.TEXTURE1)
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, LADO, LADO, gl.RED, gl.FLOAT, tDerrumbe)
  }

  /** Lo que está en pantalla queda en u_viejo, para fundirlo con lo próximo. */
  guardarViejo() {
    const { gl, canvas } = this
    if (!gl) return
    gl.activeTexture(gl.TEXTURE4)
    gl.copyTexImage2D(gl.TEXTURE_2D, 0, gl.RGB, 0, 0, canvas.width, canvas.height, 0)
  }

  /** px: px reales por celda; fundido: 1 → 0 sobre u_viejo; ahora: segundos (los de tDerrumbe); dpr: px reales por px CSS. */
  pintar(px: number, brillos: number[], fundido: number, ahora: number, dpr: number) {
    const { gl, canvas, uniC, uniP } = this
    if (!gl) return
    // Pasada 1: color y luz de cada celda a la grilla, y los mipmaps de la luz para el bloom.
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo)
    gl.viewport(0, 0, LADO, LADO)
    gl.useProgram(this.progCeldas)
    gl.uniform1f(uniC.u_ahora, ahora)
    gl.uniform4fv(uniC.u_brillo, brillos)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.activeTexture(gl.TEXTURE3)
    gl.generateMipmap(gl.TEXTURE_2D)

    // Pasada 2: a pantalla.
    gl.viewport(0, 0, canvas.width, canvas.height)
    gl.useProgram(this.progPantalla)
    gl.uniform2f(uniP.u_tam, canvas.width, canvas.height)
    gl.uniform1f(uniP.u_escala, px)
    gl.uniform1f(uniP.u_fundido, fundido)
    gl.uniform1i(uniP.u_ss, px < 1 ? 3 : px < 2.5 ? 2 : 1)
    gl.uniform1f(uniP.u_ahora, ahora)
    gl.uniform1f(uniP.u_dpr, dpr)
    gl.uniform4fv(uniP.u_brillo, brillos)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
  }
}
