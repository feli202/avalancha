// SPEC_CAPA1 §5: el Relicario. Tipos y números salen de config_capa1.json.
import { CFG1 } from './config1'
import { efectoRed } from './red'
import type { State } from './state'

const R = CFG1.relicario
export const TIPOS: string[] = R.tipos

/** Nivel de fusión con n reliquias de un tipo: floor(log3(n)); −1 sin ninguna. */
export const nivelFusion = (n: number) => (n >= 1 ? Math.floor(Math.log(n) / Math.log(3) + 1e-9) : -1)
export const nivelReliquia = (s: State, t: string) => nivelFusion(s.relicario.reliquias[t] ?? 0)
/** Escalera: el color (0 Ámbar … 3 Violeta) y cuántas vueltas lleva (el "+1"). */
export const escalon = (nivel: number) => ({ color: nivel % 4, vuelta: Math.floor(nivel / 4) })
/** Reliquias que le faltan al tipo para subir de color. */
export const faltan = (s: State, t: string) => 3 ** (nivelReliquia(s, t) + 1) - (s.relicario.reliquias[t] ?? 0)

export const espacios = (s: State) => Math.max(1, efectoRed(s, 'engarces', 'espacios', 1), efectoRed(s, 'engarces2', 'espacios', 1))
const cuantas = (s: State) => efectoRed(s, 'engarces', 'ofertas', R.ofertas_por_infinito)

// mulberry32: chico, determinista y sin estado afuera.
function azar(semilla: number) {
  let a = semilla >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), a | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** La oferta del Infinito número n (por defecto, la pendiente): semilla + n, así recargar no la cambia. Nunca todas iguales. */
export function oferta(s: State, n = s.relicario.pendiente): string[] {
  if (n <= 0) return []
  const r = azar(s.relicario.semilla + n)
  const o = Array.from({ length: cuantas(s) }, () => TIPOS[Math.floor(r() * TIPOS.length)])
  if (o.every((t) => t === o[0])) o[o.length - 1] = TIPOS[(TIPOS.indexOf(o[0]) + 1) % TIPOS.length]
  return o
}

/** Elige la reliquia i de la oferta pendiente; si no hay oferta o no existe, devuelve el mismo estado. */
export function elegir(s: State, i: number): State {
  const t = oferta(s)[i]
  if (!t) return s
  const rel = s.relicario
  return { ...s, relicario: { ...rel, pendiente: 0, reliquias: { ...rel.reliquias, [t]: (rel.reliquias[t] ?? 0) + 1 } } }
}

/** Sin elegir a tiempo o con Infinito automático: la que suba de color antes; en empate, la del tipo equipado. */
export function elegirSola(s: State): State {
  const o = oferta(s)
  const puntos = (t: string) => faltan(s, t) * 2 - (s.relicario.equipadas.includes(t) ? 1 : 0)
  return elegir(s, o.indexOf(o.reduce((a, b) => (puntos(b) < puntos(a) ? b : a), o[0])))
}

/** Pone el tipo en el espacio i (gratis). Solo tipos con alguna reliquia; un tipo ocupa un solo espacio. */
export function equipar(s: State, t: string, i: number): State {
  if (nivelReliquia(s, t) < 0 || i < 0 || i >= espacios(s)) return s
  const e = [...s.relicario.equipadas], j = e.indexOf(t)
  const k = Math.min(i, j < 0 ? e.length : e.length - 1)
  if (j >= 0) e[j] = e[k] // ya estaba puesta: cambia de lugar con la del espacio
  e[k] = t
  return { ...s, relicario: { ...s.relicario, equipadas: e } }
}
export const desequipar = (s: State, t: string): State =>
  s.relicario.equipadas.includes(t) ? { ...s, relicario: { ...s.relicario, equipadas: s.relicario.equipadas.filter((x) => x !== t) } } : s

// ---------- efectos (solo las equipadas; tabla de §5, igual que mods() de sim_capa1.py) ----------
const POR_NIVEL: Record<string, number> = {
  cauce: R.cauce_colores_pct_por_nivel, cascada: R.cascada_c_por_nivel, mutaciones: R.mutaciones_efecto_por_nivel,
}
/** El efecto de un tipo en el nivel dado (para mostrar). */
export const efectoNivel = (t: string, nivel: number) => (nivel < 0 ? 0 : POR_NIVEL[t] * (nivel + 1))
const efecto = (s: State, t: string) => (s.relicario.equipadas.slice(0, espacios(s)).includes(t) ? efectoNivel(t, nivelReliquia(s, t)) : 0)
/** Cauce: los colores valen (log10) × (1 + esto). */
export const cauceRel = (s: State) => efecto(s, 'cauce')
/** Cascada: se suma al exponente c. */
export const cascadaRel = (s: State) => efecto(s, 'cascada')
/** Mutaciones: las de Caudal y Colores rinden × (1 + esto). */
export const mutacionesRel = (s: State) => efecto(s, 'mutaciones')
