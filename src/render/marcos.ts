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
