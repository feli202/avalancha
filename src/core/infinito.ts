// SPEC_CAPA1 §3 y §4: el Infinito da Cristales y reinicia la Arena.
import Decimal from 'break_infinity.js'
import { CFG } from './config'
import { CFG1 } from './config1'
import { compresionesConservadas, conserva, cristalesRedLog10, efectoRed } from './red'
import { INFINITO, enInfinito, infinitoRoto, produccion } from './formulas'
import { conReintento, enDefecto, metaAlcanzada, puedeEntrar, type DefectoId } from './defectos'
import { elegirSola, reliquiasPorInfinito } from './relicario'
import { redLog10Motor, vidrioAlInfinito } from './fuego'
import { estadoInicial, type State } from './state'

const C = CFG1.cristales
/** SPEC_CAPA1 §1: el fin de la Capa 1, 1e308 Cristales totales (`infinito_log10`, como el simulador). */
export const finCapa1 = (s: State) => s.cristalesTotales.gte(INFINITO)
/** Capa 2: tope duro de Cristales y Cristales totales (el único lugar donde se define). El fuego de Ruptura lo va a levantar
 * acá, según `s`. Nunca menor que el umbral de finCapa1: si no, el fin no llegaría nunca (como el Infinito trabado en 99 %). */
export const topeCristales = (_s: State): Decimal => INFINITO
/** Q: órdenes de Energía más allá de 1e308 por cada ×10 de Cristales; Ruptura II lo baja. */
export const ordenesQ = (s: State) => C.Q_ordenes_por_x10 - efectoRed(s, 'ruptura2', 'Q_resta')
/** log10 de los Cristales antes del blando: mult + base + (E − INF)/Q (lo que pasa de 1e308 solo cuenta con Romper). */
const lcBruto = (s: State) =>
  cristalesRedLog10(s) + (enDefecto(s, 'vidrio') ? 0 : redLog10Motor(s)) + C.base_log10 + // sector Red del Motor (Vidrio: sin bonos)
    (infinitoRoto(s) ? Math.max(0, s.energia.log10() - CFG.infinito_log10) / ordenesQ(s) : 0) ** C.beta
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

/** Reinicia todo lo de la Arena y conserva lo de la Capa 1 (§3): el Infinito y entrar o salir de un Defecto. */
function reiniciarArena(s: State): State {
  const { auto, automat, tiempoTotal, granosTotales, mejorCorrida, compresionesSinAmbar, red, estratos, relicario, cristales,
    cristalesTotales, infinitos, defectos, escarcha, fuego } = s
  return {
    ...estadoInicial(), granos: 0, // granos_iniciales es solo para la primera corrida
    auto, automat, tiempoTotal, granosTotales, mejorCorrida, compresionesSinAmbar, red, estratos, relicario, cristales,
    cristalesTotales, infinitos, defectos, escarcha, fuego,
    ...(conserva(s, 'mutaciones') ? { mutaciones: s.mutaciones } : {}), // Sedimentación nv4
    compresiones: Math.min(compresionesConservadas(s), CFG.compresion.umbrales_log10.length),
  }
}

/** Cobra los Cristales, trae la reliquia y reinicia la Arena. */
function cerrarInfinito(s: State): State {
  const c = cristalesAlInfinito(s)
  return {
    ...reiniciarArena(s),
    // Bloque 8: cada Infinito trae una reliquia que espera su tipo; si quedaba una sin elegir, se elige sola antes.
    // La pila de este Infinito la pone la interfaz (conFoto).
    relicario: { ...elegirSola(s).relicario, pendiente: s.infinitos + 1, faltan: reliquiasPorInfinito(s), foto: '' },
    infinitos: s.infinitos + 1,
    fuego: vidrioAlInfinito(s), // Cristal fundido
    cristales: Decimal.min(topeCristales(s), s.cristales.add(c)),
    cristalesTotales: Decimal.min(topeCristales(s), s.cristalesTotales.add(c)),
  }
}

/** Cobra los Cristales y reinicia todo lo de la Arena; si la Energía no llegó al Infinito, o si hay un Defecto en curso
 * (solo termina en la meta o abandonando, §8), devuelve el mismo estado. */
export const infinito = (s: State): State => (!enInfinito(s) || enDefecto(s) ? s : cerrarInfinito(s))

/** §8: entra al Defecto. Sale de la corrida actual sin Cristales ni reliquia. Si no se puede, devuelve el mismo estado. */
export const entrarDefecto = (s: State, id: DefectoId): State =>
  puedeEntrar(s, id) ? { ...reiniciarArena(s), defectos: { ...s.defectos, actual: id } } : s

/** §8: abandona sin castigo (y sin Cristales); anota con cuántos Cristales totales conviene volver (~×30). */
export const abandonarDefecto = (s: State): State =>
  enDefecto(s)
    ? { ...reiniciarArena(s), defectos: { ...s.defectos, actual: '', reintento: conReintento(s, s.defectos.actual as DefectoId) } }
    : s

/** §8: llegó a la meta. Queda completo (la recompensa es permanente y Cristalografía II ya lo cuenta) y se cierra como un
 * Infinito: Cristales normales y una reliquia. Si no llegó, devuelve el mismo estado. */
export function ganarDefecto(s: State): State {
  if (!metaAlcanzada(s)) return s
  const { [s.defectos.actual]: _, ...reintento } = s.defectos.reintento
  return cerrarInfinito({ ...s, defectos: { completos: [...s.defectos.completos, s.defectos.actual], actual: '', reintento } })
}

/** Bloque 10 y C6: el Infinito automático ya puede hacerse. Sin Romper, apenas llega; con el Infinito roto, al llegar a X
 * Cristales o (v1.0) cuando daría N veces los Cristales actuales. 'optimo' solo lo usa el bot del test de balance. */
export function infinitoAutoListo(s: State): boolean {
  const { modo, log10, mult } = s.automat.infinito
  if (!infinitoRoto(s) || modo === 'llegar') return true
  if (modo === 'optimo') return enElOptimo(s)
  const c = cristalesAlInfinito(s).log10()
  // En el tope de Cristales ya no se multiplican: sin esto, la Arena se reiniciaría sin parar para nada.
  if (modo === 'multiplicar') return s.cristales.lt(topeCristales(s)) && c >= Math.max(0, s.cristales.log10()) + mult - 1e-9 // con 0 Cristales cuenta como 1
  return c >= log10 - 1e-9 // 1e-9: que 10^3 alcance para 1000
}
