import type Decimal from 'break_infinity.js'
import { CFG, MUTACIONES, type MutId } from './config'
import { costoCaudal, costoCascada, costoColor, costoMutacion } from './formulas'
import type { State } from './state'

/** `color0`…`color3` siguen el orden de CFG.colores. */
export type ItemId = 'caudal' | 'cascada' | `color${number}` | `mut_${MutId}`

const colorDe = (id: ItemId) => (id.startsWith('color') ? Number(id.slice(5)) : -1)
const mutDe = (id: ItemId) => (id.startsWith('mut_') ? (id.slice(4) as MutId) : null)

export function nivel(s: State, id: ItemId): number {
  const m = mutDe(id)
  if (m) return s.mutaciones[m]
  if (id === 'caudal') return s.caudal
  if (id === 'cascada') return s.cascada
  return s.colores[colorDe(id)]
}

export function costo(s: State, id: ItemId): Decimal {
  const m = mutDe(id)
  const n = nivel(s, id)
  if (m) return costoMutacion(m, n)
  if (id === 'caudal') return costoCaudal(n)
  if (id === 'cascada') return costoCascada(n)
  return costoColor(colorDe(id), n)
}

export const mutacionesDisponibles = (s: State) =>
  s.compresiones >= CFG.mutaciones.compresiones_para_desbloquear &&
  s.maxEnergia.log10() >= CFG.mutaciones.energia_para_desbloquear_log10

/** Lo que la tienda ofrece ahora (desbloqueado y por debajo del nivel máximo). */
export function disponibles(s: State): ItemId[] {
  const o: ItemId[] = ['caudal']
  for (let i = 0; i < s.coloresDesbloqueados; i++) o.push(`color${i}`)
  if (s.compresiones >= CFG.cascada.compresiones_para_desbloquear && s.cascada < CFG.cascada.nivel_max) o.push('cascada')
  if (mutacionesDisponibles(s))
    for (const m of MUTACIONES) if (s.mutaciones[m] < CFG.mutaciones.nivel_max) o.push(`mut_${m}`)
  return o
}

/** Sube un nivel sin cobrar (para previsualizar el efecto de una compra). */
export function aplicar(s: State, id: ItemId): State {
  const m = mutDe(id)
  if (m) return { ...s, mutaciones: { ...s.mutaciones, [m]: s.mutaciones[m] + 1 } }
  if (id === 'caudal') return { ...s, caudal: s.caudal + 1 }
  if (id === 'cascada') return { ...s, cascada: s.cascada + 1 }
  const c = colorDe(id)
  return { ...s, colores: s.colores.map((n, i) => (i === c ? n + 1 : n)) }
}

export const puedeComprar = (s: State, id: ItemId) =>
  s.infinitos === 0 && disponibles(s).includes(id) && s.energia.gte(costo(s, id))

/** Compra un nivel; si no se puede, devuelve el mismo estado. */
export const comprar = (s: State, id: ItemId): State =>
  puedeComprar(s, id) ? aplicar({ ...s, energia: s.energia.sub(costo(s, id)) }, id) : s

/** Compra todos los niveles que se puedan pagar ("Máx"). */
export function comprarMax(s: State, id: ItemId): State {
  while (puedeComprar(s, id)) s = comprar(s, id)
  return s
}
