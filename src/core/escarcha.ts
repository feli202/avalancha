// SPEC_CAPA1 §9: la Escarcha. Un espesor logX (log10) que crece solo, suma m × logX a log10 V y resta log10(1 + logX/H) a
// la producción. Se rompe cada 30 min como mínimo: conserva la mitad y da Esquirlas. Igual que Player.esc_params y el bloque
// "escarcha (persiste)" de play_arena en balance/sim_capa1.py.
import { precioLog10 } from './config'
import { CFG1 } from './config1'
import { DEFECTOS, completo } from './defectos'
import { ESTRATOS, presion } from './estratos'
import { efectoRed } from './red'
import type { MejoraEscarcha, State } from './state'

const E = CFG1.escarcha, M = E.mejoras, DF = CFG1.defectos
export const MEJORAS_ESCARCHA: MejoraEscarcha[] = ['crecimiento', 'brillo', 'aguante']

/** El hito de la 1.1: el Estrato 8 lleno teniendo los 4 primeros Defectos. Abre la Escarcha (y el anillo 3 de la Red). */
export const hitoEscarcha = (s: State) =>
  s.estratos.abiertos >= ESTRATOS && s.estratos.s[ESTRATOS - 1] >= CFG1.estratos.meta_1_1_estrato8_log10 && DEFECTOS.every((d) => completo(s, d))
/** Corre (crece, suma y frena): abierta y fuera del Defecto Vidrio. */
export const escarchaActiva = (s: State) => s.escarcha.abierta && s.defectos.actual !== 'vidrio'

/** Los factores de g (log10 por segundo), para el desglose. Presión sin el ×0,5 de Dislocación (como last_pres del sim). */
export const factoresCrecimiento = (s: State) => ({
  base: E.g_log10_por_s,
  presion: 1 + E.g_por_presion * presion(s),
  crecimiento: M.crecimiento.x ** s.escarcha.mejoras.crecimiento,
  germen: efectoRed(s, 'germen', 'escarcha_g_x', 1),
  eco2: 1 + efectoRed(s, 'eco2', 'escarcha_eco') * Math.max(0, s.cristalesTotales.log10()),
  fatiga: completo(s, 'fatiga') ? DF.fatiga.recompensa_escarcha_g_x : 1,
})
/** Los factores de H. */
export const factoresAguante = (s: State) => ({
  base: E.H,
  aguante: M.aguante.x_H ** s.escarcha.mejoras.aguante,
  frio: efectoRed(s, 'frio', 'escarcha_H_x', 1),
  inclusion: completo(s, 'inclusion') ? DF.inclusion.recompensa_escarcha_H_x : 1,
})
const producto = (o: Record<string, number>) => Object.values(o).reduce((a, b) => a * b, 1)
/** g: cuánto crece logX por segundo. */
export const crecimientoEscarcha = (s: State) => producto(factoresCrecimiento(s))
/** H: el espesor con que la penalidad llega a log10 2. */
export const aguanteEscarcha = (s: State) => producto(factoresAguante(s))
/** m: cuánto suma cada orden de espesor a log10 V. */
export const brilloEscarcha = (s: State) => E.m + M.brillo.suma_m * s.escarcha.mejoras.brillo

/** Lo que suma a log10 V (queda multiplicado por la Densidad, §10). */
export const aporteEscarcha = (s: State) => (escarchaActiva(s) ? brilloEscarcha(s) * s.escarcha.logX : 0)
/** Lo que resta a log10 de la producción. */
export const penalEscarcha = (s: State) => (escarchaActiva(s) ? Math.log10(1 + s.escarcha.logX / aguanteEscarcha(s)) : 0)

/** Avanza la Escarcha dt segundos de Arena; antes de abrirse, solo mira si llegó el hito. */
export function crecerEscarcha(s: State, dt: number): State['escarcha'] {
  const e = s.escarcha
  if (!e.abierta) return hitoEscarcha(s) ? { ...e, abierta: true } : e
  if (!escarchaActiva(s)) return e
  return { ...e, logX: e.logX + crecimientoEscarcha(s) * dt, reloj: e.reloj + dt }
}

// ---------- romper ----------
export const ESPERA_RUPTURA_S = E.ruptura_bot_min * 60
export const puedeRomperEscarcha = (s: State) => escarchaActiva(s) && s.escarcha.reloj >= ESPERA_RUPTURA_S
/** Deshielo: la rompe sola (con el interruptor del panel de Automatización) y multiplica las Esquirlas. */
export const deshielo = (s: State) => efectoRed(s, 'deshielo', 'auto_ruptura') > 0
export const esquirlasAlRomper = (s: State) =>
  Math.floor((s.escarcha.logX * (1 - E.conserva_al_romper)) / E.esquirlas_por_ruptura_div) * efectoRed(s, 'deshielo', 'esquirlas_x', 1)
/** Conserva conserva_al_romper de logX y da Esquirlas; si no se puede, devuelve el mismo estado. */
export function romperEscarcha(s: State): State {
  if (!puedeRomperEscarcha(s)) return s
  const e = s.escarcha
  return { ...s, escarcha: { ...e, logX: e.logX * E.conserva_al_romper, esquirlas: e.esquirlas + esquirlasAlRomper(s), reloj: 0 } }
}

// ---------- mejoras con Esquirlas (costo 10^N, N entero) ----------
export const costoMejoraEscarchaLog10 = (k: MejoraEscarcha, L: number) => precioLog10(M[k].c0 + M[k].paso * L)
export const costoMejoraEscarcha = (s: State, k: MejoraEscarcha) => 10 ** costoMejoraEscarchaLog10(k, s.escarcha.mejoras[k])
export const puedeMejorarEscarcha = (s: State, k: MejoraEscarcha) => s.escarcha.abierta && s.escarcha.esquirlas >= costoMejoraEscarcha(s, k)
export function mejorarEscarcha(s: State, k: MejoraEscarcha): State {
  if (!puedeMejorarEscarcha(s, k)) return s
  const e = s.escarcha
  return { ...s, escarcha: { ...e, esquirlas: e.esquirlas - costoMejoraEscarcha(s, k), mejoras: { ...e.mejoras, [k]: e.mejoras[k] + 1 } } }
}
