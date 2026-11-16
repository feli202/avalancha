// SPEC_CAPA1 §3 y §4: el Infinito da Cristales y reinicia la Arena.
import { CFG } from './config'
import { CFG1 } from './config1'
import { compresionesConservadas, conservaCascada, cristalesRedLog10, nivelRed } from './red'
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
  const { auto, automat, tiempoTotal, granosTotales, mejorCorrida, compresionesSinAmbar, red, estratos } = s
  return {
    ...estadoInicial(), granos: 0, // granos_iniciales es solo para la primera corrida
    auto, automat, tiempoTotal, granosTotales, mejorCorrida, compresionesSinAmbar, red, estratos,
    // Bloque 8: cada Infinito trae una reliquia que espera su tipo; si quedaba una sin elegir, se elige sola antes.
    // La pila de este Infinito la pone la interfaz (conFoto).
    relicario: { ...elegirSola(s).relicario, pendiente: s.infinitos + 1, foto: '' },
    cascada: conservaCascada(s) ? s.cascada : 0,
    compresiones: Math.min(compresionesConservadas(s), CFG.compresion.umbrales_log10.length),
    infinitos: s.infinitos + 1,
    cristales: s.cristales.add(c),
    cristalesTotales: s.cristalesTotales.add(c),
  }
}

/** Romper el Infinito: Ruptura nv1 (SPEC_CAPA1 §6). Mejora el Infinito automático (bloque 10). */
export const infinitoRoto = (s: State) => nivelRed(s, 'ruptura') >= 1
/** Bloque 10: el Infinito automático ya puede hacerse. Siempre apenas llega; con Romper el Infinito se puede pedir que espere
 * a que dé al menos X Cristales. */
export function infinitoAutoListo(s: State): boolean {
  const { modo, log10 } = s.automat.infinito
  if (modo === 'cristales' && infinitoRoto(s)) return cristalesAlInfinito(s) >= 10 ** log10 * (1 - 1e-9) // 1e-9: que 10^3 alcance para 1000
  return true
}
