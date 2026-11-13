// Historial de la partida para Estadísticas: corridas, avalanchas de la pila visual y la Energía en el tiempo.
// No es parte del núcleo (no afecta la economía): lo lleva la interfaz y va en el guardado. Puro: sin DOM ni reloj.
import { CFG, densidad, type State } from '../core'

export interface Corrida {
  /** s de juego desde la Compresión anterior (o el comienzo). */
  duracion: number
  /** log10 de la Energía al comprimir. */
  energia: number
  /** Densidad después de esta Compresión. */
  densidad: number
}

export interface Historial {
  /** Las últimas MAX_CORRIDAS compresiones, de la más vieja a la más nueva. */
  corridas: Corrida[]
  /** Avalanchas de un grano solo por tamaño: casilla k = derrumbes en [10^(k/POR_DECADA), 10^((k+1)/POR_DECADA)). */
  avalanchas: number[]
  /** La avalancha más grande de la corrida actual. */
  mayorCorrida: number
  /** Derrumbes de la pila visual, sumados. */
  derrumbesPila: number
  /** Derrumbes de la economía (K × G por grano), sumados a medida que caen los granos. */
  derrumbes: number
  /** [tiempoTotal, log10 Energía], cada `paso` s de juego; al llenarse se descarta uno de cada dos y el paso se duplica. */
  serie: [number, number][]
  paso: number
  /** Reloj real (ms) del comienzo de la partida. */
  inicio: number
}

export const MAX_CORRIDAS = 10
export const POR_DECADA = 4
const MAX_SERIE = 600
const PASO_SERIE = 5 // s de juego

export const historialVacio = (inicio: number): Historial => ({
  corridas: [], avalanchas: [], mayorCorrida: 0, derrumbesPila: 0, derrumbes: 0, serie: [], paso: PASO_SERIE, inicio,
})

const log10E = (s: State) => (s.energia.gt(1) ? s.energia.log10() : 0)

/** Un paso del juego, de `antes` a `s` (muta h). Varias compresiones juntas (fuera de línea) no tienen detalle: no se anotan. */
export function registrar(h: Historial, antes: State, s: State) {
  const granos = s.granosTotales - antes.granosTotales
  if (granos > 0) h.derrumbes += granos * CFG.K_derrumbes_por_grano * s.granos
  if (s.compresiones === antes.compresiones + 1) {
    // El comienzo de cada corrida es tiempoTotal − tiempoCorrida: la resta es exacta aunque la Compresión caiga entre cuadros.
    const ini = (x: State) => x.tiempoTotal - x.tiempoCorrida
    // Nunca por debajo del umbral (M3): en una ausencia `antes` es la Energía del comienzo, no la de la Compresión.
    h.corridas = [...h.corridas, { duracion: ini(s) - ini(antes), energia: Math.max(log10E(antes), CFG.compresion.umbrales_log10[antes.compresiones]), densidad: densidad(s) }]
      .slice(-MAX_CORRIDAS)
  }
  if (s.compresiones !== antes.compresiones) h.mayorCorrida = 0
  const ult = h.serie.at(-1)
  if (!ult || s.tiempoTotal - ult[0] >= h.paso || s.compresiones !== antes.compresiones) {
    h.serie.push([s.tiempoTotal, log10E(s)])
    if (h.serie.length > MAX_SERIE) {
      h.serie = h.serie.filter((_, i) => i % 2 === 0)
      h.paso *= 2
    }
  }
}

/** Una avalancha terminada de la pila visual (muta h). Con flujo continuo puede ser una tanda de varios granos. */
export function contarAvalancha(h: Historial, derrumbes: number) {
  h.derrumbesPila += derrumbes
  h.mayorCorrida = Math.max(h.mayorCorrida, derrumbes)
}

/** La avalancha de un grano solo (muta h): va al histograma. Las de 0 derrumbes no entran (no hay log). */
export function muestraAvalancha(h: Historial, derrumbes: number) {
  if (derrumbes < 1) return
  const k = Math.floor(Math.log10(derrumbes) * POR_DECADA)
  while (h.avalanchas.length <= k) h.avalanchas.push(0)
  h.avalanchas[k]++
}

const num = (x: unknown, min = 0) => (typeof x === 'number' && Number.isFinite(x) && x >= min ? x : null)
const nums = (x: unknown) => (Array.isArray(x) && x.every((v) => num(v) !== null) ? (x as number[]) : null)

/** Lo que vino en un guardado (o importado), validado campo por campo; lo que no sirve vuelve a vacío. */
export function limpiarHistorial(x: any, inicio: number): Historial {
  const h = historialVacio(inicio)
  if (typeof x !== 'object' || x === null) return h
  if (Array.isArray(x.corridas))
    h.corridas = x.corridas
      .filter((c: any) => num(c?.duracion) !== null && num(c?.energia) !== null && num(c?.densidad) !== null)
      .map((c: Corrida) => ({ duracion: c.duracion, energia: c.energia, densidad: c.densidad }))
      .slice(-MAX_CORRIDAS)
  h.avalanchas = nums(x.avalanchas)?.slice(0, 64) ?? []
  if (Array.isArray(x.serie)) h.serie = x.serie.filter((p: unknown) => nums(p)?.length === 2).slice(-MAX_SERIE)
  h.mayorCorrida = num(x.mayorCorrida) ?? 0
  h.derrumbesPila = num(x.derrumbesPila) ?? 0
  h.derrumbes = num(x.derrumbes) ?? 0
  h.paso = num(x.paso, PASO_SERIE) ?? PASO_SERIE
  h.inicio = num(x.inicio) ?? inicio
  return h
}
