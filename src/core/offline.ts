import Decimal from 'break_infinity.js'
import { CFG } from './config'
import { produccion } from './formulas'
import type { State } from './state'
import { tick } from './tick'

export interface Ausencia {
  s: State
  /** Segundos ausentes (ya con el tope). */
  segundos: number
  /** Energía producida en la ausencia (no la diferencia: las compras y las compresiones la gastan). */
  energia: Decimal
  compresiones: number
  /** SPEC_CAPA1 §12: lo que dejó la ausencia en la Capa 1. */
  infinitos: number
  cristales: Decimal
  /** log10 de granos de cada estrato al irse (para mostrar cuánto crecieron). */
  estratosAntes: number[]
  /** Espesor de la Escarcha al irse (logX). */
  escarchaAntes: number
}

/** SPEC 8 y SPEC_CAPA1 §12: el tiempo ausente con el mismo tick, en pasos de paso_s hasta max_pasos (después, pasos más
 * largos). `eficiencia` < 1 simula solo esa fracción del tiempo: Energía, Estratos e Infinitos rinden lo mismo que en ese
 * tiempo jugado, así que nunca más que jugando. Los Infinitos solo pasan si el Infinito automático está prendido (tick). */
export function fueraDeLinea(s: State, segundos: number, eficiencia = 1): Ausencia {
  const g = fueraDeLineaPasos(s, segundos, eficiencia)
  for (;;) { const r = g.next(); if (r.done) return r.value }
}

/** Lo mismo, de a tramos (la interfaz lo reparte en cuadros y muestra la barra): cada tantos pasos cede la fracción hecha. */
export function* fueraDeLineaPasos(s: State, segundos: number, eficiencia = 1, cada = 250): Generator<number, Ausencia> {
  const { paso_s, max_pasos, tope_horas } = CFG.fuera_de_linea
  const ausente = Math.min(Math.max(segundos, 0), tope_horas * 3600)
  const t = ausente * eficiencia
  const pasos = Math.min(Math.ceil(t / paso_s), max_pasos)
  const dt = t / pasos
  const antes = s
  let energia = new Decimal(0)
  for (let i = 0; i < pasos; i++) {
    const n = tick(s, dt)
    if (n === s) break // congelada en 1e308 sin Infinito automático: no pasa nada más
    if (n.infinitos === s.infinitos) energia = energia.add(produccion(s).mul(dt))
    s = n
    if ((i + 1) % cada === 0) yield (i + 1) / pasos
  }
  return {
    s, segundos: ausente, energia,
    compresiones: s.infinitos === antes.infinitos ? s.compresiones - antes.compresiones : 0,
    infinitos: s.infinitos - antes.infinitos,
    cristales: s.cristalesTotales.sub(antes.cristalesTotales),
    estratosAntes: antes.estratos.s.slice(0, antes.estratos.abiertos),
    escarchaAntes: antes.escarcha.logX,
  }
}
