import Decimal from 'break_infinity.js'
import { CFG, type MutId } from './config'

export interface State {
  // --- se reinicia con la Compresión ---
  energia: Decimal
  /** G: granos en la pila en esta corrida. */
  granos: number
  caudal: number
  /** Nivel de cada color, en el orden de CFG.colores. */
  colores: number[]
  cascada: number
  tiempoCorrida: number
  // --- permanente en la Capa 0 ---
  compresiones: number
  mutaciones: Record<MutId, number>
  maxEnergia: Decimal
  coloresDesbloqueados: number
  /** Interruptores de los autocompradores, con las claves de CFG.autocompradores. */
  auto: Record<string, boolean>
  infinitos: number
  tiempoTotal: number
  // --- estadísticas (SPEC 7: logros que pasan dentro del tick, también fuera de línea) ---
  /** Granos soltados en toda la partida (Caudal y Puñados). */
  granosTotales: number
  /** La corrida más corta que terminó en Compresión, en s (0 = ninguna todavía). */
  mejorCorrida: number
  /** Compresiones hechas con Ámbar en nivel 0. */
  compresionesSinAmbar: number
  // --- relojes internos ---
  relojAuto: number
  enfriamientoPunado: number
}

export const estadoInicial = (): State => ({
  energia: new Decimal(0),
  granos: CFG.granos_iniciales,
  caudal: 0,
  colores: CFG.colores.map(() => 0),
  cascada: 0,
  tiempoCorrida: 0,
  compresiones: 0,
  mutaciones: { caudal: 0, colores: 0, expansion: 0, cascada: 0 },
  maxEnergia: new Decimal(0),
  coloresDesbloqueados: CFG.colores.filter((c) => c.desbloqueo_log10 <= 0).length,
  auto: Object.fromEntries(Object.keys(CFG.autocompradores).map((k) => [k, true])),
  infinitos: 0,
  tiempoTotal: 0,
  granosTotales: 0,
  mejorCorrida: 0,
  compresionesSinAmbar: 0,
  relojAuto: 0,
  enfriamientoPunado: 0,
})
