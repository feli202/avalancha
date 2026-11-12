// Estilo "Cristal" de la pila (Pulido 1). SIN USAR: reservado para la Capa 1, Cristalización.
// Es el sombreado de la pasada a pantalla. Para usarlo: reemplazar el bloque de sombreado de FRAG_PANTALLA en
// pilaVisual.ts por CRISTAL. Espera las mismas variables que ese main(): q (posición en celdas), c, f (posición
// dentro de la celda, -0,5..0,5), v (texel de u_celdas), e (color lineal de la celda), alt (0..3), aa, forma, rc,
// Lz (luz normalizada), col (fondo), y las funciones dec, celda y halo. Usa además GRADIENTE, que se agrega antes de main().

/** Gradiente de altura alrededor de q (para el relieve con celdas chicas). */
export const GRADIENTE = `
vec2 gradiente(vec2 q) {
  vec2 b = q - 0.5; ivec2 c = ivec2(floor(b)); vec2 w = fract(b);
  vec4 h = vec4(celda(c).a, celda(c + ivec2(1, 0)).a, celda(c + ivec2(0, 1)).a, celda(c + ivec2(1, 1)).a) * 4.0 - 1.0;
  vec2 m = w * w * (3.0 - 2.0 * w), dm = 6.0 * w * (1.0 - w);
  return vec2(mix(h.y - h.x, h.w - h.z, m.y) * dm.x, mix(h.z - h.x, h.w - h.y, m.x) * dm.y);
}`

/** Gemas biseladas con brillo especular, luz interior y destellos en estrella; bloom medio. */
export const CRISTAL = `
  vec2 af = abs(f);
  float borde = 0.5 - max(af.x, af.y);
  float bv = (1.0 - smoothstep(0.0, 0.17 + 0.04 * alt, borde)) * forma;
  vec2 dir = af.x > af.y ? vec2(sign(f.x), 0.0) : vec2(0.0, sign(f.y));
  vec3 N = normalize(vec3(dir * bv * (0.9 + 0.3 * alt) - gradiente(q) * 0.3 * (1.0 - forma), 1.0));
  float dif = max(dot(N, Lz), 0.0);
  float esp = pow(max(dot(N, normalize(Lz + vec3(0.0, 0.0, 1.0))), 0.0), 70.0);
  vec2 fi = f - vec2(0.12, -0.12);
  float interior = exp(-dot(fi, fi) * 6.0) * forma;
  float ciclo = u_ahora * 0.12 + rc * 7.0;
  float vivo = u_destello * step(0.975, hash(vec2(c) + floor(ciclo))) * sin(3.1416 * fract(ciclo));
  float estrella = exp(-af.x * 40.0) * exp(-af.y * 5.0) + exp(-af.y * 40.0) * exp(-af.x * 5.0);
  vec3 g = e * (0.25 + 0.8 * dif + 0.5 * interior) + (esp * 0.9 + vivo * mix(0.5, 1.5 * estrella, forma)) * (0.4 + 0.6 * e);
  float junta = mix(1.0, smoothstep(0.0, 0.03 + aa, borde), forma);
  if (v.a > 0.0) col = mix(col, g, junta);
  col += halo(q, 0.2, 0.1);
  col *= 1.1;
`
