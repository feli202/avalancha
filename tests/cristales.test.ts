// C6: la fórmula de Cristales (SPEC_CAPA1 §4) contra infinity_reward de sim_capa1.py, y Romper el Infinito en el tick.
import Decimal from 'break_infinity.js'
import { describe, expect, it } from 'vitest'
import {
  CFG1, INFINITO, congelada, cristalesAlInfinito, enElOptimo, estadoInicial, infinitoAutoListo, produccion, tick, type State,
} from '../src/core'
// Lo escribe `python balance/ref_cristales.py`.
import SIM_JSON from './fixtures/cristales_sim.json'
const SIM = SIM_JSON as unknown as { nombre: string; red: Record<string, number>; E: number; lc: number }[]

const con = (red: Record<string, number>, E: number, extra: Partial<State> = {}): State => {
  const s = estadoInicial()
  return { ...s, infinitos: 1, energia: Decimal.pow10(E), ...extra, red: { ...s.red, ...red } }
}

describe('Cristales al hacer Infinito (§4)', () => {
  it.each(SIM)('$nombre: igual que infinity_reward', ({ red, E, lc }) => {
    const c = cristalesAlInfinito(con(red, E))
    expect(c.log10()).toBeCloseTo(lc, 6)
    if (lc < 6) expect(c.toNumber()).toBe(Math.round(10 ** lc)) // entero por debajo de 1e6
  })
  it('el primer Infinito da primer_infinito', () => {
    expect(cristalesAlInfinito(con({ ruptura: 1 }, 400, { infinitos: 0 })).toNumber()).toBe(1)
  })
})

describe('Romper el Infinito', () => {
  // Una Arena que produce mucho más que 1e308 por segundo.
  const FUERTE = { caudal: 60, colores: [600, 600, 600, 600], compresiones: 17, cascada: 20 }
  const arena = (red: Record<string, number>) => con(red, 300, FUERTE)
  it('sin Ruptura la Energía se frena en 1e308 y la economía se congela', () => {
    let s = arena({})
    for (let i = 0; i < 3; i++) s = tick(s, 1)
    expect(s.energia.eq(INFINITO)).toBe(true)
    expect(congelada(s)).toBe(true)
  })
  it('con Ruptura nv1 la Energía pasa de 1e308 y sigue corriendo', () => {
    let s = arena({ ruptura: 1 })
    expect(produccion(s).gt(0)).toBe(true)
    for (let i = 0; i < 3; i++) s = tick(s, 1)
    expect(s.energia.gt(INFINITO)).toBe(true)
    expect(congelada(s)).toBe(false)
  })
})

describe('Infinito automático en el óptimo', () => {
  // El ritmo 10^lc / t deja de subir cuando (P/E) × t × k ≤ Q. Con la Energía creciendo rápido (P/E alto) y mucho tiempo
  // encima, los Cristales todavía crecen más rápido que el tiempo: conviene esperar. Igual que sim_capa1.py, si al pasar
  // 1e308 el ritmo ya baja, el óptimo es enseguida.
  const FUERTE = { caudal: 60, colores: [600, 600, 600, 600], compresiones: 17, cascada: 20 }
  const lp = produccion(con({}, 0, FUERTE)).log10()
  const s = (t: number) => con({ ruptura: 1 }, lp + 1, { tiempoInfinito: t, ...FUERTE }) // P/E = 0,1 por segundo
  it('marca el óptimo según el tiempo de Infinito', () => {
    const g = produccion(s(1)).div(s(1).energia).toNumber()
    expect(g).toBeGreaterThan(0)
    const tOpt = CFG1.cristales.Q_ordenes_por_x10 / g
    expect(enElOptimo(s(tOpt * 0.5))).toBe(true)
    expect(enElOptimo(s(tOpt * 2))).toBe(false)
  })
  it('los modos del Infinito automático', () => {
    const modo = (m: State['automat']['infinito'], t = 1) => infinitoAutoListo({ ...s(t), automat: { ...s(t).automat, infinito: m } })
    expect(modo({ modo: 'optimo', log10: 0 })).toBe(true)
    expect(modo({ modo: 'optimo', log10: 0 }, 1e9)).toBe(false)
    expect(modo({ modo: 'llegar', log10: 0 }, 1e9)).toBe(true)
    expect(modo({ modo: 'cristales', log10: 12 })).toBe(true) // da ~10^12,4
    expect(modo({ modo: 'cristales', log10: 13 })).toBe(false)
  })
})
