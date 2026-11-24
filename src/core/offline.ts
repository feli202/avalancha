import Decimal from 'break_infinity.js'
import { CFG } from './config'
import { enDefecto } from './defectos'
import { INFINITO, produccion } from './formulas'
import type { State } from './state'
import { tick } from './tick'

export interface Ausencia {
  s: State
  /** Segundos que estuvo fuera (reales, sin tope). */
  fuera: number
  /** Segundos de juego a los que equivalen (con el tope y la eficiencia): lo que se simuló. */
  segundos: number
  /** Energía producida en la ausencia (no la diferencia: las compras y las compresiones la gastan). */
  energia: Decimal
  compresiones: number
  /** Estaba dentro de un Defecto: fuera de línea no avanza nada. */
  defecto: boolean
  /** log10 de granos de cada estrato al irse (para mostrar cuánto crecieron). */
  estratosAntes: number[]
  /** Espesor de la Escarcha al irse (logX). */
  escarchaAntes: number
}

/** SPEC 8 y SPEC_CAPA1 §12: la ausencia es un empujoncito, nunca la forma de avanzar. Cuenta como mucho `tope_horas`
 * (lo que pasa de ahí no da nada) y ese tiempo vale `eficiencia` (2 h fuera = 12 min de juego con 0,1). Se simula con el
 * mismo tick pero sin Infinitos: la Energía se frena en el umbral del Infinito (o donde estaba, si ya lo pasó con el
 * Infinito roto) y espera; sin Cristales, reliquias ni Infinitos automáticos. Estratos y Escarcha crecen con el mismo
 * tiempo reducido. Dentro de un Defecto no avanza nada.
 * `reglas = false`: la pestaña abierta pero oculta (el bucle se atrasó, no hubo ausencia): todo el tiempo, con el tick normal. */
export function fueraDeLinea(s: State, segundos: number, reglas = true): Ausencia {
  const g = fueraDeLineaPasos(s, segundos, reglas)
  for (;;) { const r = g.next(); if (r.done) return r.value }
}

/** Lo mismo, de a tramos (la interfaz lo reparte en cuadros y muestra la barra): cada tantos pasos cede la fracción hecha. */
export function* fueraDeLineaPasos(s: State, segundos: number, reglas = true, cada = 250): Generator<number, Ausencia> {
  const { paso_s, max_pasos, tope_horas, eficiencia } = CFG.fuera_de_linea
  const fuera = Math.max(segundos, 0)
  const defecto = reglas && enDefecto(s)
  const t = defecto ? 0 : reglas ? Math.min(fuera, tope_horas * 3600) * eficiencia : fuera
  const pasos = Math.min(Math.ceil(t / paso_s), max_pasos)
  const dt = t / pasos
  const antes = s
  const tope = Decimal.max(INFINITO, s.energia)
  let energia = new Decimal(0)
  for (let i = 0; i < pasos; i++) {
    let n = tick(s, dt, !reglas)
    if (n === s) break // congelada en el umbral: no pasa nada más
    if (reglas && n.energia.gt(tope)) n = { ...n, energia: tope, maxEnergia: Decimal.max(s.maxEnergia, tope) }
    const ganado = produccion(s).mul(dt)
    if (n.infinitos === s.infinitos) energia = energia.add(reglas ? Decimal.min(ganado, Decimal.max(0, tope.sub(s.energia))) : ganado)
    s = n
    if ((i + 1) % cada === 0) yield (i + 1) / pasos
  }
  return {
    s, fuera, segundos: t, energia, defecto,
    compresiones: s.infinitos === antes.infinitos ? s.compresiones - antes.compresiones : 0,
    estratosAntes: antes.estratos.s.slice(0, antes.estratos.abiertos),
    escarchaAntes: antes.escarcha.logX,
  }
}
