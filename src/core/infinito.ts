// SPEC_CAPA1 §3 y §4: el Infinito da Cristales y reinicia la Arena.
import Decimal from 'break_infinity.js'
import { CFG } from './config'
import { CFG1 } from './config1'
import { compresionesConservadas, conservaCascada, cristalesRedLog10, efectoRed } from './red'
import { enInfinito, infinitoRoto, produccion } from './formulas'
import { elegirSola } from './relicario'
import { estadoInicial, type State } from './state'

const C = CFG1.cristales
/** Q: órdenes de Energía más allá de 1e308 por cada ×10 de Cristales; Ruptura II lo baja. */
export const ordenesQ = (s: State) => C.Q_ordenes_por_x10 - efectoRed(s, 'ruptura2', 'Q_resta')
/** log10 de los Cristales antes del blando: mult + base + (E − INF)/Q (lo que pasa de 1e308 solo cuenta con Romper). */
const lcBruto = (s: State) =>
  cristalesRedLog10(s) + C.base_log10 + (infinitoRoto(s) ? Math.max(0, s.energia.log10() - CFG.infinito_log10) / ordenesQ(s) : 0) ** C.beta
const blando = (lc: number) => (lc > C.blando_desde_log10 ? C.blando_desde_log10 + (lc - C.blando_desde_log10) * C.blando_factor : lc)

/** Cristales del próximo Infinito (SPEC_CAPA1 §4, igual que infinity_reward de sim_capa1.py): enteros por debajo de 1e6;
 * el primero da primer_infinito. */
export function cristalesAlInfinito(s: State): Decimal {
  if (s.infinitos === 0) return new Decimal(C.primer_infinito)
  const lc = blando(lcBruto(s))
  return lc < 6 ? new Decimal(Math.floor(10 ** lc + 1e-9)) : Decimal.pow10(lc) // 1e-9: que 10^log10(197) dé 197
}

/** §4: los Cristales por segundo (10^lc / t) dejaron de subir: d lc/dt ≤ d log10(t)/dt. Con d log10E/dt = P/(E ln10),
 * queda (P/E) × t × k / Q ≤ 1, con k el factor del blando. Solo con el Infinito roto y pasado 1e308.
 * shortcut: supone beta = 1 (lo que dice config); si beta cambia, derivar (x/Q)^beta. */
export function enElOptimo(s: State): boolean {
  if (!infinitoRoto(s) || !enInfinito(s) || s.infinitos === 0) return false
  const k = lcBruto(s) > C.blando_desde_log10 ? C.blando_factor : 1
  return produccion(s).div(s.energia).toNumber() * s.tiempoInfinito * k <= ordenesQ(s)
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

/** Bloque 10 y C6: el Infinito automático ya puede hacerse. Sin Romper, apenas llega; con el Infinito roto, en el óptimo
 * (§4) o al llegar a X Cristales. */
export function infinitoAutoListo(s: State): boolean {
  const { modo, log10 } = s.automat.infinito
  if (!infinitoRoto(s) || modo === 'llegar') return true
  if (modo === 'optimo') return enElOptimo(s)
  return cristalesAlInfinito(s).log10() >= log10 - 1e-9 // 1e-9: que 10^3 alcance para 1000
}
