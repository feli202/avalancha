import { CFG, MUTACIONES, type MutId } from './config'
import Decimal from 'break_infinity.js'
import {
  congelada, expCascada, expCaudal, expColor, expMutacion, limiteCascada, limiteMutacion, masAllaDelInfinito, maxCascada, maxMutacion,
  precioArenaLog10,
} from './formulas'
import { desborde, extraLiberado, metamorfosis } from './fuego'
import { colorSX, sinMutaciones } from './defectos'
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

/** Exponente normal del costo de la mejora (sin redondeo ni softcap). */
function expDe(s: State, id: ItemId) {
  const m = mutDe(id)
  return m ? expMutacion(m) : id === 'caudal' ? expCaudal : id === 'cascada' ? expCascada : expColor(colorDe(id), colorSX(s))
}

/** Nivel máximo viejo de la mejora con Desborde / Metamorfosis (si no, Infinity): pasado él, el costo suma el del softcap. */
const maxDe = (s: State, id: ItemId) => (id === 'cascada' && desborde(s) ? maxCascada(s) : mutDe(id) && metamorfosis(s) ? maxMutacion(s) : Infinity)
/** Hasta dónde se puede comprar (Infinity con Desborde / Metamorfosis). */
export const limite = (s: State, id: ItemId) => (id === 'cascada' ? limiteCascada(s) : mutDe(id) ? limiteMutacion(s) : Infinity)

export const costo = (s: State, id: ItemId): Decimal =>
  Decimal.pow10(precioArenaLog10(expDe(s, id), nivel(s, id)) + extraLiberado(nivel(s, id), maxDe(s, id)))

/** El próximo nivel ya cuesta más de 1e308: corre el softcap (cada nivel más, ×10). La tienda lo marca. */
export const masAlla = (s: State, id: ItemId) => masAllaDelInfinito(expDe(s, id), nivel(s, id))

export const mutacionesDisponibles = (s: State) =>
  !sinMutaciones(s) && s.compresiones >= CFG.mutaciones.compresiones_para_desbloquear &&
  s.maxEnergia.log10() >= CFG.mutaciones.energia_para_desbloquear_log10

/** Lo que la tienda ofrece ahora (desbloqueado y por debajo del nivel máximo). */
export function disponibles(s: State): ItemId[] {
  const o: ItemId[] = ['caudal']
  for (let i = 0; i < s.coloresDesbloqueados; i++) o.push(`color${i}`)
  if (s.compresiones >= CFG.cascada.compresiones_para_desbloquear && s.cascada < limiteCascada(s)) o.push('cascada')
  if (mutacionesDisponibles(s))
    for (const m of MUTACIONES) if (s.mutaciones[m] < limiteMutacion(s)) o.push(`mut_${m}`)
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
  !congelada(s) && disponibles(s).includes(id) && s.energia.gte(costo(s, id))

/** Compra un nivel; si no se puede, devuelve el mismo estado. */
export const comprar = (s: State, id: ItemId): State =>
  puedeComprar(s, id) ? aplicar({ ...s, energia: s.energia.sub(costo(s, id)) }, id) : s

/** Compra todos los niveles que se puedan pagar ("Máx"). */
export function comprarMax(s: State, id: ItemId): State {
  if (!puedeComprar(s, id)) return s
  // Lo único que cambia la disponibilidad al subir niveles es el nivel máximo: se revisa una vez, no por nivel (I8).
  const tope = limite(s, id)
  let energia = s.energia
  let t = s
  for (let c = costo(t, id); nivel(t, id) < tope && energia.gte(c); c = costo(t, id)) {
    energia = energia.sub(c)
    t = aplicar(t, id)
  }
  return { ...t, energia }
}

/** Compra exactamente n niveles, o ninguno si no alcanza (modo x10). */
export function comprarN(s: State, id: ItemId, n: number): State {
  let t = s
  for (let i = 0; i < n; i++) t = comprar(t, id)
  return nivel(t, id) - nivel(s, id) === n ? t : s
}

/** "Comprar todo": compra siempre lo más barato que se pueda pagar entre `ids`, hasta que no alcance para nada. */
export function comprarTodo(s: State, ids: ItemId[]): State {
  for (;;) {
    const pagables = ids.filter((id) => puedeComprar(s, id))
    if (!pagables.length) return s
    s = comprar(s, pagables.reduce((a, b) => (costo(s, b).lt(costo(s, a)) ? b : a)))
  }
}
