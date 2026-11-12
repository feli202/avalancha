// SPEC 7: los 16 logros, en orden. Se miran en cada cuadro; una vez conseguido, queda en el guardado.
import { CFG, MUTACIONES, anillos, densidad, type State } from '../core'

const L = CFG.logros

export const LOGROS: Record<string, (s: State, record: number) => boolean> = {
  derrumbe: (s) => s.granos >= 4 || s.compresiones > 0, // todos los granos caen al centro: el 4.º derrumba
  granos: (s) => s.granos >= L.granos_pila,
  avalancha: (_, r) => r >= L.avalancha,
  colores: (s) => s.colores.every((n) => n > 0),
  hito: (s) => s.colores.some((n) => n >= CFG.hito_colores.cada),
  anillo: (s) => anillos(s.granos) >= L.anillo,
  compresion: (s) => s.compresiones > 0,
  sinAmbar: (s) => s.compresionesSinAmbar > 0,
  cascada: (s) => s.cascada >= CFG.cascada.nivel_max,
  mutacion: (s) => MUTACIONES.some((m) => s.mutaciones[m] > 0),
  mutaciones: (s) => MUTACIONES.every((m) => s.mutaciones[m] >= CFG.mutaciones.nivel_max),
  densidad: (s) => densidad(s) >= L.densidad,
  anilloGrande: (s) => anillos(s.granos) >= L.anillo_grande,
  record: (_, r) => r >= L.avalancha_record,
  infinito: (s) => s.infinitos > 0,
  infinitoRapido: (s) => s.infinitos > 0 && s.tiempoTotal < L.infinito_rapido_horas * 3600,
}

/** Los que se cumplen ahora y todavía no están en `tiene`. */
export const nuevosLogros = (s: State, record: number, tiene: Record<string, boolean>) =>
  Object.keys(LOGROS).filter((k) => !tiene[k] && LOGROS[k](s, record))

/** El número de cada logro que va en su nombre o descripción (los textos están en es.logros). */
export const UMBRAL: Record<string, number> = {
  granos: L.granos_pila, avalancha: L.avalancha, hito: CFG.hito_colores.cada, anillo: L.anillo, densidad: L.densidad,
  anilloGrande: L.anillo_grande, record: L.avalancha_record, infinitoRapido: L.infinito_rapido_horas,
}
