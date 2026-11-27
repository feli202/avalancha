// SPEC_CAPA1 §9: la Escarcha. Un espesor logX (log10) que crece solo hasta el Punto de ruptura P y suma m × logX a log10 V.
// En P se puede romper (a mano, o sola con Deshielo): da ⌊P / div⌋ Esquirlas y logX vuelve a logX_tras_romper. Si no se
// rompe, se queda en P. Igual que Player.esc_params y el bloque "escarcha (persiste)" de play_arena en balance/sim_capa1.py.
import { precioLog10 } from './config'
import { CFG1 } from './config1'
import { CFG2 } from './config2'
import { DEFECTOS_11, completo, enVidrio, recExp } from './defectos'
import { ESTRATOS, presion } from './estratos'
import { efectoRed } from './red'
import { extraSector, geodaX, milesK, tieneFuego } from './fuego'
import type { MejoraEscarcha, State } from './state'

const E = CFG1.escarcha, M = E.mejoras, DF = CFG1.defectos, EE = CFG2.escarcha_eterna
export const MEJORAS_ESCARCHA: MejoraEscarcha[] = ['crecimiento', 'brillo', 'umbral']

/** El hito de la 1.1: el Estrato 8 lleno teniendo los 4 primeros Defectos. Abre la Escarcha (y el anillo 3 de la Red). */
export const hitoEscarcha = (s: State) =>
  s.estratos.abiertos >= ESTRATOS && s.estratos.s[ESTRATOS - 1] >= CFG1.estratos.meta_1_1_estrato8_log10 && DEFECTOS_11.every((d) => completo(s, d))
/** Corre (crece, suma y frena): abierta y fuera del Defecto Vidrio. */
export const escarchaActiva = (s: State) => s.escarcha.abierta && !enVidrio(s)
/** Capa 2 (beta), Escarcha eterna (Frío de fuego): no se rompe, sigue creciendo (más lento pasado P) y da Esquirlas por segundo.
 * Sus mejoras pasan a Cristalización continua, Fulgor y Templanza (docs/capa2/escarcha_reliquias.md, esc_params de sim_capa2.py). */
export const escarchaEterna = (s: State) => tieneFuego(s, 'frio')

/** Los factores de g (log10 por segundo), para el desglose. Presión sin el ×0,5 de Dislocación (como last_pres del sim). */
export const factoresCrecimiento = (s: State) => ({
  base: E.g_log10_por_s,
  presion: 1 + E.g_por_presion * presion(s),
  crecimiento: M.crecimiento.x ** s.escarcha.mejoras.crecimiento,
  germen: efectoRed(s, 'germen', 'escarcha_g_x', 1),
  eco2: 1 + efectoRed(s, 'eco2', 'escarcha_eco') * Math.max(0, s.cristalesTotales.log10()),
  fatiga: completo(s, 'fatiga') ? DF.fatiga.recompensa_escarcha_g_x ** recExp(s, 'fatiga') : 1,
  hieloYFuego: tieneFuego(s, 'germen') ? 1 + CFG2.red_fuego.germen.g_por_kK * milesK(s) : 1, // Germen de fuego
  // Escarcha eterna: pasado el Punto de ruptura crece × (P / logX)^5,33
  templanza: escarchaEterna(s) && s.escarcha.logX > puntoRuptura(s) ? (puntoRuptura(s) / s.escarcha.logX) ** EE.softcap_exp : 1,
})
/** Los factores del Punto de ruptura P. */
export const factoresRuptura = (s: State) => ({
  base: E.punto_ruptura,
  umbral: M.umbral.x_P ** s.escarcha.mejoras.umbral,
  frio: efectoRed(s, 'frio', 'escarcha_P_x', 1),
  inclusion: completo(s, 'inclusion') ? DF.inclusion.recompensa_escarcha_P_x ** recExp(s, 'inclusion') : 1,
})
const producto = (o: Record<string, number>) => Object.values(o).reduce((a, b) => a * b, 1)
/** g: cuánto crece logX por segundo. */
export const crecimientoEscarcha = (s: State) => producto(factoresCrecimiento(s))
/** P: el Punto de ruptura, el espesor tope. */
export const puntoRuptura = (s: State) => producto(factoresRuptura(s))
/** m: cuánto suma cada orden de espesor a log10 V. */
export const brilloEscarcha = (s: State) => E.m * M.brillo.x_m ** s.escarcha.mejoras.brillo

/** Lo que suma a log10 V (queda multiplicado por la Densidad, §10). */
export const aporteEscarcha = (s: State) => (escarchaActiva(s) ? brilloEscarcha(s) * s.escarcha.logX : 0)
/** Segundos que faltan para llegar a P (0 si ya llegó). */
export const faltaRuptura = (s: State) => Math.max(0, puntoRuptura(s) - s.escarcha.logX) / crecimientoEscarcha(s)

/** Avanza la Escarcha dt segundos de Arena; antes de abrirse, solo mira si llegó el hito. */
export function crecerEscarcha(s: State, dt: number): State['escarcha'] {
  const e = s.escarcha
  if (!e.abierta) return hitoEscarcha(s) ? { ...e, abierta: true } : e
  if (!escarchaActiva(s)) return e
  if (escarchaEterna(s))
    return { ...e, logX: e.logX + crecimientoEscarcha(s) * dt, esquirlas: e.esquirlas + esquirlasPorSegundo(s) * dt, reloj: e.reloj + dt }
  return { ...e, logX: Math.min(puntoRuptura(s), e.logX + crecimientoEscarcha(s) * dt), reloj: e.reloj + dt }
}
/** Escarcha eterna: Esquirlas/s = (logX / 103,7)² × Geoda (×2 por nivel) × sector Escarcha del Motor. */
export const esquirlasPorSegundo = (s: State) =>
  escarchaEterna(s) && s.escarcha.logX > 0 ? EE.M * (s.escarcha.logX / EE.esq_d) ** EE.esq_exp * geodaX(s) * extraSector(s, 'escarcha') : 0

// ---------- romper ----------
export const puedeRomperEscarcha = (s: State) => escarchaActiva(s) && !escarchaEterna(s) && s.escarcha.logX >= puntoRuptura(s) - 1e-9
/** Deshielo: la rompe sola (con el interruptor del panel de Automatización) y multiplica las Esquirlas. */
export const deshielo = (s: State) => efectoRed(s, 'deshielo', 'auto_ruptura') > 0
export const esquirlasAlRomper = (s: State) =>
  Math.floor(puntoRuptura(s) / E.esquirlas_por_ruptura_div) * efectoRed(s, 'deshielo', 'esquirlas_x', 1)
/** Da Esquirlas y logX vuelve a logX_tras_romper; si no llegó a P, devuelve el mismo estado. */
export function romperEscarcha(s: State): State {
  if (!puedeRomperEscarcha(s)) return s
  const e = s.escarcha
  return { ...s, escarcha: { ...e, logX: E.logX_tras_romper, esquirlas: e.esquirlas + esquirlasAlRomper(s), reloj: 0 } }
}

// ---------- mejoras con Esquirlas (costo 10^N, N entero; con la Escarcha eterna el paso ×3,86) ----------
export const costoMejoraEscarchaLog10 = (k: MejoraEscarcha, L: number, eterna = false) =>
  precioLog10(M[k].c0 + M[k].paso * (eterna ? EE.paso_x : 1) * L)
export const costoMejoraEscarcha = (s: State, k: MejoraEscarcha) => 10 ** costoMejoraEscarchaLog10(k, s.escarcha.mejoras[k], escarchaEterna(s))
export const puedeMejorarEscarcha = (s: State, k: MejoraEscarcha) => s.escarcha.abierta && s.escarcha.esquirlas >= costoMejoraEscarcha(s, k)
export function mejorarEscarcha(s: State, k: MejoraEscarcha): State {
  if (!puedeMejorarEscarcha(s, k)) return s
  const e = s.escarcha
  return { ...s, escarcha: { ...e, esquirlas: e.esquirlas - costoMejoraEscarcha(s, k), mejoras: { ...e.mejoras, [k]: e.mejoras[k] + 1 } } }
}
/** Deshielo automático (Deshielo de fuego): compra las tres mejoras, la más barata primero, mientras alcancen las Esquirlas. */
export function mejorarEscarchaSola(s: State): State {
  for (;;) {
    const k = MEJORAS_ESCARCHA.reduce((a, b) => (costoMejoraEscarcha(s, b) < costoMejoraEscarcha(s, a) ? b : a))
    const n = mejorarEscarcha(s, k)
    if (n === s) return s
    s = n
  }
}
