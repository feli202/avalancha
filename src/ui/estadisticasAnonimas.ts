// v1.0, bloque 8: estadísticas anónimas con GoatCounter (sin cookies ni datos personales). Solo hitos del juego con el
// tiempo jugado; cada uno se manda una vez por dispositivo. Apagadas si no hay código de cuenta, con Do Not Track o si el
// jugador las desactiva en Ajustes.
import { DEFECTOS, finCapa1, type State } from '../core'
import { GOATCOUNTER } from '../comunidad'
import { ajustes } from './ajustes.svelte'

const ENVIADOS = 'avalancha.stats.enviados'
const COMPRESIONES_CADA = 5

/** Los hitos que pasaron entre dos estados (puro, para el test). */
export function eventosNuevos(a: State, s: State): string[] {
  const ev: string[] = []
  const compras = (x: State) => x.caudal + x.colores.reduce((t, n) => t + n, 0)
  if (s.infinitos === 0 && s.compresiones === 0 && compras(a) === 0 && compras(s) > 0) ev.push('primera-compra')
  if (s.infinitos === 0 && s.compresiones > a.compresiones) {
    if (s.compresiones === 1) ev.push('primera-compresion')
    if (s.compresiones % COMPRESIONES_CADA === 0) ev.push(`compresion-${s.compresiones}`)
  }
  if (a.infinitos === 0 && s.infinitos > 0) ev.push('primer-infinito')
  if (!a.red.ruptura && s.red.ruptura) ev.push('romper-infinito')
  for (const d of DEFECTOS) if (s.defectos.completos.includes(d) && !a.defectos.completos.includes(d)) ev.push(`defecto-${d}`)
  if (!a.escarcha.abierta && s.escarcha.abierta) ev.push('fin-capa-1-1') // la Escarcha se abre con el hito 1.1
  if (!finCapa1(a) && finCapa1(s)) ev.push('fin-capa-1')
  return ev
}

/** El tiempo jugado redondeado (para agrupar): de a 5 min hasta 2 h, después de a 1 h. */
export function franja(seg: number): string {
  const min = seg / 60
  return min < 120 ? `${Math.round(min / 5) * 5}min` : `${Math.round(min / 60)}h`
}

export const sinRastreo = () => globalThis.navigator?.doNotTrack === '1' || (globalThis as any).doNotTrack === '1'
export const activas = () => !!GOATCOUNTER && ajustes.estadisticas && !sinRastreo()

let previo: State | null = null
/** Llamar en cada cuadro con el estado actual: manda los hitos nuevos. */
export function mirar(s: State) {
  const a = previo
  previo = s
  if (!a || a === s || !activas()) return
  for (const e of eventosNuevos(a, s)) enviar(e, s.tiempoTotal)
}

function enviar(evento: string, tiempo: number) {
  try {
    const hechos: string[] = JSON.parse(localStorage.getItem(ENVIADOS) ?? '[]')
    if (hechos.includes(evento)) return
    localStorage.setItem(ENVIADOS, JSON.stringify([...hechos, evento]))
  } catch { return } // sin almacenamiento no se puede evitar mandarlo dos veces: no se manda
  // API de conteo de GoatCounter: un GET sin cookies; e=true lo marca como evento. Nada del jugador viaja.
  const p = encodeURIComponent(`${evento}/${franja(tiempo)}`)
  const url = `https://${GOATCOUNTER}.goatcounter.com/count?p=${p}&t=${encodeURIComponent(evento)}&e=true&rnd=${Math.random().toString(36).slice(2)}`
  fetch(url, { mode: 'no-cors', credentials: 'omit', keepalive: true }).catch(() => { /* sin red: se pierde ese evento */ })
}
