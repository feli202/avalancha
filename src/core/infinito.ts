// SPEC_CAPA1 §3 y §4: el Infinito da Cristales y reinicia la Arena.
import { CFG1 } from './config1'
import { enInfinito } from './formulas'
import { estadoInicial, type State } from './state'

/** Cristales del próximo Infinito, sin Romper: floor(10^(mult + base)); el primero da primer_infinito. */
export const cristalesAlInfinito = (s: State) => {
  const mult = 0 // log10; Ruptura y Cristalografía llegan con la Red (C2, C6)
  return s.infinitos === 0 ? CFG1.cristales.primer_infinito : Math.floor(10 ** (mult + CFG1.cristales.base_log10))
}

/** Cobra los Cristales y reinicia todo lo de la Arena; si la Energía no llegó al Infinito, devuelve el mismo estado. */
export function infinito(s: State): State {
  if (!enInfinito(s)) return s
  const c = cristalesAlInfinito(s)
  const { auto, tiempoTotal, granosTotales, mejorCorrida, compresionesSinAmbar } = s
  return {
    ...estadoInicial(), granos: 0, // granos_iniciales es solo para la primera corrida
    auto, tiempoTotal, granosTotales, mejorCorrida, compresionesSinAmbar,
    infinitos: s.infinitos + 1,
    cristales: s.cristales.add(c),
    cristalesTotales: s.cristalesTotales.add(c),
  }
}
