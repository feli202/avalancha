// Bloque 9 (v3) de CORRECCIONES_CAPA1: cada nodo de la Red es una mini pila abeliana, su propio mandala, teñido con el
// color de su nivel. Como las caras del Relicario: el brillo va al revés de la frecuencia (3 granos, lo más común, oscuro).
const G = 41, C = (G - 1) / 2
const fuera = (x: number, y: number) => Math.hypot(x - C, y - C) > C - 0.5

/** Ruido determinista en [0, 1). */
export const h = (i: number, k = 1) => { const s = Math.sin(i * 127.1 + k * 311.7) * 43758.5; return s - Math.floor(s) }
/** Un número estable por id (para que cada nodo tenga siempre el mismo mandala). */
export const semilla = (id: string) => [...id].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 9973, 7)

function pila(granos: number) {
  const a = new Uint16Array(G * G), cola = [C * G + C]
  a[C * G + C] = granos
  while (cola.length) {
    const i = cola.pop()!, q = a[i] >> 2
    if (!q) continue
    a[i] &= 3
    for (const j of [i - 1, i + 1, i - G, i + G]) if (!fuera(j % G, Math.floor(j / G))) { a[j] += q; if (a[j] >= 4) cola.push(j) }
  }
  return a
}

const rgb = (hex: string) => [1, 3, 5].map((k) => parseInt(hex.slice(k, k + 2), 16))
const mezcla = (c: number[], d: number[], t: number) => c.map((v, k) => Math.round(v + (d[k] - v) * t))
const tonos = (c: number[]) => [mezcla(c, [255, 255, 255], 0.35), c, mezcla(c, [6, 9, 18], 0.4), mezcla(c, [6, 9, 18], 0.68)]

const cache = new Map<string, string>()
/** La cara de un nodo como data URL. `color` en #rrggbb; null = gris apagado (cerrado o sin comprar). */
export function cara(id: string, color: string | null, px = 3) {
  const clave = `${id}|${color}|${px}`
  let url = cache.get(clave)
  if (url) return url
  const s = semilla(id), a = pila(1500 + Math.round(h(s, 7) * 2600)), t = tonos(color ? rgb(color) : [86, 104, 122])
  const cv = document.createElement('canvas')
  cv.width = cv.height = G * px
  const g = cv.getContext('2d')!
  for (let i = 0; i < G * G; i++) {
    const x = i % G, y = Math.floor(i / G)
    if (fuera(x, y)) continue
    g.fillStyle = `rgb(${t[a[i]]})`
    g.fillRect(x * px, y * px, px, px)
  }
  url = cv.toDataURL()
  cache.set(clave, url)
  return url
}

/** La escarcha entre dos nodos: un trazo fino con ramitas a 60°. Devuelve [d, ancho] de cada trazo. */
export function rama(x0: number, y0: number, x1: number, y1: number, sem: number, ancho = 1.1, prof = 1, out: [string, number][] = []) {
  const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L, pasos = Math.max(4, Math.round(L / 8))
  let d = `M${x0.toFixed(1)} ${y0.toFixed(1)}`
  for (let i = 1; i <= pasos; i++) {
    const t = i / pasos, w = (h(sem++) - 0.5) * 1.2 * (i < pasos ? 1 : 0)
    d += `L${(x0 + dx * t - uy * w).toFixed(1)} ${(y0 + dy * t + ux * w).toFixed(1)}`
    if (prof > 0 && i > 1 && i < pasos - 1 && h(sem++) > 0.45) for (const lado of [1, -1]) {
      const la = L * (0.07 + 0.08 * h(sem++)), ca = Math.cos(lado * 1.047), sa = Math.sin(lado * 1.047), px = x0 + dx * t, py = y0 + dy * t
      rama(px, py, px + (ux * ca - uy * sa) * la, py + (ux * sa + uy * ca) * la, sem++ * 13, ancho * 0.6, prof - 1, out)
    }
  }
  out.push([d, ancho])
  return out
}

/** Un emblema por nodo (familia de los sellos del Relicario), en una caja de ±8. Sin emblema: solo el disco. */
export const EMBLEMA: Record<string, string> = {
  memoria: 'M0 0a2 2 0 0 1 4 0a4 4 0 0 1-8 0a6 6 0 0 1 12 0',
  eco: 'M-4-5.5a7.5 7.5 0 0 1 0 11M0-8a11 11 0 0 1 0 16M-7 0h.01',
  sedimentacion: 'M-7-4h14M-5.5 0h11M-4 4h8',
  estratos: 'M0-7l7 3.5-7 3.5-7-3.5zM-7 0l7 3.5 7-3.5M-7 4l7 3.5 7-3.5',
  defectos: 'M-6.5-6.5v13M6.5-6.5v13M0-6.5v5M1.6 1.5v5M-6.5 0h13',
  ruptura: 'M-1-7.5l3 4.5-3 3.5 3.5 7',
  compactacion: 'M-2.5-2.5h5v5h-5zM-8 0h3.5M8 0h-3.5M0-8v3.5M0 8v-3.5',
  cascada_plus: 'M-7-6h4v4h4v4h4v4',
  mutacion_plus: 'M-4.5-7c9 4.5 0 9.5 9 14M4.5-7c-9 4.5 0 9.5-9 14',
  cristalografia: 'M0-7l6 3.5v7L0 7l-6-3.5v-7zM0 0v7M0 0l6-3.5M0 0l-6-3.5',
  presion: 'M0-7v9M-3.5-1.5 0 2l3.5-3.5M-6 6h12',
  engarces: 'M0-7l6 3.5v7L0 7l-6-3.5v-7zM0-3l2.6 1.5v3L0 3l-2.6-1.5v-3z',
  inercia: 'M-6 3a6 6 0 1 1 6 4M-6 3l-1.5-3M-6 3l3-.5',
}
