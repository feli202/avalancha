// Estadísticas · Producción: Energía/s = F × (K × G) × V^D partida en factores, cada uno en log10 (así se suman).
// Usa las fórmulas del núcleo; los factores con partes internas las traen en `partes`.
import {
  CFG, CFG1, anillos, cascadaC, cascadaRel, caudal, cauceRel, densidad, efectoRed, empuje, factorCaudal, hayEstratos, impulso, multAnillos,
  multCascada, multColor, mutacionesRel, presion, presionEstrato, valor, ecoLog10, aporteEscarcha, type State,
} from '../core'

export interface Factor {
  id: string
  /** log10 de lo que multiplica a la Energía/s. */
  log: number
  partes?: { id: string; log: number; n?: number }[]
}

const lg = (x: number) => Math.log10(x)

export function desglose(s: State): Factor[] {
  const F = CFG.caudal, M = CFG.mutaciones, H = CFG.hito_colores
  const colores = s.colores.map((n, i) => ({
    id: CFG.colores[i].id,
    log: multColor(i, n).log10(),
    partes: [
      { id: 'niveles', log: n * lg(CFG.colores[i].mult_por_nivel), n },
      { id: 'hitos', log: Math.floor(n / H.cada) * lg(H.mult), n: Math.floor(n / H.cada) },
    ],
  }))
  const nAnillos = anillos(s.granos)
  const logV = valor(s).log10()
  return [
    { id: 'caudal', log: lg(F.granos_base) + s.caudal * lg(F.mult_por_nivel), partes: [
      { id: 'base', log: lg(F.granos_base) },
      { id: 'niveles', log: s.caudal * lg(F.mult_por_nivel), n: s.caudal },
    ] },
    { id: 'derrumbes', log: s.granos > 0 ? lg(CFG.K_derrumbes_por_grano * s.granos) : 0, partes: [
      { id: 'k', log: lg(CFG.K_derrumbes_por_grano) },
      { id: 'granos', log: s.granos > 0 ? lg(s.granos) : 0 },
    ] },
    ...colores,
    { id: 'anillos', log: multAnillos(s).log10(), partes: [
      { id: 'cantidad', log: nAnillos * lg(CFG.anillos.mult_por_anillo), n: nAnillos },
      { id: 'expansion', log: multAnillos(s).log10() - nAnillos * lg(CFG.anillos.mult_por_anillo), n: s.mutaciones.expansion },
    ] },
    { id: 'cascada', log: multCascada(s).log10(), partes: [{ id: 'c', log: multCascada(s).log10(), n: cascadaC(s) }] },
    { id: 'mutaciones', log: s.mutaciones.caudal * lg(M.caudal.por_nivel) + s.mutaciones.colores * lg(M.colores.por_nivel), partes: [
      { id: 'mutCaudal', log: s.mutaciones.caudal * lg(M.caudal.por_nivel), n: s.mutaciones.caudal },
      { id: 'mutColores', log: s.mutaciones.colores * lg(M.colores.por_nivel), n: s.mutaciones.colores },
    ] },
    // Presión de los Estratos (SPEC_CAPA1 §10): se suma a log10 V. Solo con estratos abiertos.
    ...(s.estratos.abiertos && hayEstratos(s)
      ? [{ id: 'presion', log: presion(s), partes: s.estratos.s.slice(0, s.estratos.abiertos).map((_, k) => ({ id: `estrato${k}`, log: presionEstrato(s, k), n: k + 1 })) }]
      : []),
    // La Escarcha (SPEC_CAPA1 §9): su aporte a V.
    ...(s.escarcha.abierta
      ? [{ id: 'escarcha', log: aporteEscarcha(s), partes: [{ id: 'escarchaAporte', log: aporteEscarcha(s), n: s.escarcha.logX }] }]
      : []),
    // El exponente: V^D = V × V^(D−1). Lo que suma es (D − 1) × log10 V.
    { id: 'densidad', log: (densidad(s) - 1) * logV, partes: [{ id: 'exponente', log: (densidad(s) - 1) * logV, n: densidad(s) }] },
  ]
}

// ---------- Bloque 7 de las correcciones: el valor final de cada mejora y de cada estrato, con su desglose ----------
export interface Parte { id: string; log: number; n?: number }
/** Lo que vale una mejora con todo lo de afuera aplicado; `log` = suma de las partes (log10). */
export interface Valor { log: number; partes: Parte[] }
const valorDe = (partes: Parte[]): Valor => ({ log: partes.reduce((a, p) => a + p.log, 0), partes })

/** Cuánto multiplica cada mejora: Caudal en granos/s; el resto, a la Energía/s (las de V, elevadas a la Densidad).
 * null: la mejora muestra un número que no lleva multiplicadores de afuera (Mutación de Expansión y de Cascada). */
export function valorMejora(s: State, id: string): Valor | null {
  const M = CFG.mutaciones, rel = mutacionesRel(s), D1 = densidad(s) - 1
  const conD = (partes: Parte[]) => { const l = valorDe(partes).log; return valorDe([...partes, { id: 'densidad', log: D1 * l, n: D1 + 1 }]) }
  if (id === 'caudal') {
    const m = s.mutaciones.caudal * lg(M.caudal.por_nivel)
    return valorDe([
      { id: 'base', log: lg(CFG.caudal.granos_base) }, { id: 'niveles', log: s.caudal * lg(CFG.caudal.mult_por_nivel) },
      { id: 'mutacion', log: m }, { id: 'reliquia', log: m * rel },
    ])
  }
  if (id.startsWith('color')) {
    const i = Number(id.slice(5)), n = s.colores[i], H = CFG.hito_colores
    const niv = n * lg(CFG.colores[i].mult_por_nivel), hit = Math.floor(n / H.cada) * lg(H.mult)
    return conD([{ id: 'niveles', log: niv }, { id: 'hitos', log: hit }, { id: 'cauce', log: (niv + hit) * cauceRel(s) }])
  }
  if (id === 'cascada') {
    // multCascada = 10^(c × X): cada fuente de c aporta su parte del exponente.
    const l = multCascada(s).log10(), c = cascadaC(s), cN = CFG.cascada.c_por_nivel * s.cascada, cR = s.cascada >= 1 ? cascadaRel(s) : 0
    const k = c > 0 ? l / c : 0
    return conD([{ id: 'niveles', log: cN * k }, { id: 'mutacion', log: (c - cN - cR) * k }, { id: 'reliquia', log: cR * k }])
  }
  if (id === 'mut_caudal' || id === 'mut_colores') {
    const m = s.mutaciones[id.slice(4) as 'caudal' | 'colores'] * lg(M[id.slice(4) as 'caudal' | 'colores'].por_nivel)
    const p = [{ id: 'niveles', log: m }, { id: 'reliquia', log: m * rel }]
    return id === 'mut_caudal' ? valorDe(p) : conD(p)
  }
  return null
}

/** Velocidad local del estrato k (γ_k, log10 por segundo) partida en factores: base × Estratos × Inercia × Permeabilidad ×
 * Caudal (solo el primero) × empuje del de abajo. `x` = lo que multiplica cada uno. */
export function velocidadEstrato(s: State, k: number) {
  const E = CFG1.estratos
  const factores = [
    { id: 'estratos', x: efectoRed(s, 'estratos', 'flujo_x') },
    { id: 'inercia', x: impulso(s) },
    { id: 'perm', x: 1 + E.permeabilidad.suma_gamma * s.estratos.perm[k] },
    ...(k === 0 ? [{ id: 'caudal', x: factorCaudal(Math.log10(caudal(s))) }] : []),
    { id: 'empuje', x: empuje(s, k) },
  ]
  return { base: E.gamma_log10_por_s, factores, gamma: factores.reduce((g, f) => g * f.x, E.gamma_log10_por_s) }
}

// ---------- C8: log10 V por fuente (SPEC_CAPA1 §10, la tabla de §2) ----------
export const FUENTES_V = ['colores', 'anillos', 'cascada', 'mutaciones', 'presion', 'eco', 'escarcha', 'reliquias', 'defectos'] as const
export interface FuenteV { id: (typeof FUENTES_V)[number]; log: number; partes?: Parte[] }

/** log10 V partido por fuente; la suma es exactamente valor(s).log10(). Cada fuente se mide sin Defectos (ni reglas ni
 * recompensas); `defectos` es lo que cambian ellos (negativo si la regla en curso resta). `reliquias`: lo que suman las
 * engarzadas a V (Cauce a los colores, Cascada a c, Mutaciones a la de Colores; la de Caudal mueve F, no V). */
export function desgloseV(s: State): FuenteV[] {
  const s0: State = { ...s, defectos: { completos: [], actual: '', reintento: {} } }
  const colores = s0.colores.reduce((a, n, i) => a + multColor(i, n).log10(), 0)
  const casc = multCascada(s0).log10(), c = cascadaC(s0), cR = s0.cascada >= 1 ? cascadaRel(s0) : 0
  const cascRel = c > 0 ? (casc * cR) / c : 0
  const mut = s0.mutaciones.colores * lg(CFG.mutaciones.colores.por_nivel)
  const rel = [
    { id: 'cauce', log: colores * cauceRel(s0) },
    { id: 'cascada', log: cascRel },
    { id: 'mutaciones', log: mut * mutacionesRel(s0) },
  ]
  const partes: FuenteV[] = [
    { id: 'colores', log: colores },
    { id: 'anillos', log: multAnillos(s0).log10() },
    { id: 'cascada', log: casc - cascRel },
    { id: 'mutaciones', log: mut },
    { id: 'presion', log: hayEstratos(s0) ? presion(s0) : 0 },
    { id: 'eco', log: ecoLog10(s0) },
    { id: 'escarcha', log: aporteEscarcha(s0) },
    { id: 'reliquias', log: rel.reduce((a, p) => a + p.log, 0), partes: rel },
  ]
  const sinDefectos = valor(s0).log10()
  return [...partes, { id: 'defectos', log: valor(s).log10() - sinDefectos }]
}
