import Decimal from 'break_infinity.js'
import { CFG } from './config'
import { estadoInicial, type State } from './state'

/** log10 del umbral de la próxima Compresión (Infinity si ya no quedan). */
export const umbralLog10 = (s: State) => CFG.compresion.umbrales_log10[s.compresiones] ?? Infinity

// Contra la Energía y no su log10 (M4): la misma regla que las compras, sin el redondeo del logaritmo.
export const puedeComprimir = (s: State) => s.infinitos === 0 && umbralLog10(s) < Infinity && s.energia.gte(Decimal.pow10(umbralLog10(s)))

/** SPEC 4.7: reinicia la corrida y sube la Densidad; si no se llegó al umbral, devuelve el mismo estado. */
export function comprimir(s: State): State {
  if (!puedeComprimir(s)) return s
  const { energia, caudal, colores, cascada, tiempoCorrida } = estadoInicial()
  return {
    ...s, energia, granos: 0, caudal, // granos_iniciales es solo para la primera corrida
    colores, cascada, tiempoCorrida,
    compresiones: s.compresiones + 1,
    mejorCorrida: s.mejorCorrida > 0 ? Math.min(s.mejorCorrida, s.tiempoCorrida) : s.tiempoCorrida,
    compresionesSinAmbar: s.compresionesSinAmbar + (s.colores[0] === 0 ? 1 : 0),
  }
}

export const autoActivo = (s: State, clave: string) => s.compresiones >= CFG.autocompradores[clave] && s.auto[clave]
