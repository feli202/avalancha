// SPEC.md sección 4. Cada función es una fórmula de la spec, sin estado propio.
import Decimal from 'break_infinity.js'
import { CFG, type MutId } from './config'
import { presion } from './estratos'
import { cascadaExtra, densidadRed, ecoLog10, mutacionExtra } from './red'
import { cascadaRel, cauceRel, mutacionesRel } from './relicario'
import type { State } from './state'

const curva = (c0: number, g: number, s: number, n: number) => Decimal.pow10(c0 + g * n + (s * n * n) / 2)

// ---------- costos (nivel n → n+1) ----------
export const costoCaudal = (n: number) => curva(CFG.caudal.c0, CFG.caudal.g, CFG.caudal.s, n)
export const costoColor = (i: number, n: number) => curva(CFG.colores[i].c0, CFG.colores[i].g, CFG.colores[i].s, n)
export const costoCascada = (n: number) => curva(CFG.cascada.c0, CFG.cascada.g, 0, n)
export const costoMutacion = (id: MutId, n: number) => curva(CFG.mutaciones[id].c0, CFG.mutaciones[id].g, 0, n)

// ---------- producción ----------
export const INFINITO = Decimal.pow10(CFG.infinito_log10)
/** La Energía llegó a 1e308: la economía espera el Infinito (SPEC_CAPA1 §4, sin Romper). */
export const enInfinito = (s: State) => s.energia.gte(INFINITO)

export const densidad = (s: State) => 1 + CFG.compresion.densidad_por_nivel * s.compresiones + densidadRed(s)

/** Nivel máximo de Cascada y de cada Mutación (Cascada+ y Mutación+ de la Red lo suben). */
export const maxCascada = (s: State) => CFG.cascada.nivel_max + cascadaExtra(s)
export const maxMutacion = (s: State) => CFG.mutaciones.nivel_max + mutacionExtra(s)

/** F: granos por segundo. */
export const caudal = (s: State) =>
  CFG.caudal.granos_base * CFG.caudal.mult_por_nivel ** s.caudal *
  CFG.mutaciones.caudal.por_nivel ** (s.mutaciones.caudal * (1 + mutacionesRel(s))) // reliquia Mutaciones (SPEC_CAPA1 §5)

export function anillos(granos: number): number {
  const g0 = CFG.anillos.granos_primer_anillo
  return granos >= g0 ? Math.floor(Math.log2(granos / g0)) + 1 : 0
}

export const multColor = (i: number, nivel: number) =>
  Decimal.pow(CFG.colores[i].mult_por_nivel, nivel).mul(
    Decimal.pow(CFG.hito_colores.mult, Math.floor(nivel / CFG.hito_colores.cada)),
  )

export const multAnillos = (s: State) =>
  Decimal.pow(
    CFG.anillos.mult_por_anillo + CFG.mutaciones.expansion.por_nivel * s.mutaciones.expansion,
    anillos(s.granos),
  )

export const cascadaC = (s: State) =>
  CFG.cascada.c_por_nivel * s.cascada + (s.cascada >= 1 ? CFG.mutaciones.cascada.por_nivel * s.mutaciones.cascada + cascadaRel(s) : 0)

export const multCascada = (s: State) =>
  s.granos > 0
    ? Decimal.pow10(Math.max(0, cascadaC(s) * (CFG.cascada.exp_G * Math.log10(s.granos) - CFG.cascada.exp_penal)))
    : new Decimal(1)

/** V: valor de cada derrumbe. */
export const valor = (s: State) =>
  s.colores
    .reduce((v, nivel, i) => v.mul(multColor(i, nivel)), new Decimal(1))
    .pow(1 + cauceRel(s)) // reliquia Cauce: + colores_log10 × pct a log V
    .mul(multAnillos(s))
    .mul(multCascada(s))
    .mul(Decimal.pow(CFG.mutaciones.colores.por_nivel, s.mutaciones.colores * (1 + mutacionesRel(s))))
    .mul(Decimal.pow10(ecoLog10(s) + presion(s))) // Eco (SPEC_CAPA1 §6.3) y Presión de los Estratos (§7.2, §10)

/** Energía que da un grano que cae ahora: (K × G) × V^D. */
export const energiaPorGrano = (s: State) => valor(s).pow(densidad(s)).mul(CFG.K_derrumbes_por_grano * s.granos)

/** Energía/s = F × (K × G) × V^D. */
export const produccion = (s: State) => energiaPorGrano(s).mul(caudal(s))
