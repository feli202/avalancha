// SPEC_CAPA1 §6: la Red. Los nodos (posición, efectos por nivel, costo del anillo 3) se leen de config_capa1.json:
// agregar un nodo no requiere tocar código.
import Decimal from 'break_infinity.js'
import { CFG, precioLog10 } from './config'
import { CFG1 } from './config1'
import { defectosCompletos } from './defectos'
import type { State } from './state'

/** Un nodo: posición en el rombo y, por cada efecto, un arreglo con el valor de cada nivel (1..4). */
export type Nodo = { pos: number[]; costo_base_log10?: number } & Record<string, unknown>

export const NODOS: Record<string, Nodo> = { ...CFG1.red.nodos, ...CFG1.red['anillo3_1.2'] }
/** Los de la 1.2: grises con candado de hielo hasta que se abra la Escarcha. */
export const ANILLO3 = new Set(Object.keys(CFG1.red['anillo3_1.2']))
export const NIVEL_MAX_RED = 4
export const CENTRO = 'memoria'

const POR_POS = new Map(Object.entries(NODOS).map(([id, n]) => [n.pos.join(','), id]))
export const anillo = (id: string) => Math.abs(NODOS[id].pos[0]) + Math.abs(NODOS[id].pos[1])
export const nivelRed = (s: State, id: string) => s.red[id] ?? 0

/** Vecinos ortogonales que existen. */
export const vecinos = (id: string) => {
  const [x, y] = NODOS[id].pos
  return [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]].map((p) => POR_POS.get(p.join(','))).filter((v): v is string => !!v)
}

/** El anillo 3 se abre con la Escarcha (hito de la 1.1). */
export const escarchaAbierta = (s: State) => s.escarcha.abierta

/** Lo que pide el nodo además del vecino (`requiere` en config: Estratos pide Ruptura nv1). Solo para abrirlo: un
 * guardado que ya lo tenía sigue subiéndolo. */
export const requisitoRed = (s: State, id: string) =>
  nivelRed(s, id) > 0 ||
  Object.entries((NODOS[id].requiere ?? {}) as Record<string, number>).every(([n, lv]) => nivelRed(s, n) >= lv)

/** Se puede comprar: Memoria siempre; el resto, con un vecino ortogonal más cercano al centro en nivel 4. */
export const abierto = (s: State, id: string) =>
  id === CENTRO ||
  ((!ANILLO3.has(id) || escarchaAbierta(s)) && requisitoRed(s, id) &&
    vecinos(id).some((v) => anillo(v) < anillo(id) && nivelRed(s, v) >= NIVEL_MAX_RED))

/** log10 del costo del nivel n → n+1 (§6.2). */
export function costoRedLog10(id: string, n: number) {
  const r = anillo(id)
  return precioLog10((NODOS[id].costo_base_log10 ?? CFG1.red.costo_anillo_log10[r]) + CFG1.red.paso_nivel_log10[r] * n)
}

// Los Cristales son enteros: un costo chico se redondea para arriba (10^0,15 = 1,41 → 2), como los Cristales del Infinito (§4).
export const cristalesDe = (l: number) => (l < 6 ? new Decimal(Math.ceil(10 ** l - 1e-9)) : Decimal.pow10(l))
export const costoRed = (id: string, n: number) => cristalesDe(costoRedLog10(id, n))

export const puedeComprarRed = (s: State, id: string) =>
  id in NODOS && nivelRed(s, id) < NIVEL_MAX_RED && abierto(s, id) && s.cristales.gte(costoRed(id, nivelRed(s, id)))

/** Compra un nivel; si no se puede, devuelve el mismo estado. */
export function comprarRed(s: State, id: string): State {
  if (!puedeComprarRed(s, id)) return s
  const n = nivelRed(s, id)
  const t = { ...s, cristales: s.cristales.sub(costoRed(id, n)), red: { ...s.red, [id]: n + 1 } }
  // Memoria y Sedimentación: si la corrida está más abajo de lo que el nodo conserva, salta ahí ya (como sim_capa1.py,
  // que compra antes de armar la corrida). La corrida sigue con lo que tenía; solo sube la Densidad (la pila implosiona).
  const tope = Math.min(compresionesConservadas(t), CFG.compresion.umbrales_log10.length)
  return tope > t.compresiones ? { ...t, compresiones: tope } : t
}

/** El valor del efecto `clave` del nodo en su nivel actual, o `def` si está en 0 (como `v()` de sim_capa1.py). */
export function efectoRed(s: State, id: string, clave: string, def = 0, n = nivelRed(s, id)): number {
  const v = NODOS[id]?.[clave]
  return n > 0 && Array.isArray(v) ? v[n - 1] : def
}

// ---------- efectos que ya usa la Arena (los de Estratos, Defectos, Relicario y Escarcha llegan con su hito) ----------
export const memoria = (s: State) => nivelRed(s, CENTRO)
/** Compresiones que conserva el Infinito (Memoria o Sedimentación, la mayor). */
export const compresionesConservadas = (s: State) =>
  Math.max(efectoRed(s, CENTRO, 'conservar_compresiones'), efectoRed(s, 'sedimentacion', 'conservar_compresiones'))
/** Densidad fija de la Red (Compactación); la de Compactación II depende de los anillos y se suma en `densidad`. */
export const densidadRed = (s: State) => efectoRed(s, 'compactacion', 'densidad')
/** Sedimentación nv4: ni la Compresión ni el Infinito reinician la Cascada. */
export const conservaCascada = (s: State) => efectoRed(s, 'sedimentacion', 'conserva_cascada') > 0
export const cascadaExtra = (s: State) => efectoRed(s, 'cascada_plus', 'nivel_max_extra')
export const mutacionExtra = (s: State) => efectoRed(s, 'mutacion_plus', 'nivel_max_extra')
/** Eco: + p × log10(Cristales totales) a log10 V. */
export const ecoLog10 = (s: State) => efectoRed(s, 'eco', 'p') * Math.max(0, s.cristalesTotales.log10())
/** Multiplicador de Cristales en log10 (Ruptura, Cristalografía y Cristalografía II, que crece con los Defectos completos). */
export const cristalesRedLog10 = (s: State) =>
  efectoRed(s, 'ruptura', 'cristales_log10') + efectoRed(s, 'cristalografia', 'cristales_log10') +
  efectoRed(s, 'cristalografia2', 'cristales_log10_por_defecto') * defectosCompletos(s)
