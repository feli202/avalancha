// SPEC_CAPA1 §7.1–7.3: los Estratos. Ocho pilas debajo de la principal; cada una guarda s_k (log10 de granos), que no se
// pierde en el Infinito. Igual que el bloque de estratos de play_arena y Player.mods de balance/sim_capa1.py.
import { CFG1 } from './config1'
import { cristalesDe, efectoRed } from './red'
import type { State } from './state'

const E = CFG1.estratos
export const ESTRATOS = E.cantidad
/** Los Estratos existen con el nodo Estratos de la Red (nv1+). */
export const hayEstratos = (s: State) => efectoRed(s, 'estratos', 'flujo_x') > 0

/** flujo (log10/s) = γ × Estratos × Inercia × Capilaridad. */
export const flujoEstratos = (s: State) =>
  E.gamma_log10_por_s * efectoRed(s, 'estratos', 'flujo_x') * efectoRed(s, 'inercia', 'flujo_x', 1) * efectoRed(s, 'capilaridad', 'flujo_x', 1)

/** f1: más Caudal, más rápido se llena el primero. */
export const factorCaudal = (logCaudal: number) => Math.min(E.factor_caudal.max, Math.max(E.factor_caudal.min, logCaudal / E.factor_caudal.div))

/** γ_k (log10/s) del estrato k (0..7); `logCaudal` = log10 del Caudal de la Arena. */
export const gammaEstrato = (s: State, k: number, logCaudal: number) =>
  flujoEstratos(s) * (1 + E.permeabilidad.suma_gamma * s.estratos.perm[k]) * (k === 0 ? factorCaudal(logCaudal) : 1)

/** Avanza los estratos abiertos dt segundos de Arena. Un estrato nunca pasa al de arriba menos `separacion`, ni baja. */
export function crecerEstratos(s: State, dt: number, logCaudal: number): State['estratos'] {
  const e = s.estratos
  if (!e.abiertos || !flujoEstratos(s)) return e
  const n = [...e.s]
  for (let k = 0; k < e.abiertos; k++) {
    let x = n[k] + gammaEstrato(s, k, logCaudal) * dt
    if (k > 0) x = Math.min(x, n[k - 1] - E.separacion_log10)
    n[k] = Math.max(n[k], Math.min(x, E.capacidad_log10[k]))
  }
  return { ...e, s: n }
}

const wx = (s: State) => efectoRed(s, 'presion', 'w_x', 1) * efectoRed(s, 'sedimento2', 'w_x', 1) * efectoRed(s, 'abismo', 'w_x', 1)
/** Lo que aporta el estrato k a la Presión: w_base × (k+1) × wx × (1 + suma_w × nivel) × s_k. */
export const presionEstrato = (s: State, k: number) =>
  k < s.estratos.abiertos && hayEstratos(s)
    ? E.w_base_por_profundidad * (k + 1) * wx(s) * (1 + E.presion.suma_w * s.estratos.pres[k]) * Math.max(0, s.estratos.s[k]) ** E.exponente_presion
    : 0
/** Presión: se suma a log10 V (§10), así que queda multiplicada por la Densidad. */
export const presion = (s: State) => s.estratos.s.reduce((p, _, k) => p + presionEstrato(s, k), 0)

// ---------- compras (§7.3), en Cristales ----------
export type MejoraEstrato = 'perm' | 'pres'
const CURVA = { perm: E.permeabilidad, pres: E.presion }
/** log10 del costo de abrir el próximo estrato (Infinity si ya están todos). */
export const costoAbrirLog10 = (s: State) => E.abrir_log10[s.estratos.abiertos] ?? Infinity
/** log10 del costo del nivel L → L+1 de Permeabilidad o Presión del estrato k: c0 + k + paso × L + cub × L³ / 6. */
export function costoMejoraLog10(que: MejoraEstrato, k: number, L: number) {
  const c = CURVA[que]
  return c.c0 + c.por_profundidad * k + c.paso * L + (c.cub * L ** 3) / 6
}
export const costoAbrir = (s: State) => cristalesDe(costoAbrirLog10(s))
export const costoMejora = (s: State, que: MejoraEstrato, k: number) => cristalesDe(costoMejoraLog10(que, k, s.estratos[que][k]))

export const puedeAbrir = (s: State) => hayEstratos(s) && s.estratos.abiertos < ESTRATOS && s.cristales.gte(costoAbrir(s))
export const puedeMejorar = (s: State, que: MejoraEstrato, k: number) =>
  hayEstratos(s) && k >= 0 && k < s.estratos.abiertos && s.cristales.gte(costoMejora(s, que, k))

/** Abre el próximo estrato; si no se puede, devuelve el mismo estado. */
export const abrirEstrato = (s: State): State =>
  puedeAbrir(s) ? { ...s, cristales: s.cristales.sub(costoAbrir(s)), estratos: { ...s.estratos, abiertos: s.estratos.abiertos + 1 } } : s

/** Sube un nivel de Permeabilidad o Presión del estrato k; si no se puede, devuelve el mismo estado. */
export function mejorarEstrato(s: State, que: MejoraEstrato, k: number): State {
  if (!puedeMejorar(s, que, k)) return s
  const niveles = [...s.estratos[que]]
  niveles[k]++
  return { ...s, cristales: s.cristales.sub(costoMejora(s, que, k)), estratos: { ...s.estratos, [que]: niveles } }
}
