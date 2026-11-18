// El dibujo de la pila con WebGL2, sin worker ni economía: lo usan la pila del juego (pilaVisual.ts) y las mini pilas
// de los logros (miniPilas.ts). Dos pasadas: la grilla de 513×513 (color y luz por celda) y la pantalla.
import { LADO } from './pila'
import { COLORES_PILA } from './paletas'

const DESTELLO_S = 0.3
/** El número de cada fondo en el shader (fondoEn). Un fondo que no está acá se dibuja como Noche. */
const FONDO: Record<string, number> = { noche: 0, arenaSeca: 1, milimetrado: 2, desierto: 3, fractal: 4, hielo: 5, aurora: 6, vacio: 7 }

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
  // Estelas largas: Estela (2), Espejo (12) y Horizonte (13); Lupa (10), un poco más larga.
  float dur = ${DESTELLO_S} * (u_efecto == 2 || u_efecto >= 12 ? 3.0 : u_efecto == 10 ? 2.0 : u_efecto == 5 ? 0.6 : 1.0);
  float f = clamp(1.0 - (u_ahora - t) / dur, 0.0, 1.0);
  vec3 fc = u_color[h] * 1.4 + 0.04;
  if (u_efecto == 1) fc = vec3(1.3);
  else if (u_efecto == 3) f *= 1.6 * step(0.65, hash(vec2(c) + floor(u_ahora * 24.0)));
  else if (u_efecto == 4) f = max(f, 0.8 * clamp(1.0 - abs(u_ahora - t - 0.3) / 0.12, 0.0, 1.0));
  else if (u_efecto == 5) fc = vec3(0.6, 1.0, 1.9);
  else if (u_efecto == 6) fc = u_color[(h + 1) & 3] * 1.7 + 0.04;
  else if (u_efecto == 7) fc = 1.4 * clamp(abs(fract(t * 0.7 + length(vec2(c) - ${LADO >> 1}.0) * 0.012 + vec3(0.0, 0.667, 0.333)) * 6.0 - 3.0) - 1.0, 0.0, 1.0);
  else if (u_efecto == 8) fc = vec3(1.7, 1.15, 0.35);
  // Logros secretos. Rayo: azul eléctrico que parpadea en anillos; Lupa: la celda encendida con un brillo de vidrio;
  // Arcoíris vivo: el tono gira con el tiempo y el ángulo; Espejo: el color de la altura opuesta; Horizonte: atardecer de abajo arriba.
  else if (u_efecto == 9) { fc = vec3(0.7, 0.95, 2.2); f *= 1.3 * step(0.45, hash(vec2(floor(u_ahora * 30.0), floor(length(vec2(c) - ${LADO >> 1}.0) * 0.25)))); }
  else if (u_efecto == 10) fc = u_color[h] * 2.2 + 0.25;
  else if (u_efecto == 11) fc = 1.4 * clamp(abs(fract(u_ahora * 0.25 + atan(float(c.y - ${LADO >> 1}), float(c.x - ${LADO >> 1})) / 6.2832 + vec3(0.0, 0.667, 0.333)) * 6.0 - 3.0) - 1.0, 0.0, 1.0);
  else if (u_efecto == 12) fc = u_color[3 - h] * 1.6 + 0.04;
  else if (u_efecto == 13) fc = mix(vec3(1.9, 0.75, 0.2), vec3(0.55, 0.3, 1.5), float(c.y) / ${LADO}.0);
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
uniform float u_foco;      // zoom: radio en px del círculo que se ve nítido; 0 = todo nítido
uniform int u_fondo;       // FONDO en lienzo.ts
uniform sampler2D u_fondoPila; // R8: la pila llena (altura + 1, 0 = afuera) para el fondo Fractal
uniform vec3 u_colorP[4];  // los colores de la arena (lineales), para el fondo Fractal
uniform int u_defecto;     // SPEC_CAPA1 §8: 0 ninguno, 1 grieta (Vacancia), 2 corrimiento (Dislocación), 3 espejo (Macla), 4 manchas (Impureza)
uniform float u_escarcha;  // SPEC_CAPA1 §9: 0 sin Escarcha → 1 gruesa
const float L = ${LADO}.0;
const vec3 LUZ = vec3(-0.5, 0.55, 0.67); // arriba a la izquierda (sin normalizar)

vec3 dec(vec4 v) { return v.rgb * v.rgb * 4.0; }
vec4 celda(ivec2 c) { return all(greaterThanEqual(c, ivec2(0))) && all(lessThan(c, ivec2(${LADO}))) ? texelFetch(u_celdas, c, 0) : vec4(0.0); }
// Bloom: mips de la luz. Cerca: el resplandor de cada celda que brilla; lejos: un velo suave.
// La textura de luz mide justo la grilla (el cuadrado que circunscribe la pila llena), sin margen para el halo:
// cortarlo en el borde de la grilla dejaba rectas donde el círculo toca el cuadrado. Afuera se lee la fila del
// borde (CLAMP_TO_EDGE) y cada mip se apaga redondo, a 1,5 texeles suyos del círculo de la pila.
float redondo(vec2 q, float lod) { return 1.0 - smoothstep(0.0, 1.5 * exp2(lod), length(q - L * 0.5) - L * 0.5); }
vec3 halo(vec2 q) {
  if (redondo(q, 5.0) <= 0.0) return vec3(0.0);
  vec2 uv = q / L;
  return 0.22 * (redondo(q, 1.0) * dec(textureLod(u_luz, uv, 1.0)) + redondo(q, 2.0) * dec(textureLod(u_luz, uv, 2.0)))
       + 0.07 * (redondo(q, 3.5) * dec(textureLod(u_luz, uv, 3.5)) + redondo(q, 5.0) * dec(textureLod(u_luz, uv, 5.0)));
}
// Zoom, fuera del foco: la pila desenfocada (un mip de las celdas, de unos 8 px CSS de grano) y su cobertura
// (el alfa de la luz es 1 adentro de la pila). Sin relieve: una luz pareja.
vec4 lejos(vec2 q) {
  vec2 uv = q / L;
  float lod = clamp(log2(8.0 * u_dpr / u_escala), 1.0, 6.0);
  vec4 l = textureLod(u_luz, uv, lod);
  return vec4(dec(textureLod(u_celdas, uv, lod)) * 0.75 + 0.5 * dec(l), l.a) * redondo(q, lod); // la luz a la mitad: un destello no tapa la interfaz
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
  // Las cuatro vecinas, leídas una vez (relieve y contorno). Afuera de la pila la altura cuenta como la propia,
  // así el contorno no hace un barranco con su franja de luz.
  float al = celda(c - ivec2(1, 0)).a, ar = celda(c + ivec2(1, 0)).a, ad = celda(c - ivec2(0, 1)).a, au = celda(c + ivec2(0, 1)).a;
  float hl = al > 0.0 ? al * 4.0 - 1.0 : h, hr = ar > 0.0 ? ar * 4.0 - 1.0 : h;
  float hd = ad > 0.0 ? ad * 4.0 - 1.0 : h, hu = au > 0.0 ? au * 4.0 - 1.0 : h;
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
  float afuera = step(al, 0.0) + step(ar, 0.0) + step(ad, 0.0) + step(au, 0.0);
  float w = 1.0 - 0.6 * min(afuera, 1.0);
  return vec4((arena + em + mica * (0.3 + 0.7 * alb)) * w, w);
}

// SPEC_CAPA1 §8: cada Defecto deforma la pila. q en celdas; d desde el centro.
float ruido(vec2 x) {
  vec2 i = floor(x), f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
// Vacancia: distancia con signo (en celdas) a una grieta quebrada que cruza la pila.
float grieta(vec2 d) { return d.y - (0.32 * d.x + 5.0 * sin(d.x * 0.045) + 2.5 * sin(d.x * 0.17 + 1.0) + 1.2 * sin(d.x * 0.6)); }
// Dislocación: el plano de deslizamiento; Macla: el plano de macla (inclinado: la pila ya es simétrica en los ejes).
float planoDesliz(vec2 d) { return d.y - 0.18 * d.x; }
const vec2 MACLA_N = vec2(0.9397, -0.342); // normal del plano de macla (70°)
float planoMacla(vec2 d) { return dot(d - vec2(L * 0.06, 0.0), MACLA_N); }
vec2 deforma(vec2 q) {
  vec2 d = q - L * 0.5;
  if (u_defecto == 1) return q + vec2(0.0, grieta(d) > 0.0 ? -1.5 : 1.5); // las dos mitades se separan
  if (u_defecto == 2 && planoDesliz(d) > 0.0) return q - vec2(14.0, 0.0);  // la mitad de arriba se corre 14 celdas
  if (u_defecto == 3) { float k = planoMacla(d); if (k > 0.0) return q - 2.0 * k * MACLA_N; } // espejo
  return q;
}
// Lo que se pinta encima: el borde de la grieta, la línea del plano o las manchas. a: la arena del píxel.
vec3 marcaDefecto(vec3 col, vec3 fondo, vec4 a, vec2 q) {
  vec2 d = q - L * 0.5;
  float w = max(0.7, 1.5 * u_dpr / u_escala); // al menos ~1,5 px CSS
  if (u_defecto == 1) {
    float g = abs(grieta(d));
    col = mix(col, fondo * 0.35, (1.0 - smoothstep(w * 0.6, w * 1.2, g)) * a.a);
    col += u_colorP[1] * 0.5 * exp(-g / (w * 2.0)) * a.a; // la luz violeta que asoma por la grieta
  } else if (u_defecto == 2 || u_defecto == 3) {
    float k = abs(u_defecto == 2 ? planoDesliz(d) : planoMacla(d));
    col += vec3(0.55, 0.85, 1.0) * 0.35 * exp(-k / w) * a.a;
  } else if (u_defecto == 4) {
    float n = 0.65 * ruido(q * 0.035) + 0.35 * ruido(q * 0.11 + 7.0);
    float m = smoothstep(0.58, 0.68, n) * a.a;
    col = mix(col, dot(col, vec3(0.3, 0.55, 0.15)) * vec3(0.6, 0.48, 0.32), 0.8 * m) * (1.0 - 0.35 * m);
  }
  return col;
}

// SPEC_CAPA1 §9: escarcha en el borde de la pila. La cobertura desenfocada (alfa de la luz, 1 adentro) baja cerca del
// borde: adentro, una franja fina que blanquea apenas la arena; afuera, un ribete de cristales. Más espesor, más ancho.
// Con Reducir destellos los cristales no titilan.
vec3 escarchaEn(vec3 col, vec4 a, vec2 q) {
  float lod = mix(1.0, 3.5, u_escarcha);
  float f = textureLod(u_luz, q / L, lod).a * redondo(q, lod);
  float adentro = (1.0 - f) * a.a, afuera = f * (1.0 - a.a);
  float brillo = hash(floor(q * 0.5)) * (0.75 + 0.25 * sin(u_ahora * 1.3 * u_destello + hash(floor(q)) * 6.3));
  vec3 hielo = vec3(0.62, 0.85, 1.0);
  col = mix(col, hielo * 0.9, 0.45 * u_escarcha * smoothstep(0.0, 0.6, adentro));
  return col + hielo * 0.16 * u_escarcha * smoothstep(0.05, 0.5, afuera) * (0.5 + brillo);
}

// Los fondos (Ajustes > Aspecto): oscuros y quietos o casi, para no competir con la pila. p: px desde el centro.
vec3 fondoEn(vec2 p) {
  if (u_fondo == 7) return vec3(0.0); // Vacío
  float r = length((p / u_tam.y) * vec2(0.85, 1.0) - vec2(0.0, 0.04));
  float vin = 1.0 - 0.55 * smoothstep(0.6, 1.25, r);
  vec2 css = p / u_dpr;
  vec2 uv = gl_FragCoord.xy / u_tam.y; // y desde abajo, en altos de pantalla
  if (u_fondo == 1) // Arena seca: marrón muy oscuro con grano fino de 1 px CSS
    return vec3(0.0105, 0.0064, 0.0034) * (0.7 + 0.6 * hash(floor(gl_FragCoord.xy / max(1.0, floor(u_dpr))))) * vin;
  if (u_fondo == 3) { // Desierto de noche: dos dunas en silueta y estrellas tenues
    vec3 c = mix(vec3(0.010, 0.010, 0.028), vec3(0.002, 0.002, 0.006), clamp(uv.y, 0.0, 1.0));
    c += 0.025 * step(0.9985, hash(floor(gl_FragCoord.xy / (2.0 * u_dpr))));
    float d1 = 0.24 + 0.05 * sin(uv.x * 3.1 + 1.0) + 0.02 * sin(uv.x * 7.3);
    float d2 = 0.15 + 0.04 * sin(uv.x * 4.7 + 3.0) + 0.015 * sin(uv.x * 11.0 + 0.5);
    float aa = 1.5 / u_tam.y;
    c = mix(c, vec3(0.0040, 0.0028, 0.0020), smoothstep(d1 + aa, d1 - aa, uv.y));
    return mix(c, vec3(0.0013, 0.0010, 0.0008), smoothstep(d2 + aa, d2 - aa, uv.y));
  }
  if (u_fondo == 5) { // Hielo: azul helado con grietas finas (bordes de Voronoi de unos 90 px CSS)
    vec2 q = css / 90.0, i = floor(q), f = fract(q);
    float d1 = 8.0, d2 = 8.0;
    for (int y = -1; y <= 1; y++)
      for (int x = -1; x <= 1; x++) {
        vec2 o = vec2(x, y), pt = o + vec2(hash(i + o), hash(i + o + 17.0)) - f;
        float d = dot(pt, pt);
        if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d;
      }
    float grieta = 1.0 - smoothstep(0.0, 0.015, sqrt(d2) - sqrt(d1));
    return (mix(vec3(0.010, 0.022, 0.045), vec3(0.002, 0.005, 0.012), smoothstep(0.0, 0.8, r)) + vec3(0.018, 0.035, 0.06) * grieta) * vin;
  }
  // Noche: azul noche (#07080F), un poco más claro e índigo en el centro, esquinas casi negras. Base de los demás.
  vec3 col = mix(vec3(0.0110, 0.0125, 0.0330), vec3(0.0021, 0.0024, 0.0048), smoothstep(0.0, 0.75, r)) * vin;
  if (u_fondo == 2) { // Papel milimetrado: líneas cada 8 px CSS, más marcadas cada 40
    vec2 g = abs(fract(css / 8.0 + 0.5) - 0.5) * 8.0, G = abs(fract(css / 40.0 + 0.5) - 0.5) * 40.0;
    float l = 0.45 * max(1.0 - min(g.x, g.y) * u_dpr, 0.0) + max(1.0 - min(G.x, G.y) * u_dpr, 0.0);
    col += vec3(0.005, 0.008, 0.018) * l * vin;
  } else if (u_fondo == 4) { // Fractal: la pila llena, muy tenue, cubriendo la pantalla
    vec2 q = p * L / length(u_tam) + L * 0.5;
    int h = int(texelFetch(u_fondoPila, clamp(ivec2(q), ivec2(0), ivec2(${LADO - 1})), 0).r * 255.0 + 0.5);
    if (h > 0) col += u_colorP[min(h - 1, 3)] * 0.035 * vin;
  } else if (u_fondo == 6) { // Aurora: bandas verde y violeta que ondulan muy lento (quietas con Reducir destellos)
    float t = u_ahora * u_destello;
    float w = 0.08 * sin(uv.x * 2.3 + t * 0.07) + 0.03 * sin(uv.x * 5.1 - t * 0.05);
    float b1 = exp(-pow((uv.y - 0.74 - w) / 0.08, 2.0)), b2 = exp(-pow((uv.y - 0.6 + 0.7 * w) / 0.06, 2.0));
    col += (vec3(0.003, 0.026, 0.014) * b1 + vec3(0.018, 0.005, 0.032) * b2) * (0.8 + 0.2 * sin(uv.x * 9.0 + t * 0.1));
  }
  return col;
}

void main() {
  vec2 p = gl_FragCoord.xy - 0.5 * u_tam;
  vec3 col = fondoEn(p);

  // Con la pila alejada (menos de ~2,5 px por celda) varias celdas caen en un píxel: se promedian u_ss × u_ss
  // muestras para que el centro no titile como ruido. Con celdas grandes, una sola: nítida.
  vec2 q = p / u_escala + L * 0.5;
  // Zoom: 0 dentro del foco, 1 afuera, con un borde suave.
  float m = u_foco > 0.0 ? smoothstep(u_foco, u_foco * 1.3, length(p)) : 0.0;
  vec3 fondo = col;
  // Rendimiento: fuera del círculo inscrito de la grilla no hay arena (borde circular, pila.ts) y no se muestrea.
  // En pantallas anchas las esquinas son más de la mitad de los píxeles. El margen cubre el corrimiento de las muestras.
  if (m < 1.0 && length(q - L * 0.5) < L * 0.5 + 2.0 + 1.0 / u_escala) {
    vec4 a = vec4(0.0);
    float n = float(u_ss);
    for (int i = 0; i < u_ss; i++)
      for (int j = 0; j < u_ss; j++)
        a += arenaEn(deforma((p + (vec2(i, j) + 0.5) / n - 0.5) / u_escala + L * 0.5));
    a /= n * n;
    col = col * (1.0 - a.a) + a.rgb;
    if (u_defecto > 0) col = marcaDefecto(col, fondo, a, q);
    if (u_escarcha > 0.0) col = escarchaEn(col, a, q);
  }
  // El halo y la pila desenfocada se apagan antes del borde del canvas (en móvil no llega al borde de la ventana).
  vec2 e = min(gl_FragCoord.xy, u_tam - gl_FragCoord.xy);
  float borde = smoothstep(0.0, 0.08 * min(u_tam.x, u_tam.y), min(e.x, e.y));
  vec3 h = halo(q) * borde;
  col += h;
  if (m > 0.0) {
    // Zoom, fuera del foco: desenfocada y más oscura.
    vec4 b = lejos(q);
    col = mix(col, fondo * (1.0 - b.a) + (b.rgb * borde + h) * 0.3, m);
  }
  col = hombro(col);
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

  /** I7: el contexto volvió después de perderse; lo dibujado se sube de nuevo (PilaVisual). */
  alRestaurar?: () => void
  private valores = { colores: COLORES_PILA, destello: 1, efecto: 0, fondo: 'noche', fondoPila: null as Uint8Array | null, defecto: 0, escarcha: 0 }

  constructor(readonly canvas: HTMLCanvasElement | OffscreenCanvas) {
    this.gl = canvas.getContext('webgl2', { alpha: false, antialias: false }) as WebGL2RenderingContext | null
    if (!this.gl) {
      console.error('WebGL2 no disponible: la pila no se dibuja')
      return
    }
    // Driver, cambio de GPU, celular que vuelve de segundo plano: sin preventDefault el contexto no vuelve nunca.
    canvas.addEventListener('webglcontextlost', (e) => e.preventDefault())
    canvas.addEventListener('webglcontextrestored', () => {
      this.armar()
      this.alRestaurar?.()
    })
    this.armar()
  }

  /** Programas, texturas y uniformes: al crear y al recuperar el contexto. */
  private armar() {
    const gl = this.gl!
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
    this.progPantalla = programa(FRAG_PANTALLA, ['u_celdas', 'u_luz', 'u_tam', 'u_escala', 'u_ahora', 'u_destello', 'u_dpr', 'u_brillo', 'u_ss', 'u_viejo', 'u_fundido', 'u_foco', 'u_fondo', 'u_fondoPila', 'u_colorP', 'u_defecto', 'u_escarcha'], this.uniP)
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
    const celdas = textura(2, gl.RGBA8, NIVELES) // con mipmaps: la pila desenfocada fuera del foco (zoom)
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
    textura(5, gl.R8) // la pila llena del fondo Fractal

    gl.useProgram(this.progCeldas)
    gl.uniform1i(this.uniC.u_alturas, 0)
    gl.uniform1i(this.uniC.u_derrumbe, 1)
    gl.useProgram(this.progPantalla)
    gl.uniform1i(this.uniP.u_celdas, 2)
    gl.uniform1i(this.uniP.u_luz, 3)
    gl.uniform1i(this.uniP.u_viejo, 4)
    gl.uniform1i(this.uniP.u_fondoPila, 5)
    this.colores = this.valores.colores
    this.destello = this.valores.destello
    this.efecto = this.valores.efecto
    this.fondo = this.valores.fondo
    this.defecto = this.valores.defecto
    this.escarcha = this.valores.escarcha
    if (this.valores.fondoPila) this.fondoPila(this.valores.fondoPila)
  }

  /** Colores sRGB de cada altura; el shader trabaja en lineal y convierte al final. */
  set colores(p: number[]) {
    this.valores.colores = p
    const { gl } = this
    if (!gl) return
    gl.useProgram(this.progCeldas)
    const lineales = p.flatMap((c) => [c >> 16, (c >> 8) & 255, c & 255].map((v) => (v / 255) ** 2.2))
    gl.uniform3fv(this.uniC.u_color, lineales)
    gl.useProgram(this.progPantalla)
    gl.uniform3fv(this.uniP.u_colorP, lineales)
  }

  /** Id de FONDOS (paletas.ts). El Fractal necesita además fondoPila. */
  set fondo(id: string) {
    this.valores.fondo = id
    const { gl } = this
    if (!gl) return
    gl.useProgram(this.progPantalla)
    gl.uniform1i(this.uniP.u_fondo, FONDO[id] ?? 0)
  }

  /** La pila llena para el fondo Fractal: por celda, altura + 1 (0 = afuera). */
  fondoPila(celdas: Uint8Array) {
    this.valores.fondoPila = celdas
    const { gl } = this
    if (!gl) return
    gl.activeTexture(gl.TEXTURE5)
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, LADO, LADO, gl.RED, gl.UNSIGNED_BYTE, celdas)
  }

  /** 0 apaga destellos y mica ("Reducir destellos"). */
  set destello(v: number) {
    this.valores.destello = v
    const { gl } = this
    if (!gl) return
    gl.useProgram(this.progCeldas)
    gl.uniform1f(this.uniC.u_destello, v)
    gl.useProgram(this.progPantalla)
    gl.uniform1f(this.uniP.u_destello, v)
  }

  /** SPEC_CAPA1 §8: cómo deforma la pila el Defecto en curso (0 ninguno, 1..4 en el orden de DEFECTOS). */
  set defecto(n: number) {
    this.valores.defecto = n
    const { gl } = this
    if (!gl) return
    gl.useProgram(this.progPantalla)
    gl.uniform1i(this.uniP.u_defecto, n)
  }

  /** SPEC_CAPA1 §9: espesor visual de la escarcha del borde, 0..1. */
  set escarcha(x: number) {
    this.valores.escarcha = x
    const { gl } = this
    if (!gl) return
    gl.useProgram(this.progPantalla)
    gl.uniform1f(this.uniP.u_escarcha, x)
  }

  /** Índice en EFECTOS (paletas.ts). */
  set efecto(n: number) {
    this.valores.efecto = n
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

  /** px: px reales por celda; fundido: 1 → 0 sobre u_viejo; ahora: segundos (los de tDerrumbe); dpr: px reales por px CSS;
   * foco: radio en px reales del círculo nítido (zoom), 0 = todo nítido. */
  pintar(px: number, brillos: number[], fundido: number, ahora: number, dpr: number, foco = 0) {
    const { gl, canvas, uniC, uniP } = this
    if (!gl || gl.isContextLost()) return
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
    if (foco) {
      gl.activeTexture(gl.TEXTURE2)
      gl.generateMipmap(gl.TEXTURE_2D)
    }

    // Pasada 2: a pantalla.
    gl.viewport(0, 0, canvas.width, canvas.height)
    gl.useProgram(this.progPantalla)
    gl.uniform2f(uniP.u_tam, canvas.width, canvas.height)
    gl.uniform1f(uniP.u_escala, px)
    gl.uniform1f(uniP.u_fundido, fundido)
    gl.uniform1f(uniP.u_foco, foco)
    gl.uniform1i(uniP.u_ss, px < 1 ? 3 : px < 2.5 ? 2 : 1)
    gl.uniform1f(uniP.u_ahora, ahora)
    gl.uniform1f(uniP.u_dpr, dpr)
    gl.uniform4fv(uniP.u_brillo, brillos)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
  }
}
