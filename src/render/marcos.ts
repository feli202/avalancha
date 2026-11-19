// Foto del mandala: la pila del juego dibujada de nuevo en un cuadrado de 2048 px, con el marco elegido (recompensa de logros).
import { Lienzo } from './lienzo'
import { css } from './paletas'

const LADO_FOTO = 2048

type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D
const circulo = (g: Ctx, c: number, r: number) => { g.beginPath(); g.arc(c, c, r, 0, Math.PI * 2); g.stroke() }

/** Dibuja el marco alrededor de un mandala de radio r centrado en (c, c). color: el más claro de la paleta. */
export function marco(g: Ctx, id: string, c: number, r: number, color: string, u = r) {
  // u: tamaño de los adornos (separación, grosor, puntas). Con zoom la pila crece pero el marco no se agranda: sigue el borde
  // (r) con los adornos del tamaño de la pila encuadrada. En la foto y las vistas previas, u = r.
  const R = (k: number) => r + (k - 1) * u
  g.strokeStyle = g.fillStyle = color
  g.lineWidth = 2
  g.globalAlpha = 0.85
  switch (id) {
    case 'fino': circulo(g, c, R(1.06)); break
    case 'doble': circulo(g, c, R(1.05)); g.lineWidth = 1; circulo(g, c, R(1.1)); break
    case 'anillos':
      for (let j = 0; j < 6; j++) { g.globalAlpha = 0.8 * (1 - j / 6); circulo(g, c, R(1.05 + j * 0.035)) }
      break
    case 'orbitas':
      circulo(g, c, R(1.07))
      for (let j = 0; j < 12; j++) {
        const a = (j / 12) * Math.PI * 2
        g.beginPath(); g.arc(c + Math.cos(a) * R(1.07), c + Math.sin(a) * R(1.07), j % 3 ? 3 : 6, 0, Math.PI * 2); g.fill()
      }
      break
    case 'muescas':
      circulo(g, c, R(1.05))
      for (let j = 0; j < 72; j++) {
        const a = (j / 72) * Math.PI * 2, l = j % 6 ? 0.03 : 0.07
        g.beginPath(); g.moveTo(c + Math.cos(a) * R(1.07), c + Math.sin(a) * R(1.07))
        g.lineTo(c + Math.cos(a) * R(1.07 + l), c + Math.sin(a) * R(1.07 + l)); g.stroke()
      }
      break
    case 'denso': {
      const gr = g.createRadialGradient(c, c, R(1.02), c, c, R(1.3))
      gr.addColorStop(0, color); gr.addColorStop(1, 'transparent')
      g.globalAlpha = 0.35; g.fillStyle = gr; g.fillRect(0, 0, c * 2, c * 2)
      g.globalAlpha = 0.9; g.lineWidth = 4; circulo(g, c, R(1.03))
      break
    }
    case 'rosa':
      circulo(g, c, R(1.05))
      for (let j = 0; j < 16; j++) {
        const a = (j / 16) * Math.PI * 2, l = j % 4 ? (j % 2 ? 1.12 : 1.18) : 1.3
        g.lineWidth = j % 4 ? 1 : 2
        g.beginPath(); g.moveTo(c + Math.cos(a) * R(1.05), c + Math.sin(a) * R(1.05))
        g.lineTo(c + Math.cos(a) * R(l), c + Math.sin(a) * R(l)); g.stroke()
      }
      break
    case 'infinito':
      g.shadowColor = color; g.shadowBlur = 24
      circulo(g, c, R(1.06))
      g.shadowBlur = 0
      g.font = `${Math.round(u * 0.16)}px system-ui, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'
      g.fillStyle = '#07080f'; g.fillRect(c - u * 0.12, c + R(1.06) - u * 0.07, u * 0.24, u * 0.14)
      g.fillStyle = color; g.fillText('∞', c, c + R(1.06))
      break
    // Logros secretos.
    case 'galleta': { // borde ondulado de galleta con chispas de chocolate
      g.globalAlpha = 1; g.fillStyle = '#c98a4b'
      g.beginPath()
      for (let j = 0; j <= 240; j++) {
        const a = (j / 240) * Math.PI * 2, rr = R(1.12 + 0.025 * Math.sin(a * 18) + 0.01 * Math.sin(a * 47))
        g.lineTo(c + Math.cos(a) * rr, c + Math.sin(a) * rr)
      }
      g.arc(c, c, R(1.03), 0, Math.PI * 2, true) // el agujero de la pila
      g.fill('evenodd')
      g.fillStyle = '#3b2314'
      for (let j = 0; j < 22; j++) {
        const a = j * 2.39996, rr = R(1.065 + ((j * 37) % 5) * 0.012)
        g.beginPath(); g.arc(c + Math.cos(a) * rr, c + Math.sin(a) * rr, u * (0.014 + (j % 3) * 0.005), 0, Math.PI * 2); g.fill()
      }
      break
    }
    case 'polaroid': { // marco blanco cuadrado, más ancho abajo
      const m = R(1.12)
      g.globalAlpha = 1; g.fillStyle = '#ece8df'
      g.beginPath(); g.rect(c - m - u * 0.08, c - m - u * 0.08, 2 * m + u * 0.16, 2 * m + u * 0.5); g.rect(c - m, c - m, 2 * m, 2 * m); g.fill('evenodd')
      break
    }
    case 'arenaDorada': { // anillo de arena dorada con brillos
      const gr = g.createLinearGradient(c - r, c - r, c + r, c + r)
      gr.addColorStop(0, '#fff1b8'); gr.addColorStop(0.5, '#d9a53a'); gr.addColorStop(1, '#8a5a12')
      g.strokeStyle = gr; g.lineWidth = Math.max(3, u * 0.05); g.globalAlpha = 0.95
      circulo(g, c, R(1.08))
      g.fillStyle = '#fff6d0'
      for (let j = 0; j < 40; j++) {
        const a = j * 2.39996, rr = R(1.08 + (((j * 53) % 9) - 4) * 0.008)
        g.globalAlpha = 0.4 + ((j * 29) % 6) / 10
        g.beginPath(); g.arc(c + Math.cos(a) * rr, c + Math.sin(a) * rr, Math.max(1, u * 0.006), 0, Math.PI * 2); g.fill()
      }
      break
    }
    case 'exponent': // firma del estudio: anillo fino y la marca "eˣ" abajo
      // shortcut: marca de texto, no el logo real del estudio; cambiarla cuando haya archivo del logo.
      circulo(g, c, R(1.06))
      g.font = `600 ${Math.round(u * 0.13)}px system-ui, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'
      g.fillStyle = '#07080f'; g.fillRect(c - u * 0.13, c + R(1.06) - u * 0.08, u * 0.26, u * 0.16)
      g.fillStyle = color; g.fillText('eˣ', c, c + R(1.06))
      break
    // Capa 1 (C13).
    case 'anilloHelado': // anillo fino de hielo con agujas de escarcha hacia afuera, largas y cortas alternadas
      g.strokeStyle = '#bfeaf7'
      circulo(g, c, R(1.05))
      g.lineWidth = 1.5
      for (let j = 0; j < 36; j++) {
        const a = (j / 36) * Math.PI * 2, l = j % 3 ? 1.1 : 1.17
        g.beginPath(); g.moveTo(c + Math.cos(a) * R(1.05), c + Math.sin(a) * R(1.05))
        g.lineTo(c + Math.cos(a) * R(l), c + Math.sin(a) * R(l)); g.stroke()
        if (j % 3 === 0) { // dos ramitas a 60° en cada aguja larga
          const m = R(1.12)
          for (const s of [-1, 1]) {
            const b = a + s * 0.5
            g.beginPath(); g.moveTo(c + Math.cos(a) * m, c + Math.sin(a) * m)
            g.lineTo(c + Math.cos(a) * m + Math.cos(b) * u * 0.03, c + Math.sin(a) * m + Math.sin(b) * u * 0.03); g.stroke()
          }
        }
      }
      break
    case 'bordesGrano': { // un borde de granos: una línea quebrada irregular, con las juntas marcadas hacia afuera
      const n = 28, rr = (j: number) => R(1.07 + 0.025 * Math.sin(j * 2.3) + 0.015 * Math.sin(j * 5.1))
      g.beginPath()
      for (let j = 0; j <= n; j++) { const a = (j / n) * Math.PI * 2; g.lineTo(c + Math.cos(a) * rr(j), c + Math.sin(a) * rr(j)) }
      g.stroke()
      g.lineWidth = 1
      for (let j = 0; j < n; j++) {
        const a = (j / n) * Math.PI * 2, b = a + 0.12 * Math.sin(j * 3.7)
        g.beginPath(); g.moveTo(c + Math.cos(a) * rr(j), c + Math.sin(a) * rr(j))
        g.lineTo(c + Math.cos(b) * R(1.16), c + Math.sin(b) * R(1.16)); g.stroke()
      }
      break
    }
    case 'terco': // cuatro arcos: tres rotos por una grieta y el cuarto entero, más grueso
      for (let j = 0; j < 4; j++) {
        const a0 = (j / 4) * Math.PI * 2 - Math.PI / 2 + 0.06, a1 = a0 + Math.PI / 2 - 0.12
        g.lineWidth = j === 3 ? 4 : 2
        if (j === 3) { g.beginPath(); g.arc(c, c, R(1.07), a0, a1); g.stroke(); continue }
        const m = (a0 + a1) / 2 + 0.15 * (j - 1)
        g.beginPath(); g.arc(c, c, R(1.07), a0, m - 0.03); g.stroke()
        g.beginPath(); g.arc(c, c, R(1.07), m + 0.03, a1); g.stroke()
      }
      break
  }

  g.globalAlpha = 1
}

/** Lo que hace falta para dibujar la pila de nuevo, fuera de la pantalla (PilaVisual.foto). */
export interface Toma {
  alturas: Uint8Array
  tDerrumbe: Float32Array
  radio: number
  brillos: number[]
  ahora: number
  colores: number[]
  efecto: number
  destello: number
  /** px CSS por celda en pantalla: la foto conserva el relieve que se ve (u_dpr del shader). */
  cssPorCelda: number
}

let lz: Lienzo | null = null
let logo: Promise<HTMLImageElement> | null = null

/**
 * La foto del mandala: la pila dibujada de nuevo a LADO_FOTO px (no una captura), con el marco elegido y abajo, discreto,
 * el logo y `pie`. Devuelve el PNG, o null sin WebGL2.
 */
export async function sacarFoto(t: Toma, id: string, pie: string, logoUrl: string, fuente: string): Promise<Blob | null> {
  const L = LADO_FOTO, c = L / 2
  logo ??= new Promise((ok, mal) => { const i = new Image(64, 64); i.onload = () => ok(i); i.onerror = mal; i.src = logoUrl })
  const img = await logo.catch(() => null)
  lz ??= new Lienzo(new OffscreenCanvas(L, L))
  if (!lz.gl) return null
  const px = Math.min((2 * L * 0.33) / (2 * t.radio + 1), 48)
  lz.colores = t.colores
  lz.efecto = t.efecto
  lz.destello = t.destello
  lz.subir(t.alturas, t.tDerrumbe)
  lz.pintar(px, t.brillos, 0, t.ahora, t.cssPorCelda > 0 ? Math.max(1, px / t.cssPorCelda) : 1)
  const f = new OffscreenCanvas(L, L)
  const g = f.getContext('2d')!
  g.drawImage(lz.canvas, 0, 0) // en la misma tarea que pintar: el búfer de WebGL todavía está
  marco(g, id, c, (t.radio + 0.5) * px, css(t.colores[1]))
  // El pie: logo y texto centrados, tenues.
  const tam = 30, lado = 40, y = L - 70
  g.font = `500 ${tam}px ${fuente}`
  g.textBaseline = 'middle'
  const ancho = (img ? lado + 18 : 0) + g.measureText(pie).width
  let x = c - ancho / 2
  g.globalAlpha = 0.75
  if (img) {
    try { g.drawImage(img, x, y - lado / 2, lado, lado); x += lado + 18 } catch { /* SVG sin tamaño propio (Firefox): sin logo */ }
  }
  g.fillStyle = '#b9bccd'
  g.fillText(pie, x, y)
  g.globalAlpha = 1
  return f.convertToBlob({ type: 'image/png' })
}
