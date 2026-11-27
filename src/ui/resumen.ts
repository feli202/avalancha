// v1.0, bloque 6: el resumen de la partida al terminar la Capa 1, como imagen para compartir (1080×1350).
// Capa 2, fase 10: el de la Ignición, con la pila en plasma.
import { DEFECTOS, escalon, temperatura, type State } from '../core'
import { sacarFoto } from '../render/marcos'
import { MARCOS } from '../render/paletas'
import { SITIO } from '../comunidad'
import { txt } from '../strings'
import { ajustes } from './ajustes.svelte'
import { formato } from './formato'
import { camara, juego, ultimaFoto } from './juego.svelte'
import { RADIO_MIN, desdeFoto } from '../render/instantanea'
import { elegido } from './logros'

/** Las filas del resumen: [rótulo, valor]. Capa 2: la Temperatura nunca baja, así que la de ahora es la máxima. */
export function filasResumen(s: State, record: number, capa: 1 | 2 = 1): [string, string][] {
  const r = txt.resumen
  if (capa === 2) return [
    [r.tiempo, txt.duracion(s.tiempoTotal)],
    [r.capa2.fundiciones, formato(s.fuego.fundiciones)],
    [r.capa2.temperatura, txt.fuego.kelvin(temperatura(s))],
    [r.capa2.vidrio, formato(s.fuego.vidrio)],
  ]
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

/** La pila en plasma: blanco caliente arriba, violeta eléctrico en lo más alto (mismo orden de brillo que las paletas). */
const PLASMA = [0xffe6a8, 0xffffff, 0x9cc8ff, 0x5a2ca0]

/** La imagen del resumen, o null si no se puede sacar la foto de la pila (sin WebGL). */
export async function imagenResumen(capa: 1 | 2 = 1): Promise<Blob | null> {
  const t = camara.foto?.()
  if (!t) return null
  // Capa 2: la Ignición llega casi siempre al fundir, con la pila vacía; entonces va la última pila buena (32×32, como las reliquias).
  const vieja = capa === 2 && t.radio < RADIO_MIN ? ultimaFoto() : ''
  const toma = capa === 2 ? { ...t, colores: PLASMA, ...(vieja && desdeFoto(vieja)) } : t
  const fuente = getComputedStyle(document.body).fontFamily
  const foto = await sacarFoto(toma, elegido('marco', MARCOS, ajustes.marco, juego.logros), '', `${import.meta.env.BASE_URL}logo.svg`, fuente)
  if (!foto) return null
  const W = 1080, H = 1350
  const c = document.createElement('canvas')
  c.width = W; c.height = H
  const g = c.getContext('2d')!
  g.fillStyle = '#07080f'
  g.fillRect(0, 0, W, H)
  // Brasa desde abajo: lo que viene en la Capa 2. Después de la Ignición, la luz blanca y violeta del plasma detrás de la pila.
  const brasa = capa === 2 ? g.createRadialGradient(W / 2, 550, 0, W / 2, 550, 700) : g.createRadialGradient(W / 2, H + 200, 0, W / 2, H + 200, 900)
  if (capa === 2) { brasa.addColorStop(0, 'rgba(255,246,222,0.3)'); brasa.addColorStop(0.5, 'rgba(156,140,255,0.14)'); brasa.addColorStop(1, 'rgba(90,44,160,0)') }
  else { brasa.addColorStop(0, 'rgba(255,122,46,0.28)'); brasa.addColorStop(1, 'rgba(255,122,46,0)') }
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
  g.fillStyle = capa === 2 ? '#ffe6a8' : '#9fe3f5'
  g.fillText(capa === 2 ? txt.resumen.capa2.subtitulo : txt.resumen.subtitulo, W / 2, 150)
  // Las filas, en dos columnas: rótulo a la izquierda, valor a la derecha.
  const filas = filasResumen(juego.s, juego.record, capa)
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
