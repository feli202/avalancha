// SPEC_CAPA1 §8, para la interfaz: los textos de regla y recompensa con los números de config, y los multiplicadores que
// cambia el Defecto en curso (con y sin la regla), calculados con el núcleo.
import Decimal from 'break_infinity.js'
import {
  CARGAS, CFG, CFG1, CFG2, DEFECTOS, cargaActual, cargaHecha, cargasAbiertas, enDefecto, aporteEscarcha, densidad, presionX, ecoLog10, fatigaLog10, multCascada, multColor, presion, valor, hitoColor, type DefectoId,
  type State,
} from '../core'
import { txt } from '../strings'
import { formato, formatoMult } from './formato'

const D = CFG1.defectos
const td = () => txt.cristal.defectos

/** La regla de la carga n (Capa 2: más fuerte en Vacancia, Dislocación, Macla, Impureza y Fatiga). */
export const regla = (id: DefectoId, n = 1) =>
  td().regla[id]({
    vacancia: n, dislocacion: D.dislocacion.presion_x ** n, macla: D.macla.densidad_x ** n, impureza: D.impureza.derrumbes_tope_log10,
    fatiga: D.fatiga.decada_s / n, frontera: 0, inclusion: 0, vidrio: 0,
  }[id], D.impureza.colores_x ** n)

/** La recompensa con la carga n hecha: la de la Capa 1 elevada a 1 + 0,375 × (n − 1) (las que suman, multiplicadas). */
export function recompensa(id: DefectoId, n = 1) {
  const e = 1 + ((CFG2.defectos.recompensa_exp_carga5 - 1) * (n - 1)) / (CARGAS - 1)
  const [a, b] = {
    vacancia: [CFG.hito_colores.mult, D.vacancia.recompensa_hito_mult],
    dislocacion: [CFG.anillos.mult_por_anillo, D.dislocacion.recompensa_anillo_mult],
    macla: [1, D.macla.recompensa_color_s_x],
    impureza: [0, D.impureza.recompensa_cascada_c],
    fatiga: [1, D.fatiga.recompensa_escarcha_g_x],
    frontera: [0, D.frontera.recompensa_densidad],
    inclusion: [1, D.inclusion.recompensa_escarcha_P_x],
    vidrio: [0, D.vidrio.cristales_log10],
  }[id]
  const suma = id === 'impureza' || id === 'frontera' || id === 'vidrio'
  return td().recompensa[id](a, suma ? b * e : b ** e)
}

/** La carga que muestra la ficha: la del Defecto en curso o la siguiente que se puede hacer (la última hecha si no hay más). */
export const cargaVista = (s: State, id: DefectoId) =>
  enDefecto(s, id) ? cargaActual(s) : Math.min(CARGAS, cargaHecha(s, id) + (cargaHecha(s, id) === 0 || cargasAbiertas(s, id) ? 1 : 0))
/** Estado de la marca k (1–5): hecha, disponible (abierta y la siguiente) o bloqueada. */
export const marca = (s: State, id: DefectoId, k: number) =>
  k <= cargaHecha(s, id) ? 'hecha' : k === cargaHecha(s, id) + 1 && (k === 1 || cargasAbiertas(s, id)) ? 'disponible' : 'bloqueada'

export const requisito = (id: DefectoId) => {
  const rq = D.requisitos[id]
  return td().requisito(grupo(id), Number(rq.red[1]), rq.estratos_abiertos ?? 0, rq.cristales_totales_log10 ?? 0)
}

/** 0: Defectos (1.1), 1: Defectos II (1.2). */
export const grupo = (id: DefectoId) => Math.floor(DEFECTOS.indexOf(id) / 4)

/** El mismo estado sin el Defecto en curso (para mostrar cuánto valdría afuera). */
const fuera = (s: State): State => ({ ...s, defectos: { ...s.defectos, actual: '' } })

export interface Cambio { id: string; dentro: string; fuera: string }
/** Los multiplicadores que cambia el Defecto en curso, ya con todo aplicado (como ×…, ^…). */
export function cambios(s: State): Cambio[] {
  const id = s.defectos.actual as DefectoId | ''
  if (!id) return []
  const f = fuera(s), x = (d: Decimal) => `×${formatoMult(d)}`
  // Como en la tienda y los Estratos: lo que vale ya elevado a la Densidad (así actúa en cada derrumbe).
  const pres = (t: State, k: number) => x(Decimal.pow10(presion(t) * k * densidad(t)))
  const colores = (t: State) => x(valor(t).div(valor({ ...t, colores: t.colores.map(() => 0) })).pow(densidad(t)))
  const ret: Record<DefectoId, Cambio[]> = {
    vacancia: [{ id: 'violeta', dentro: '×1', fuera: x(multColor(3, s.colores[3], hitoColor(s))) }],
    dislocacion: [
      { id: 'cascada', dentro: x(multCascada(s)), fuera: x(multCascada(f)) },
      { id: 'presion', dentro: pres(s, presionX(s)), fuera: pres(f, 1) },
    ],
    macla: [
      { id: 'densidad', dentro: `^${formatoMult(densidad(s))}`, fuera: `^${formatoMult(densidad(f))}` },
      { id: 'mutaciones', dentro: '×1', fuera: '' },
    ],
    impureza: [
      { id: 'derrumbes', dentro: formato(Math.min(CFG.K_derrumbes_por_grano * s.granos, 10 ** D.impureza.derrumbes_tope_log10)), fuera: formato(CFG.K_derrumbes_por_grano * s.granos) },
      { id: 'colores', dentro: colores(s), fuera: colores(f) },
    ],
    fatiga: [ // una carrera: cuánto se perdió y cuánto falta para el próximo ÷10
      { id: 'fatiga', dentro: `×10^−${formatoMult(fatigaLog10(s))}`, fuera: '×1' },
      { id: 'reloj', dentro: reloj(D.fatiga.decada_s / cargaActual(s) - (s.tiempoCorrida % (D.fatiga.decada_s / cargaActual(s)))), fuera: '' },
    ],
    frontera: [{ id: 'densidad', dentro: '^1', fuera: `^${formatoMult(densidad(f))}` }],
    inclusion: [ // sin la Presión se ve lo que aportan la Escarcha y el Eco
      { id: 'presion', dentro: '×1', fuera: pres(f, 1) },
      { id: 'escarcha', dentro: x(Decimal.pow10(aporteEscarcha(s) * densidad(s))), fuera: '' },
    ],
    vidrio: [
      { id: 'eco', dentro: '×1', fuera: x(Decimal.pow10(ecoLog10(f) * densidad(f))) },
      { id: 'escarcha', dentro: '×1', fuera: x(Decimal.pow10(aporteEscarcha(f) * densidad(f))) },
      { id: 'reliquias', dentro: '×1', fuera: '' },
    ],
  }
  return ret[id]
}

export const nombre = (id: string) => td().nombres[id]

const reloj = (seg: number) => `${Math.floor(seg / 60)}:${String(Math.floor(seg % 60)).padStart(2, '0')}`
