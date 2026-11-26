// SPEC.md sección 4. Cada función es una fórmula de la spec, sin estado propio.
import Decimal from 'break_infinity.js'
import { CFG, precioLog10, type MutId } from './config'
import { CFG2 } from './config2'
import { densidadFuego, desborde, extraSector, metamorfosis, nivelLiberado } from './fuego'
import {
  baseAnillo, cascadaCExtra, cascadaX, colorSinEfecto, coloresX, densidadExtra, densidadFija, densidadX, derrumbesTope, fatigaLog10, hitoColor,
  presionX, sinMutaciones,
} from './defectos'
import { aporteEscarcha } from './escarcha'
import { presion } from './estratos'
import { cascadaExtra, densidadRed, ecoLog10, efectoRed, mutacionExtra, nivelRed } from './red'
import { cascadaRel, cauceRel, mutacionesRel } from './relicario'
import type { State } from './state'

type Exp = (n: number) => number
const curva = (c0: number, g: number, s = 0): Exp => (n) => c0 + g * n + (s * n * n) / 2

/** Exponente normal (sin redondeo ni softcap) del costo de cada mejora de la Arena, nivel n → n+1. */
export const expCaudal: Exp = curva(CFG.caudal.c0, CFG.caudal.g, CFG.caudal.s)
/** `sx`: la recompensa de Macla abarata el término cuadrático (colorSX). */
export const expColor = (i: number, sx = 1): Exp => curva(CFG.colores[i].c0, CFG.colores[i].g, CFG.colores[i].s * sx)
export const expCascada: Exp = curva(CFG.cascada.c0, CFG.cascada.g)
export const expMutacion = (id: MutId): Exp => curva(CFG.mutaciones[id].c0, CFG.mutaciones[id].g)

/** El precio normal del nivel n pasa de 1e308: la mejora está "más allá del Infinito". */
export const masAllaDelInfinito = (f: Exp, n: number) => f(n) > CFG.softcap_desde_log10

/** log10 del costo con softcap: exp_normal(n) + max(0, n − n_1e308), redondeado (SPEC §4.11). */
export function precioArenaLog10(f: Exp, n: number) {
  if (!masAllaDelInfinito(f, n)) return precioLog10(f(n))
  let lo = 0, hi = n // bisección: primer nivel cuyo exponente normal pasa de 1e308 (f es creciente)
  while (lo < hi) {
    const m = (lo + hi) >> 1
    if (masAllaDelInfinito(f, m)) hi = m
    else lo = m + 1
  }
  return precioLog10(f(n) + n - hi)
}

// ---------- costos (nivel n → n+1) ----------
export const costoCaudal = (n: number) => Decimal.pow10(precioArenaLog10(expCaudal, n))
export const costoColor = (i: number, n: number, sx = 1) => Decimal.pow10(precioArenaLog10(expColor(i, sx), n))
export const costoCascada = (n: number) => Decimal.pow10(precioArenaLog10(expCascada, n))
export const costoMutacion = (id: MutId, n: number) => Decimal.pow10(precioArenaLog10(expMutacion(id), n))

// ---------- producción ----------
export const INFINITO = Decimal.pow10(CFG.infinito_log10)
/** La Energía llegó a 1e308: ya se puede hacer Infinito. */
export const enInfinito = (s: State) => s.energia.gte(INFINITO)
/** Romper el Infinito: Ruptura nv1 (SPEC_CAPA1 §6.3). La Energía pasa de 1e308. */
export const infinitoRoto = (s: State) => nivelRed(s, 'ruptura') >= 1
/** Sin Romper, en 1e308 la economía se congela hasta el Infinito (SPEC_CAPA1 §4). */
export const congelada = (s: State) => enInfinito(s) && !infinitoRoto(s)

const N_COMP = CFG.compresion.umbrales_log10.length
// Capa 2: las compresiones de Lecho infinito (pasadas las 17) suman lecho_densidad; la Temperatura suma (T − 300) / 1000.
export const densidad = (s: State) => densidadFija(s) ? 1 : // Frontera (§8)
  (1 + CFG.compresion.densidad_por_nivel * Math.min(s.compresiones, N_COMP) + CFG2.liberaciones.lecho_densidad * Math.max(0, s.compresiones - N_COMP) +
  densidadFuego(s) + densidadRed(s) + densidadExtra(s) +
  efectoRed(s, 'compactacion2', 'densidad_por_anillo') * anillos(s.granos)) * densidadX(s) // Compactación II (§6.3); Macla (§8)

/** Nivel máximo de Cascada y de cada Mutación (Cascada+ y Mutación+ de la Red lo suben). */
export const maxCascada = (s: State) => CFG.cascada.nivel_max + cascadaExtra(s)
export const maxMutacion = (s: State) => CFG.mutaciones.nivel_max + mutacionExtra(s)
/** Hasta dónde se puede comprar: el máximo, o sin límite con Desborde / Metamorfosis (Capa 2). */
export const limiteCascada = (s: State) => (desborde(s) ? Infinity : maxCascada(s))
export const limiteMutacion = (s: State) => (metamorfosis(s) ? Infinity : maxMutacion(s))
/** El nivel que cuenta para el efecto: con Desborde / Metamorfosis, pasado el máximo corre el softcap de las liberaciones. */
export const cascadaEf = (s: State) => (desborde(s) ? nivelLiberado(s.cascada, maxCascada(s)) : s.cascada)
export const mutEf = (s: State, m: MutId) => (metamorfosis(s) ? nivelLiberado(s.mutaciones[m], maxMutacion(s)) : s.mutaciones[m])

/** Tope de los granos (son `number`): con Sedimentación el Caudal no vuelve a 0 al comprimir y en la 1.2 pasa de nivel 1000
 * (2^1000 granos/s), que desborda a Infinity y deja la Arena en NaN (F y G entran como number en la producción).
 * shortcut: arriba de 1e300 granos los anillos y los derrumbes dejan de crecer (sim_capa1.py va en log10 y no tiene tope);
 * pasar los granos a log10 o Decimal si eso llega a pesar en el balance. */
export const GRANOS_MAX = 1e300

/** F: granos por segundo (con el tope de GRANOS_MAX). */
export const caudal = (s: State) => Math.min(GRANOS_MAX,
  CFG.caudal.granos_base * CFG.caudal.mult_por_nivel ** s.caudal *
  CFG.mutaciones.caudal.por_nivel ** (mutEf(s, 'caudal') * (1 + mutacionesRel(s)))) // reliquia Mutaciones (SPEC_CAPA1 §5)

export function anillos(granos: number): number {
  const g0 = CFG.anillos.granos_primer_anillo
  return granos >= g0 ? Math.floor(Math.log2(granos / g0)) + 1 : 0
}

/** `hito`: el multiplicador de cada hito de color (Vacancia lo sube: hitoColor). */
export const multColor = (i: number, nivel: number, hito = CFG.hito_colores.mult) =>
  Decimal.pow(CFG.colores[i].mult_por_nivel, nivel).mul(Decimal.pow(hito, Math.floor(nivel / CFG.hito_colores.cada)))

export const multAnillos = (s: State) =>
  Decimal.pow(
    baseAnillo(s) + CFG.mutaciones.expansion.por_nivel * mutEf(s, 'expansion'), // Dislocación sube la base (§8)
    anillos(s.granos),
  )

export const cascadaC = (s: State) =>
  (CFG.cascada.c_por_nivel * cascadaEf(s) +
    (s.cascada >= 1 ? CFG.mutaciones.cascada.por_nivel * mutEf(s, 'cascada') + cascadaRel(s) + cascadaCExtra(s) : 0)) * cascadaX(s)

export const multCascada = (s: State) =>
  s.granos > 0
    ? Decimal.pow10(Math.max(0, cascadaC(s) * (CFG.cascada.exp_G * Math.log10(s.granos) - CFG.cascada.exp_penal)))
    : new Decimal(1)

/** V: valor de cada derrumbe. */
export const valor = (s: State) =>
  s.colores
    .reduce((v, nivel, i) => (colorSinEfecto(s, i) ? v : v.mul(multColor(i, nivel, hitoColor(s)))), new Decimal(1))
    .pow((1 + cauceRel(s)) * coloresX(s) * extraSector(s, 'pila')) // reliquia Cauce: + colores_log10 × pct a log V; Impureza: colores a la mitad; sector Pila del Motor
    .mul(multAnillos(s))
    .mul(multCascada(s))
    .mul(Decimal.pow(CFG.mutaciones.colores.por_nivel, sinMutaciones(s) ? 0 : mutEf(s, 'colores') * (1 + mutacionesRel(s)))) // Macla
    .mul(Decimal.pow10(ecoLog10(s) + presion(s) * presionX(s) + aporteEscarcha(s))) // Eco (§6.3), Presión (§7.2) y Escarcha (§9)

/** Energía que da un grano que cae ahora: (K × G) × V^D. */
export const energiaPorGrano = (s: State) =>
  valor(s).pow(densidad(s)).mul(Math.min(CFG.K_derrumbes_por_grano * s.granos, derrumbesTope(s))) // Impureza: tope
    .mul(Decimal.pow10(-fatigaLog10(s))) // SPEC_CAPA1 §10: la Fatiga, fuera de la Densidad

/** Energía/s = F × (K × G) × V^D. */
export const produccion = (s: State) => energiaPorGrano(s).mul(caudal(s))
