// SPEC_CAPA1 §7.1–7.3: los Estratos. Ocho pilas debajo de la principal; cada una guarda s_k (log10 de granos), que no se
// pierde en el Infinito. Igual que el bloque de estratos de play_arena y Player.mods de balance/sim_capa1.py.
import { precioLog10 } from './config'
import { CFG1 } from './config1'
import { cristalesDe, efectoRed } from './red'
import { enVidrio } from './defectos'
import type { State } from './state'

const E = CFG1.estratos
export const ESTRATOS = E.cantidad
/** Los Estratos existen con el nodo Estratos de la Red (nv1+). */
export const hayEstratos = (s: State) => efectoRed(s, 'estratos', 'flujo_x') > 0

/** Impulso de Inercia: sube lineal con el tiempo desde el último Infinito hasta impulso_x a los impulso_s segundos. */
export const impulso = (s: State) => 1 + (efectoRed(s, 'inercia', 'impulso_x', 1) - 1) * Math.min(1, s.tiempoInfinito / E.impulso_s)
/** flujo (log10/s) = γ × Estratos × Impulso. */
export const flujoEstratos = (s: State) => E.gamma_log10_por_s * efectoRed(s, 'estratos', 'flujo_x') * impulso(s)
/** Separación: un estrato llega como mucho a s_(k−1) − esto (Capilaridad la achica). */
export const separacion = (s: State) => efectoRed(s, 'capilaridad', 'separacion', E.separacion_log10)
/** Empuje: el estrato de abajo acelera al de arriba, × (1 + empuje × s_(k+1)). El último abierto no tiene. */
export const empuje = (s: State, k: number, sk = s.estratos.s) =>
  k + 1 < s.estratos.abiertos ? 1 + E.empuje_por_estrato_inferior * Math.max(0, sk[k + 1]) : 1

/** f1: más Caudal, más rápido se llena el primero. */
export const factorCaudal = (logCaudal: number) => Math.min(E.factor_caudal.max, Math.max(E.factor_caudal.min, logCaudal / E.factor_caudal.div))

/** γ_k (log10/s) del estrato k (0..7); `logCaudal` = log10 del Caudal de la Arena; `sk`: los s_k con los que se empuja. */
export const gammaEstrato = (s: State, k: number, logCaudal: number, sk = s.estratos.s) =>
  flujoEstratos(s) * (1 + E.permeabilidad.suma_gamma * s.estratos.perm[k]) * (k === 0 ? factorCaudal(logCaudal) : 1) * empuje(s, k, sk)

/** Avanza los estratos abiertos dt segundos de Arena, de arriba a abajo (como sim_capa1.py). Un estrato nunca pasa al de
 * arriba menos la separación, ni baja. */
export function crecerEstratos(s: State, dt: number, logCaudal: number): State['estratos'] {
  const e = s.estratos
  if (!e.abiertos || !flujoEstratos(s) || enVidrio(s)) return e // Vidrio: los estratos quedan quietos
  const n = [...e.s], sep = separacion(s)
  for (let k = 0; k < e.abiertos; k++) {
    let x = n[k] + gammaEstrato(s, k, logCaudal, n) * dt
    if (k > 0) x = Math.min(x, n[k - 1] - sep)
    n[k] = Math.max(n[k], x)
  }
  return { ...e, s: n }
}

/** El estrato está en su tope (s_(k−1) − separación). El primero no tiene tope: cuenta siempre como lleno (Abismo). */
export const lleno = (s: State, k: number) => k === 0 || s.estratos.s[k] >= s.estratos.s[k - 1] - separacion(s) - 1e-9
/** Lo que aporta el estrato k a la Presión: w_base × (k+1)^e × Presión × (1 + suma_w × nivel) × Abismo si está lleno × s_k. */
export const presionEstrato = (s: State, k: number) =>
  k < s.estratos.abiertos && hayEstratos(s)
    ? E.w_base_por_profundidad * (k + 1) ** efectoRed(s, 'sedimento2', 'exp_profundidad', 1) * efectoRed(s, 'presion', 'w_x', 1) *
      (1 + E.presion.suma_w * s.estratos.pres[k]) * (lleno(s, k) ? efectoRed(s, 'abismo', 'lleno_x', 1) : 1) *
      Math.max(0, s.estratos.s[k]) ** E.exponente_presion
    : 0
/** Presión: se suma a log10 V (§10), así que queda multiplicada por la Densidad. */
export const presion = (s: State) => s.estratos.s.reduce((p, _, k) => p + presionEstrato(s, k), 0)

// ---------- compras (§7.3), en Cristales ----------
export type MejoraEstrato = 'perm' | 'pres'
const CURVA = { perm: E.permeabilidad, pres: E.presion }
/** log10 del costo de abrir el próximo estrato (Infinity si ya están todos). */
export const costoAbrirLog10 = (s: State) => precioLog10(E.abrir_log10[s.estratos.abiertos] ?? Infinity)
/** log10 del costo del nivel L → L+1 de Permeabilidad o Presión del estrato k: c0 + k + paso × L + cub × L³ / 6. */
export function costoMejoraLog10(que: MejoraEstrato, k: number, L: number) {
  const c = CURVA[que]
  return precioLog10(c.c0 + c.por_profundidad * k + c.paso * L + (c.cub * L ** 3) / 6)
}
export const costoAbrir = (s: State) => cristalesDe(costoAbrirLog10(s))
export const costoMejora = (s: State, que: MejoraEstrato, k: number) => cristalesDe(costoMejoraLog10(que, k, s.estratos[que][k]))

export const puedeAbrir = (s: State) => hayEstratos(s) && s.estratos.abiertos < ESTRATOS && s.cristales.gte(costoAbrir(s))
export const puedeMejorar = (s: State, que: MejoraEstrato, k: number) =>
  hayEstratos(s) && k >= 0 && k < s.estratos.abiertos && s.cristales.gte(costoMejora(s, que, k))

/** Abre el próximo estrato y lo llena de golpe hasta su tope: s_1 = s1_inicial, s_k = s_(k−1) − separación.
 * Si no se puede, devuelve el mismo estado. */
export function abrirEstrato(s: State): State {
  if (!puedeAbrir(s)) return s
  const k = s.estratos.abiertos, n = [...s.estratos.s]
  n[k] = Math.max(n[k], k === 0 ? E.s1_inicial : n[k - 1] - separacion(s))
  return { ...s, cristales: s.cristales.sub(costoAbrir(s)), estratos: { ...s.estratos, abiertos: k + 1, s: n } }
}

/** Sube un nivel de Permeabilidad o Presión del estrato k; si no se puede, devuelve el mismo estado. */
export function mejorarEstrato(s: State, que: MejoraEstrato, k: number): State {
  if (!puedeMejorar(s, que, k)) return s
  const niveles = [...s.estratos[que]]
  niveles[k]++
  return { ...s, cristales: s.cristales.sub(costoMejora(s, que, k)), estratos: { ...s.estratos, [que]: niveles } }
}
