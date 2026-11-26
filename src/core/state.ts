import Decimal from 'break_infinity.js'
import { CFG, type MutId } from './config'
import { CFG1 } from './config1'
import { CFG2 } from './config2'
import { NODOS } from './red'

/** Una reliquia del inventario. `foto`: la pila del Infinito en que nació (32×32 celdas, 2 bits, base64; '' = sin foto,
 * las de antes del bloque 8). `inf`: el número de ese Infinito (al fusionar queda la más vieja). */
export interface Pieza { id: number; tipo: string; nivel: number; foto: string; inf: number }
/** La regla de elección automática (bloque 8; se configura en el panel de Automatización). `orden`: Tipo fijo usa el primero;
 * Prioridad, la lista entera. `fusionar`: fusionar solas con Engarces II. `equipar`: engarzar siempre las mejores. */
/** Bloque 10: cuánto compra un autocomprador cada vez (0 = el máximo). */
export type Cantidad = 1 | 10 | 0
/** Bloque 10, el panel de Automatización. `intervalo` y `cantidad`, por autocomprador de compras (COMPRAS_AUTO).
 * `compresion`: comprimir al llegar al umbral o esperar `segundos` más. `infinito`: apenas llega o, con Romper el Infinito, en el óptimo (§4) o
 * al llegar a 10^`log10` Cristales. `segundos`: segundos de autocompradores contados en la corrida (los intervalos son múltiplos);
 * `espera`: segundos que lleva la Compresión lista. */
export interface Automat {
  intervalo: Record<string, number>
  cantidad: Record<string, Cantidad>
  compresion: { modo: 'umbral' | 'esperar'; segundos: number }
  /** v1.0: 'multiplicar' = cuando daría 10^mult veces los Cristales actuales; 'optimo' ya no está en la interfaz (lo usa el
   * bot del test de balance, como sim_capa1.py). log10 y mult van en log10. */
  infinito: { modo: 'llegar' | 'multiplicar' | 'cristales' | 'optimo'; log10: number; mult: number }
  segundos: number
  espera: number
}
export interface Regla { modo: 'fijo' | 'rotar' | 'completar' | 'subir' | 'prioridad'; orden: string[]; fusionar: boolean; equipar: boolean }

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
  /** Interruptores de los autocompradores: las claves de CFG.autocompradores más cascada, mutaciones e infinito (AUTOS). */
  auto: Record<string, boolean>
  /** Bloque 10: cómo compra cada autocomprador (se conserva siempre, como los interruptores). */
  automat: Automat
  /** Infinitos hechos (SPEC_CAPA1 §3). */
  infinitos: number
  // --- Capa 1: se conserva en un Infinito ---
  cristales: Decimal
  /** Nunca bajan. */
  cristalesTotales: Decimal
  /** Nivel (0..4) de cada nodo de la Red, con las claves de NODOS. */
  red: Record<string, number>
  /** SPEC_CAPA1 §5 y bloque 8: el inventario. `equipadas`: el id de la pieza de cada Engarce, en orden. `pendiente`: número del
   * Infinito cuya reliquia espera que se elija el tipo (0 = ninguna); `faltan`, cuántas de ese Infinito quedan por elegir
   * (2 con Engarces nv4); `foto`, su pila. `ultimo`: el último tipo elegido (Rotar). `espera`: las que llegaron con el
   * inventario lleno; entran solas apenas haya lugar. */
  relicario: { piezas: Pieza[]; equipadas: number[]; pendiente: number; faltan: number; foto: string; ultimo: string; regla: Regla; espera: Pieza[] }
  /** SPEC_CAPA1 §7. `s`: log10 de granos de cada estrato; `perm` y `pres`: niveles de Permeabilidad y Presión. */
  estratos: { abiertos: number; s: number[]; perm: number[]; pres: number[] }
  /** SPEC_CAPA1 §8. `actual`: el Defecto en curso ('' = ninguno). `reintento`: log10 de los Cristales totales con que conviene
   * volver a uno que se abandonó (~×30). */
  defectos: { completos: string[]; actual: string; reintento: Record<string, number> }
  /** SPEC_CAPA1 §9. `abierta`: llegó al hito de la 1.1 (queda para siempre). `logX`: el espesor (log10). `esquirlas`: enteras
   * y chicas (unas decenas por ruptura), así que van como número. `reloj`: segundos desde la última ruptura. */
  escarcha: { abierta: boolean; logX: number; esquirlas: number; mejoras: Record<MejoraEscarcha, number>; reloj: number }
  /** Capa 2 (beta, core/fuego.ts): lo permanente, que la Fundición no reinicia. Brasas enteras y chicas (~1e5 en la Ignición),
   * así que van como número. `nodos`: los que tienen su nivel de fuego. La Temperatura sale de `brasasTotales`.
   * `repartos`: los 3 repartos del calor guardados (partes por sector, en el orden de SECTORES); `reparto`: el que se usa.
   * `vidrio`: el del Horno (fase 5); `horno`: nivel de cada mejora del Horno. `vuelta`: segundos de juego desde la última
   * Fundición (Inercia eterna, fase 6). */
  fuego: { brasas: number; brasasTotales: number; fundiciones: number; nodos: string[]; repartos: number[][]; reparto: number; vidrio: Decimal; horno: Record<MejoraHorno, number>; vuelta: number }
  tiempoTotal: number
  /** Segundos de Arena desde el último Infinito (no se reinicia con la Compresión): el Impulso de Inercia. */
  tiempoInfinito: number
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

/** Autocompradores que compran ítems de la tienda (tienen intervalo y cantidad). */
export const COMPRAS_AUTO = ['caudal', ...CFG.colores.map((c) => c.id), 'cascada', 'mutaciones']
/** Todos los interruptores, en el orden del panel. */
export const AUTOS = [...COMPRAS_AUTO, 'compresion_auto', 'infinito', 'escarcha']
export type MejoraEscarcha = 'crecimiento' | 'brillo' | 'umbral'
export type MejoraHorno = keyof typeof CFG2.horno.mejoras

const ceros = () => Array<number>(CFG1.estratos.cantidad).fill(0)

export const estadoInicial =(): State => ({
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
  auto: Object.fromEntries(AUTOS.map((k) => [k, true])),
  automat: {
    intervalo: Object.fromEntries(COMPRAS_AUTO.map((k) => [k, CFG.automatizacion.intervalo_s])),
    cantidad: Object.fromEntries(COMPRAS_AUTO.map((k): [string, Cantidad] => [k, 0])),
    compresion: { modo: 'umbral', segundos: 0 },
    infinito: { modo: 'llegar', log10: 0, mult: Math.log10(CFG1.infinito_auto.multiplicar_x) },
    segundos: 0,
    espera: 0,
  },
  infinitos: 0,
  cristales: new Decimal(0),
  cristalesTotales: new Decimal(0),
  red: Object.fromEntries(Object.keys(NODOS).map((k) => [k, 0])),
  relicario: { piezas: [], equipadas: [], pendiente: 0, faltan: 0, espera: [], foto: '', ultimo: '', regla: { modo: 'completar', orden: [...CFG1.relicario.tipos], fusionar: true, equipar: false } },
  estratos: { abiertos: 0, s: ceros(), perm: ceros(), pres: ceros() },
  defectos: { completos: [], actual: '', reintento: {} },
  escarcha: { abierta: false, logX: 0, esquirlas: 0, mejoras: { crecimiento: 0, brillo: 0, umbral: 0 }, reloj: 0 },
  fuego: { brasas: 0, brasasTotales: 0, fundiciones: 0, nodos: [], repartos: CFG2.motor.repartos_iniciales.map((r) => [...r]), reparto: 0,
    vidrio: new Decimal(0), horno: { temperatura: 0, tiro: 0, crisol: 0, calor_latente: 0, templado: 0 }, vuelta: 0 },
  tiempoTotal: 0,
  tiempoInfinito: 0,
  granosTotales: 0,
  mejorCorrida: 0,
  compresionesSinAmbar: 0,
  relojAuto: 0,
  enfriamientoPunado: 0,
})
