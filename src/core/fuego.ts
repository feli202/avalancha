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

// --- Motor de Brasas y reparto del calor (fase 4, temperatura_motor.md) ---

/** Los sectores del Motor, en el orden de las partes de cada reparto. */
export const SECTORES = ['pila', 'red', 'estratos', 'escarcha', 'relicario'] as const
export type Sector = (typeof SECTORES)[number]
/** El nodo de fuego que abre cada sector (Pila y Red abren con la primera Fundición). */
const ABRE: Record<Sector, string> = { pila: '', red: '', estratos: 'estratos', escarcha: 'frio', relicario: 'engarces' }

export const sectorAbierto = (s: State, k: Sector) => s.fuego.fundiciones > 0 && (!ABRE[k] || tieneFuego(s, ABRE[k]))
export const abiertos = (s: State) => SECTORES.map((k) => sectorAbierto(s, k))
/** Etapa del iris: 0 cerrado; 1 Pila y Red; 2 el Horno (Estratos); 3 Escarcha eterna; 4 Relicario de fuego, abierto del todo. */
export const etapaMotor = (s: State) => abiertos(s).filter(Boolean).length - (s.fuego.fundiciones > 0 ? 1 : 0)

/** Las partes del reparto entre los sectores abiertos, sumando 1 (los cerrados no cuentan; sin nada, todo a Pila). */
export function partes(rep: number[], ab: boolean[]): number[] {
  const p = SECTORES.map((_, i) => (ab[i] ? Math.max(0, rep[i] ?? 0) : 0))
  const t = p.reduce((a, b) => a + b, 0)
  return t > 0 ? p.map((x) => x / t) : SECTORES.map((_, i) => (i === 0 ? 1 : 0))
}
export const repartoActivo = (s: State) => partes(s.fuego.repartos[s.fuego.reparto], abiertos(s))

/** Calor de un sector: h = parte × (T − 300) / 1000. */
export const calor = (s: State, k: Sector) => repartoActivo(s)[SECTORES.indexOf(k)] * densidadFuego(s)
/** Extra del sector: 1 + efecto × h (Pila: multiplica colores y cauce en log10 V). */
export const extraSector = (s: State, k: Sector) => 1 + CFG2.motor.efecto[k] * calor(s, k)
/** Sector Red: Cristales por Infinito ×10^h (en log10). */
export const redLog10Motor = (s: State) => CFG2.motor.efecto.red * calor(s, 'red')

/** Pone la parte de un sector en `v` (0–1) y reparte el resto entre los otros abiertos, en proporción (o igual, si no tenían). */
export function ponerParte(rep: number[], i: number, v: number, ab: boolean[]): number[] {
  const p = partes(rep, ab)
  const x = Math.min(1, Math.max(0, v))
  const otros = SECTORES.map((_, j) => j !== i && ab[j])
  const n = otros.filter(Boolean).length
  if (!n) return p
  const resto = p.reduce((a, b, j) => a + (otros[j] ? b : 0), 0)
  return p.map((b, j) => (j === i ? x : otros[j] ? (resto > 0 ? (b / resto) * (1 - x) : (1 - x) / n) : 0))
}

/** Arrastrar el borde entre dos sectores: pasa `d` de la parte de `j` a la de `i` (sin dejar ninguna fuera de 0–1). */
export function moverBorde(rep: number[], i: number, j: number, d: number, ab: boolean[]): number[] {
  const p = partes(rep, ab)
  const x = Math.min(p[j], Math.max(-p[i], d))
  return p.map((b, k) => (k === i ? b + x : k === j ? b - x : b))
}

/** Guarda el reparto en el lugar que se está usando. */
export const ponerReparto = (s: State, rep: number[]): State =>
  ({ ...s, fuego: { ...s.fuego, repartos: s.fuego.repartos.map((r, k) => (k === s.fuego.reparto ? rep : r)) } })
/** Cambia a otro de los 3 repartos guardados. */
export const elegirReparto = (s: State, k: number): State =>
  k >= 0 && k < s.fuego.repartos.length ? { ...s, fuego: { ...s.fuego, reparto: k } } : s
