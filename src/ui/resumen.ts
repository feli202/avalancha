// v1.0, bloque 6: el resumen de la partida al terminar la Capa 1, como imagen para compartir (1080×1350).
import { DEFECTOS, escalon, type State } from '../core'
import { sacarFoto } from '../render/marcos'
import { MARCOS } from '../render/paletas'
import { SITIO } from '../comunidad'
import { txt } from '../strings'
import { ajustes } from './ajustes.svelte'
import { formato } from './formato'
import { camara, juego } from './juego.svelte'
import { elegido } from './logros'

/** Las filas del resumen: [rótulo, valor]. */
export function filasResumen(s: State, record: number): [string, string][] {
  const r = txt.resumen
  const mejor = s.relicario.piezas.reduce((m, p) => (p.nivel > m.nivel ? p : m), { nivel: -1, tipo: '' })
  const reliquia = mejor.nivel < 0 ? '—'
    : txt.cristal.relicario.pieza(txt.cristal.relicario.tipos[mejor.tipo][0], txt.cristal.relicario.grado(txt.colores[escalon(mejor.nivel).color], escalon(mejor.nivel).vuelta))
  return [
    [r.tiempo, txt.duracion(s.tiempoTotal)],
    [r.infinitos, formato(s.infinitos)],
    [r.defectos, `${s.defectos.completos.length} / ${DEFECTOS.length}`],
    [r.avalancha, `${formato(record)} ${txt.estadisticas.derrumbes}`],
    [r.reliquia, reliquia],
  ]
}

const cargarImagen = (src: string) => new Promise<HTMLImageElement>((ok, mal) => { const i = new Image(); i.onload = () => ok(i); i.onerror = mal; i.src = src })

/** La imagen del resumen, o null si no se puede sacar la foto de la pila (sin WebGL). */
export async function imagenResumen(): Promise<Blob | null> {
  const toma = camara.foto?.()
  if (!toma) return null
  const fuente = getComputedStyle(document.body).fontFamily
  const foto = await sacarFoto(toma, elegido('marco', MARCOS, ajustes.marco, juego.logros), '', `${import.meta.env.BASE_URL}logo.svg`, fuente)
  if (!foto) return null
  const W = 1080, H = 1350
  const c = document.createElement('canvas')
  c.width = W; c.height = H
  const g = c.getContext('2d')!
  g.fillStyle = '#07080f'
  g.fillRect(0, 0, W, H)
  // Brasa desde abajo: lo que viene en la Capa 2.
  const brasa = g.createRadialGradient(W / 2, H + 200, 0, W / 2, H + 200, 900)
  brasa.addColorStop(0, 'rgba(255,122,46,0.28)'); brasa.addColorStop(1, 'rgba(255,122,46,0)')
  g.fillStyle = brasa
  g.fillRect(0, 0, W, H)
  const pila = await createImageBitmap(foto)
  g.drawImage(pila, 140, 150, 800, 800)
  g.textAlign = 'center'
  g.textBaseline = 'alphabetic'
  const logo = await cargarImagen(`${import.meta.env.BASE_URL}logo.svg`).catch(() => null)
  g.font = `600 84px ${fuente}`
  const ancho = g.measureText(txt.titulo).width
  if (logo) try { g.drawImage(logo, W / 2 - ancho / 2 - 86, 52, 64, 64) } catch { /* SVG sin tamaño (Firefox) */ }
  g.fillStyle = '#e8e9f3'
  g.fillText(txt.titulo, W / 2 + (logo ? 38 : 0), 112)
  g.font = `500 30px ${fuente}`
  g.fillStyle = '#9fe3f5'
  g.fillText(txt.resumen.subtitulo, W / 2, 150)
  // Las filas, en dos columnas: rótulo a la izquierda, valor a la derecha.
  const filas = filasResumen(juego.s, juego.record)
  filas.forEach(([rot, val], i) => {
    const y = 1000 + i * 52
    g.textAlign = 'left'; g.font = `500 30px ${fuente}`; g.fillStyle = '#9a9db0'
    g.fillText(rot, 150, y)
    g.textAlign = 'right'; g.font = `600 32px ${fuente}`; g.fillStyle = '#e8e9f3'
    g.fillText(val, W - 150, y)
  })
  g.textAlign = 'center'; g.font = `500 28px ${fuente}`; g.fillStyle = '#ffb547'
  g.fillText(SITIO.replace(/^https:\/\//, '').replace(/\/$/, ''), W / 2, H - 40)
  return new Promise((ok) => c.toBlob(ok, 'image/png'))
}
