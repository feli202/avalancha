// Foto del mandala: la pila del juego dibujada de nuevo en un cuadrado de 2048 px, con el marco elegido (recompensa de logros).
import { Lienzo } from './lienzo'
import { css } from './paletas'

const LADO_FOTO = 2048

type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D
const circulo = (g: Ctx, c: number, r: number) => { g.beginPath(); g.arc(c, c, r, 0, Math.PI * 2); g.stroke() }

/** Dibuja el marco alrededor de un mandala de radio r centrado en (c, c). color: el más claro de la paleta. */
export function marco(g: Ctx, id: string, c: number, r: number, color: string) {
  g.strokeStyle = g.fillStyle = color
  g.lineWidth = 2
  g.globalAlpha = 0.85
  switch (id) {
    case 'fino': circulo(g, c, r * 1.06); break
    case 'doble': circulo(g, c, r * 1.05); g.lineWidth = 1; circulo(g, c, r * 1.1); break
    case 'anillos':
      for (let j = 0; j < 6; j++) { g.globalAlpha = 0.8 * (1 - j / 6); circulo(g, c, r * (1.05 + j * 0.035)) }
      break
    case 'orbitas':
      circulo(g, c, r * 1.07)
      for (let j = 0; j < 12; j++) {
        const a = (j / 12) * Math.PI * 2
        g.beginPath(); g.arc(c + Math.cos(a) * r * 1.07, c + Math.sin(a) * r * 1.07, j % 3 ? 3 : 6, 0, Math.PI * 2); g.fill()
      }
      break
    case 'muescas':
      circulo(g, c, r * 1.05)
      for (let j = 0; j < 72; j++) {
        const a = (j / 72) * Math.PI * 2, l = j % 6 ? 0.03 : 0.07
        g.beginPath(); g.moveTo(c + Math.cos(a) * r * 1.07, c + Math.sin(a) * r * 1.07)
        g.lineTo(c + Math.cos(a) * r * (1.07 + l), c + Math.sin(a) * r * (1.07 + l)); g.stroke()
      }
      break
    case 'denso': {
      const gr = g.createRadialGradient(c, c, r * 1.02, c, c, r * 1.3)
      gr.addColorStop(0, color); gr.addColorStop(1, 'transparent')
      g.globalAlpha = 0.35; g.fillStyle = gr; g.fillRect(0, 0, c * 2, c * 2)
      g.globalAlpha = 0.9; g.lineWidth = 4; circulo(g, c, r * 1.03)
      break
    }
    case 'rosa':
      circulo(g, c, r * 1.05)
      for (let j = 0; j < 16; j++) {
        const a = (j / 16) * Math.PI * 2, l = j % 4 ? (j % 2 ? 1.12 : 1.18) : 1.3
        g.lineWidth = j % 4 ? 1 : 2
        g.beginPath(); g.moveTo(c + Math.cos(a) * r * 1.05, c + Math.sin(a) * r * 1.05)
        g.lineTo(c + Math.cos(a) * r * l, c + Math.sin(a) * r * l); g.stroke()
      }
      break
    case 'infinito':
      g.shadowColor = color; g.shadowBlur = 24
      circulo(g, c, r * 1.06)
      g.shadowBlur = 0
      g.font = `${Math.round(r * 0.16)}px system-ui, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'
      g.fillStyle = '#07080f'; g.fillRect(c - r * 0.12, c + r * 1.06 - r * 0.07, r * 0.24, r * 0.14)
      g.fillStyle = color; g.fillText('∞', c, c + r * 1.06)
      break
    // Logros secretos.
    case 'galleta': { // borde ondulado de galleta con chispas de chocolate
      g.globalAlpha = 1; g.fillStyle = '#c98a4b'
      g.beginPath()
      for (let j = 0; j <= 240; j++) {
        const a = (j / 240) * Math.PI * 2, rr = r * (1.12 + 0.025 * Math.sin(a * 18) + 0.01 * Math.sin(a * 47))
        g.lineTo(c + Math.cos(a) * rr, c + Math.sin(a) * rr)
      }
      g.arc(c, c, r * 1.03, 0, Math.PI * 2, true) // el agujero de la pila
      g.fill('evenodd')
      g.fillStyle = '#3b2314'
      for (let j = 0; j < 22; j++) {
        const a = j * 2.39996, rr = r * (1.065 + ((j * 37) % 5) * 0.012)
        g.beginPath(); g.arc(c + Math.cos(a) * rr, c + Math.sin(a) * rr, r * (0.014 + (j % 3) * 0.005), 0, Math.PI * 2); g.fill()
      }
      break
    }
    case 'polaroid': { // marco blanco cuadrado, más ancho abajo
      const m = r * 1.12
      g.globalAlpha = 1; g.fillStyle = '#ece8df'
      g.beginPath(); g.rect(c - m - r * 0.08, c - m - r * 0.08, 2 * m + r * 0.16, 2 * m + r * 0.5); g.rect(c - m, c - m, 2 * m, 2 * m); g.fill('evenodd')
      break
    }
    case 'arenaDorada': { // anillo de arena dorada con brillos
      const gr = g.createLinearGradient(c - r, c - r, c + r, c + r)
      gr.addColorStop(0, '#fff1b8'); gr.addColorStop(0.5, '#d9a53a'); gr.addColorStop(1, '#8a5a12')
      g.strokeStyle = gr; g.lineWidth = Math.max(3, r * 0.05); g.globalAlpha = 0.95
      circulo(g, c, r * 1.08)
      g.fillStyle = '#fff6d0'
      for (let j = 0; j < 40; j++) {
        const a = j * 2.39996, rr = r * (1.08 + (((j * 53) % 9) - 4) * 0.008)
        g.globalAlpha = 0.4 + ((j * 29) % 6) / 10
        g.beginPath(); g.arc(c + Math.cos(a) * rr, c + Math.sin(a) * rr, Math.max(1, r * 0.006), 0, Math.PI * 2); g.fill()
      }
      break
    }
    case 'exponent': // firma del estudio: anillo fino y la marca "eˣ" abajo
      // shortcut: marca de texto, no el logo real del estudio; cambiarla cuando haya archivo del logo.
      circulo(g, c, r * 1.06)
      g.font = `600 ${Math.round(r * 0.13)}px system-ui, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'
      g.fillStyle = '#07080f'; g.fillRect(c - r * 0.13, c + r * 1.06 - r * 0.08, r * 0.26, r * 0.16)
      g.fillStyle = color; g.fillText('eˣ', c, c + r * 1.06)
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
