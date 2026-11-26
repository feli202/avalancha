// Capa 2 (beta), fase 3: la Fundición, las Brasas, la Temperatura y el quinto nivel (de fuego) de los nodos de la Red.
// docs/capa2/fundicion.md, temperatura_motor.md y red_fuego.md; las fórmulas son las de sim_capa2.py (brasas_al_fundir, Fuego.T).
// La marca de beta vive en la partida, no acá: sin beta `fuego` queda en cero (guardado.ts) y nada de esto cambia el juego.
import { CFG } from './config'
import { CFG2 } from './config2'
import { NIVEL_MAX_RED, compresionesConservadas, nivelRed } from './red'
import { estadoInicial, type State } from './state'

const FU = CFG2.fundicion
const TP = CFG2.temperatura
/** Los 25 nodos con nivel de fuego, en el orden de config. */
export const NODOS_FUEGO = Object.keys(CFG2.red_fuego)
/** Los niveles de fuego que ya hacen algo; el resto dice "próximamente" y no se compra (llegan en las fases 4–10). */
export const FUEGO_HECHO = new Set(['memoria', 'sedimentacion', 'eco'])

export const tieneFuego = (s: State, id: string) => s.fuego.nodos.includes(id)
export const precioFuego = (id: string) => CFG2.red_fuego[id].precio

/** Temperatura en K: 300 + 795 × Brasas totales^0,165 (Esquirla de fuego, Compresión térmica y Calor latente llegan después). */
export const temperatura = (s: State) => TP.inicial + TP.por_brasa * s.fuego.brasasTotales ** TP.exp_brasas
/** Lo que la Temperatura suma a la Densidad: (T − 300) / 1000. */
export const densidadFuego = (s: State) => (temperatura(s) - TP.inicial) * TP.densidad_por_K

/** Requisito: 1e308 Cristales totales en esta vuelta (el tope de los Cristales). */
export const puedeFundir = (s: State) => s.cristalesTotales.log10() >= FU.requisito_log10

/** Brasas = ⌊M_B × (log10 C / 308)^5,2⌋. Con los Cristales frenados en el tope da M_B (Crisol, cargas y Fusión llegan después). */
export function brasasAlFundir(s: State) {
  const x = Math.min(300, Math.log10(FU.M_B) + FU.brasas_exp * Math.log10(Math.max(1, s.cristalesTotales.log10() / FU.brasas_desde_log10)))
  return Math.floor(10 ** x + 1e-9)
}

/** Funde las Capas 0 y 1: se conservan la Automatización (interruptores, su configuración y la regla de las reliquias), las
 * estadísticas y todo el fuego. Memoria eterna: la vuelta arranca con Memoria nv4 y sus compresiones. */
export function fundir(s: State): State {
  if (!puedeFundir(s)) return s
  const b = brasasAlFundir(s)
  const i = estadoInicial()
  const t: State = {
    ...i, granos: 0, // granos_iniciales es solo para la primera partida
    auto: s.auto, automat: { ...s.automat, espera: 0 }, relicario: { ...i.relicario, regla: s.relicario.regla },
    tiempoTotal: s.tiempoTotal, granosTotales: s.granosTotales, mejorCorrida: s.mejorCorrida, compresionesSinAmbar: s.compresionesSinAmbar,
    fuego: { ...s.fuego, brasas: s.fuego.brasas + b, brasasTotales: s.fuego.brasasTotales + b, fundiciones: s.fuego.fundiciones + 1 },
  }
  if (!tieneFuego(t, 'memoria')) return t
  const m = { ...t, red: { ...t.red, memoria: NIVEL_MAX_RED } }
  return { ...m, compresiones: Math.min(compresionesConservadas(m), CFG.compresion.umbrales_log10.length) }
}

/** El nivel de fuego se compra con Brasas, con el nodo en nv4 en esta vuelta; es permanente. */
export const puedeComprarFuego = (s: State, id: string) =>
  FUEGO_HECHO.has(id) && !tieneFuego(s, id) && nivelRed(s, id) >= NIVEL_MAX_RED && s.fuego.brasas >= precioFuego(id)

export const comprarFuego = (s: State, id: string): State =>
  puedeComprarFuego(s, id) ? { ...s, fuego: { ...s.fuego, brasas: s.fuego.brasas - precioFuego(id), nodos: [...s.fuego.nodos, id] } } : s

/** Lecho infinito (Sedimentación de fuego): compresiones sin el tope de 17. */
export const lechoInfinito = (s: State) => tieneFuego(s, 'sedimentacion')
/** Memoria eterna: los autocompradores, el doble de rápido. */
export const ritmoAuto = (s: State) => (tieneFuego(s, 'memoria') ? CFG2.red_fuego.memoria.autocompradores_x : 1)
