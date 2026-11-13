// Foto del mandala: la pila del juego recortada en un cuadrado, con el marco elegido (recompensa de logros).
import { css } from './paletas'

const LADO_FOTO = 1080

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

/**
 * Compone la foto: recorta la pila (canvas WebGL recién dibujado: leer en la misma tarea) con su radio en px reales,
 * le pone el marco y la descarga como PNG.
 */
export function sacarFoto(fuente: { canvas: HTMLCanvasElement; r: number }, id: string, colores: number[], archivo: string) {
  const f = document.createElement('canvas')
  f.width = f.height = LADO_FOTO
  const g = f.getContext('2d')!
  g.fillStyle = '#07080f'
  g.fillRect(0, 0, LADO_FOTO, LADO_FOTO)
  const c = LADO_FOTO / 2, r = LADO_FOTO * 0.36
  const lado = (fuente.r * 2 * (LADO_FOTO / 2)) / r // lo que entra del canvas de origen, en px reales
  const { width: w, height: h } = fuente.canvas
  g.drawImage(fuente.canvas, (w - lado) / 2, (h - lado) / 2, lado, lado, 0, 0, LADO_FOTO, LADO_FOTO)
  marco(g, id, c, r, css(colores[1]))
  f.toBlob((b) => {
    if (!b) return
    const a = document.createElement('a')
    a.href = URL.createObjectURL(b)
    a.download = archivo
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  }, 'image/png')
}
