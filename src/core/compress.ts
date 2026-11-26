import Decimal from 'break_infinity.js'
import { CFG } from './config'
import { CFG2 } from './config2'
import { congelada, infinitoRoto } from './formulas'
import { lechoInfinito } from './fuego'
import { conserva, efectoRed, memoria } from './red'
import { AUTOS, estadoInicial, type State } from './state'

const U = CFG.compresion.umbrales_log10
/** log10 del umbral de la próxima Compresión (Infinity si ya no quedan). Con Lecho infinito, la 17 + j pide 295 × 1,25^j. */
export const umbralLog10 = (s: State) =>
  U[s.compresiones] ?? (lechoInfinito(s) ? U[U.length - 1] * CFG2.liberaciones.lecho_umbral_x ** (s.compresiones - U.length + 1) : Infinity)
/** La próxima Compresión pide más de lo que la Energía puede tener (no quedan, o sin Romper pasa de 1e308): la meta es el Infinito. */
export const ultimaCompresion = (s: State) => umbralLog10(s) === Infinity || (!infinitoRoto(s) && umbralLog10(s) > CFG.infinito_log10)

// Contra la Energía y no su log10 (M4): la misma regla que las compras, sin el redondeo del logaritmo.
export const puedeComprimir = (s: State) => !congelada(s) && umbralLog10(s) < Infinity && s.energia.gte(Decimal.pow10(umbralLog10(s)))

/** SPEC 4.7: reinicia la corrida y sube la Densidad; si no se llegó al umbral, devuelve el mismo estado. */
export function comprimir(s: State): State {
  if (!puedeComprimir(s)) return s
  const { energia, caudal, colores, cascada, tiempoCorrida } = estadoInicial()
  return {
    ...s, energia, granos: 0, // granos_iniciales es solo para la primera corrida
    // Sedimentación (SPEC_CAPA1 §6.3): con su nivel, la Compresión deja el Caudal, los colores y la Cascada como estaban.
    caudal: conserva(s, 'caudal') ? s.caudal : caudal, colores: conserva(s, 'colores') ? s.colores : colores,
    cascada: conserva(s, 'cascada') ? s.cascada : cascada, tiempoCorrida,
    compresiones: s.compresiones + 1,
    mejorCorrida: s.mejorCorrida > 0 ? Math.min(s.mejorCorrida, s.tiempoCorrida) : s.tiempoCorrida,
    compresionesSinAmbar: s.compresionesSinAmbar + (s.colores[0] === 0 ? 1 : 0),
    automat: { ...s.automat, espera: 0 },
  }
}

/** Los autocompradores que da la Memoria (SPEC_CAPA1 §6.3): nivel de Memoria que necesita cada uno. */
const POR_MEMORIA: Record<string, number> = { cascada: 2, mutaciones: 3, infinito: 4 }
/** El jugador tiene el autocomprador `clave`: por sus compresiones, o todos con Memoria nv1 (SPEC_CAPA1 §6.3), desde el
 * inicio de cada Infinito; Cascada, Mutaciones e Infinito, con su nivel de Memoria. La única regla: la usan la economía
 * (autoActivo), la tienda (el interruptor "auto") y el panel de Automatización. */
export const autoDisponible = (s: State, clave: string) =>
  clave === 'escarcha' ? efectoRed(s, 'deshielo', 'auto_ruptura') > 0 : // Romper la Escarcha: con Deshielo (Â§9)
  clave in POR_MEMORIA ? memoria(s) >= POR_MEMORIA[clave] : memoria(s) >= 1 || s.compresiones >= CFG.autocompradores[clave]
/** Lo tiene y está prendido: compra solo. */
export const autoActivo = (s: State, clave: string) => autoDisponible(s, clave) && s.auto[clave]

/** Bloque 10, "Encender todo" / "Apagar todo": todos los autocompradores que el jugador tiene. */
export const encenderTodo = (s: State, si: boolean): State =>
  ({ ...s, auto: { ...s.auto, ...Object.fromEntries(AUTOS.filter((k) => autoDisponible(s, k)).map((k) => [k, si])) } })
