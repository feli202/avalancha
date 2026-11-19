// SPEC_CAPA1 §8: los Defectos. Un Defecto es un Infinito con una regla rota: se entra desde su pantalla (sale de la corrida
// sin Cristales), se gana al llegar a la meta de Energía (Cristales normales + recompensa permanente + reliquia) y se puede
// abandonar cuando quieras. Las reglas son las de Arena.logV_parts, Arena.lograte, Arena.D y buy_mut de balance/sim_capa1.py.
// Este archivo solo dice qué cambia; las fórmulas (formulas.ts, shop.ts, tick.ts) lo consultan.
import { CFG } from './config'
import { CFG1 } from './config1'
import type { State } from './state'

const D = CFG1.defectos
/** Los Defectos en el orden en que se hacen: el grupo de la 1.1 (Defectos) y el de la 1.2 (Defectos II), de a 4. */
export const DEFECTOS = ['vacancia', 'dislocacion', 'macla', 'impureza', 'fatiga', 'frontera', 'inclusion', 'vidrio'] as const
export type DefectoId = (typeof DEFECTOS)[number]
/** Los 4 de la 1.1: con ellos y el Estrato 8 lleno se abre la Escarcha. */
export const DEFECTOS_11 = DEFECTOS.slice(0, 4)

export const enDefecto = (s: State, id?: DefectoId) => (id ? s.defectos.actual === id : s.defectos.actual !== '')
export const completo = (s: State, id: string) => s.defectos.completos.includes(id)
/** Cristalografía II crece con esto. */
export const defectosCompletos = (s: State) => s.defectos.completos.length
export const metaLog10 = (id: DefectoId) => D[id].meta_log10

// ---------- reglas (solo dentro de su Defecto) ----------
/** Vacancia: Violeta se compra, pero no suma. */
export const colorSinEfecto = (s: State, i: number) => enDefecto(s, 'vacancia') && i === D.vacancia.color_sin_efecto
/** Dislocación: la Cascada no funciona (su c × 0) y la Presión vale la mitad. */
export const cascadaX = (s: State) => (enDefecto(s, 'dislocacion') ? D.dislocacion.cascada_x : 1)
export const presionX = (s: State) => (enDefecto(s, 'dislocacion') ? D.dislocacion.presion_x : enDefecto(s, 'inclusion') ? 0 : 1)
/** Macla: no hay Mutaciones y la Densidad vale ×0,85. */
export const sinMutaciones = (s: State) => enDefecto(s, 'macla') && D.macla.sin_mutaciones
export const densidadX = (s: State) => (enDefecto(s, 'macla') ? D.macla.densidad_x : 1)
/** Impureza: derrumbes por grano con tope y colores a la mitad (su log10, Cauce incluido, × colores_x). */
export const derrumbesTope = (s: State) => (enDefecto(s, 'impureza') ? 10 ** D.impureza.derrumbes_tope_log10 : Infinity)
export const coloresX = (s: State) => (enDefecto(s, 'impureza') ? D.impureza.colores_x : 1)
/** Fatiga: log10 de lo que se pierde, −t/600 con t la corrida desde la última Compresión (÷10 cada 10 min). */
export const fatigaLog10 = (s: State) => (enDefecto(s, 'fatiga') ? s.tiempoCorrida / D.fatiga.decada_s : 0)
/** Frontera: Densidad = 1. */
export const densidadFija = (s: State) => enDefecto(s, 'frontera')
/** Inclusión: la Presión de los Estratos no funciona. */
export const sinPresion = (s: State) => enDefecto(s, 'inclusion')
/** Vidrio: sin Relicario, sin Eco, sin Escarcha, los estratos quietos y sin los bonos de Cristales de la Red. */
export const enVidrio = (s: State) => enDefecto(s, 'vidrio')

// ---------- recompensas (permanentes) ----------
/** Vacancia: el hito de color ×4 → ×6. */
export const hitoColor = (s: State) => (completo(s, 'vacancia') ? D.vacancia.recompensa_hito_mult : CFG.hito_colores.mult)
/** Dislocación: cada anillo ×1,10 → ×1,12. */
export const baseAnillo = (s: State) => (completo(s, 'dislocacion') ? D.dislocacion.recompensa_anillo_mult : CFG.anillos.mult_por_anillo)
/** Macla: el término cuadrático del costo de los colores ×0,9. */
export const colorSX = (s: State) => (completo(s, 'macla') ? D.macla.recompensa_color_s_x : 1)
/** Impureza: +0,1 a la c de la Cascada (si tiene al menos un nivel, como las otras sumas a c). */
export const cascadaCExtra = (s: State) => (completo(s, 'impureza') ? D.impureza.recompensa_cascada_c : 0)
/** Frontera: Densidad +0,2. */
export const densidadExtra = (s: State) => (completo(s, 'frontera') ? D.frontera.recompensa_densidad : 0)
/** Vidrio: Cristales ×1000 (log10). Fatiga e Inclusión ayudan a la Escarcha (escarcha.ts). */
export const cristalesVidrioLog10 = (s: State) => (completo(s, 'vidrio') ? D.vidrio.cristales_log10 : 0)

// ---------- entrar, abandonar, ganar ----------
/** Lo que falta para poder entrar ('' = se puede). Dentro de cada grupo se hacen en orden. */
export function falta(s: State, id: DefectoId): '' | 'hecho' | 'otro' | 'anterior' | 'red' | 'estratos' | 'cristales' {
  const rq = D.requisitos[id], i = DEFECTOS.indexOf(id)
  if (completo(s, id)) return 'hecho'
  if (enDefecto(s)) return 'otro'
  if (i % 4 > 0 && !completo(s, DEFECTOS[i - 1])) return 'anterior' // dentro de cada grupo, en orden
  if ((s.red[rq.red[0]] ?? 0) < Number(rq.red[1])) return 'red'
  if (s.estratos.abiertos < (rq.estratos_abiertos ?? 0)) return 'estratos'
  if (s.cristalesTotales.log10() < (rq.cristales_totales_log10 ?? -Infinity)) return 'cristales'
  return ''
}
export const puedeEntrar = (s: State, id: DefectoId) => s.infinitos > 0 && falta(s, id) === ''
/** Llegó a la meta del Defecto en curso. */
export const metaAlcanzada = (s: State) => enDefecto(s) && s.energia.log10() >= metaLog10(s.defectos.actual as DefectoId) - 1e-9
/** Si fallás, volvé con ~30 veces más Cristales totales (log10 del objetivo; null si no hay sugerencia). */
export const volverCon = (s: State, id: DefectoId): number | null => s.defectos.reintento[id] ?? null
export const conReintento = (s: State, id: DefectoId) => ({
  ...s.defectos.reintento, [id]: Math.max(0, s.cristalesTotales.log10()) + D.reintento_cristales_totales_log10,
})
