// Estadísticas · Producción: Energía/s = F × (K × G) × V^D partida en factores, cada uno en log10 (así se suman).
// Usa las fórmulas del núcleo; los factores con partes internas las traen en `partes`.
import { CFG, anillos, cascadaC, densidad, multAnillos, multCascada, multColor, valor, type State } from '../core'

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
    // El exponente: V^D = V × V^(D−1). Lo que suma es (D − 1) × log10 V.
    { id: 'densidad', log: (densidad(s) - 1) * logV, partes: [{ id: 'exponente', log: (densidad(s) - 1) * logV, n: densidad(s) }] },
  ]
}
