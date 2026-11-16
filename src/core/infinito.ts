// SPEC_CAPA1 §3 y §4: el Infinito da Cristales y reinicia la Arena.
import { CFG } from './config'
import { CFG1 } from './config1'
import { compresionesConservadas, conservaCascada, cristalesRedLog10 } from './red'
import { enInfinito } from './formulas'
import { elegirSola } from './relicario'
import { estadoInicial, type State } from './state'

/** Cristales del próximo Infinito, sin Romper: floor(10^(mult + base)); el primero da primer_infinito. */
export const cristalesAlInfinito = (s: State) => {
  const mult = cristalesRedLog10(s) // log10: Ruptura y Cristalografía de la Red
  return s.infinitos === 0 ? CFG1.cristales.primer_infinito : Math.floor(10 ** (mult + CFG1.cristales.base_log10))
}

/** Cobra los Cristales y reinicia todo lo de la Arena; si la Energía no llegó al Infinito, devuelve el mismo estado. */
export function infinito(s: State): State {
  if (!enInfinito(s)) return s
  const c = cristalesAlInfinito(s)
  const { auto, tiempoTotal, granosTotales, mejorCorrida, compresionesSinAmbar, red, estratos } = s
  return {
    ...estadoInicial(), granos: 0, // granos_iniciales es solo para la primera corrida
    auto, tiempoTotal, granosTotales, mejorCorrida, compresionesSinAmbar, red, estratos,
    // §5: cada Infinito trae una oferta; si quedaba una sin elegir, se elige sola antes.
    relicario: { ...elegirSola(s).relicario, pendiente: s.infinitos + 1 },
    cascada: conservaCascada(s) ? s.cascada : 0,
    compresiones: Math.min(compresionesConservadas(s), CFG.compresion.umbrales_log10.length),
    infinitos: s.infinitos + 1,
    cristales: s.cristales.add(c),
    cristalesTotales: s.cristalesTotales.add(c),
  }
}
