import Decimal from 'break_infinity.js'
import { describe, expect, it } from 'vitest'
import {
  CFG, CFG1, INFINITO, abrirEstrato, costoAbrir, costoAbrirLog10, costoMejoraLog10, densidad, enInfinito, estadoInicial, factorCaudal,
  infinito, mejorarEstrato, presion, presionEstrato, produccion, tick, valor, type State,
} from '../src/core'
import { deserializar, serializar } from '../src/guardado/guardado'
import { desglose } from '../src/ui/desglose'
// Lo escribe `python balance/ref_estratos.py` con el bloque de estratos de play_arena y Player.mods de sim_capa1.py.
import SIM from './fixtures/estratos_sim.json'

const E = CFG1.estratos
const sinAutos = Object.fromEntries(Object.keys(CFG.autocompradores).map((k) => [k, false]))
const con = (red: Record<string, number>, estratos: Partial<State['estratos']>, extra: Partial<State> = {}): State => {
  const s = estadoInicial()
  return { ...s, auto: sinAutos, ...extra, red: { ...s.red, ...red }, estratos: { ...s.estratos, ...estratos } }
}

describe('Estratos', () => {
  for (const c of SIM)
    it(`igual que sim_capa1.py tras ${c.segundos} s de Arena: ${c.nombre} (s_k y Presión, ±1 %)`, () => {
      // Misma Red (sin Memoria: no cambia los estratos y así la Arena del test no compra ni comprime sola) y el mismo Caudal.
      let s = con({ ...(c.red as Record<string, number>), memoria: 0 }, { abiertos: c.abiertos, s: c.s0, perm: c.perm, pres: c.pres }, { caudal: c.caudal_nivel })
      for (let t = 0; t < c.segundos; t++) s = tick(s, 1)
      expect(enInfinito(s)).toBe(false) // la Arena corrió los 600 s
      c.s.forEach((ref, k) => expect(Math.abs(s.estratos.s[k] - ref)).toBeLessThanOrEqual(0.01 * Math.abs(ref) + 1e-9))
      expect(Math.abs(presion(s) - c.presion)).toBeLessThanOrEqual(0.01 * c.presion)
      expect(c.s.some((x) => x > 0)).toBe(true)
    })

  it('fórmulas de §7.2: flujo de la Red, Permeabilidad, f1 y el tope s_(k−1) − 2', () => {
    expect([0, 15, 45, 300].map(factorCaudal)).toEqual([E.factor_caudal.min, 0.5, 1.5, E.factor_caudal.max])
    const crece = (s: State, k = 0) => tick(s, 1).estratos.s[k] - s.estratos.s[k]
    const base = con({ estratos: 1 }, { abiertos: 1 })
    expect(crece(base)).toBeCloseTo(E.gamma_log10_por_s * E.factor_caudal.min)
    expect(crece(con({ estratos: 4, inercia: 4 }, { abiertos: 1 }))).toBeCloseTo(E.gamma_log10_por_s * 3 * 2 * E.factor_caudal.min)
    expect(crece(con({ estratos: 1 }, { abiertos: 1, perm: [2, 0, 0, 0, 0, 0, 0, 0] }))).toBeCloseTo(E.gamma_log10_por_s * 1.6 * E.factor_caudal.min)
    expect(crece(con({}, { abiertos: 1 }))).toBe(0) // sin el nodo Estratos no corren
    expect(crece(con({ estratos: 1 }, {}))).toBe(0) // sin abrir, tampoco
    // El segundo no pasa del primero menos la separación, ni baja si ya estaba por encima.
    const tope = tick(con({ estratos: 1 }, { abiertos: 2, s: [10, 7.9999, 0, 0, 0, 0, 0, 0] }), 1).estratos.s
    expect(tope[1]).toBeCloseTo(tope[0] - E.separacion_log10)
    expect(tick(con({ estratos: 1 }, { abiertos: 2, s: [10, 9.5, 0, 0, 0, 0, 0, 0] }), 1).estratos.s[1]).toBe(9.5)
    // Con la Energía en el Infinito la Arena no corre: los estratos tampoco.
    expect(crece({ ...base, energia: INFINITO })).toBe(0)
  })

  it('Presión: Σ w × (k+1) × wx × (1 + 0,25 × nivel) × s_k, sumada a log10 V (queda multiplicada por la Densidad)', () => {
    const s = con({ estratos: 1, presion: 2 }, { abiertos: 3, s: [20, 10, 5, 99, 0, 0, 0, 0], pres: [0, 2, 0, 0, 0, 0, 0, 0] }, { granos: 1000, compresiones: 4 })
    const w = E.w_base_por_profundidad * 1.44
    expect(presionEstrato(s, 0)).toBeCloseTo(w * 1 * 20)
    expect(presionEstrato(s, 1)).toBeCloseTo(w * 2 * 1.5 * 10)
    expect(presionEstrato(s, 3)).toBe(0) // sin abrir no cuenta
    expect(presion(s)).toBeCloseTo(w * (20 + 30 + 15))
    const sin = { ...s, estratos: estadoInicial().estratos }
    expect(valor(s).div(valor(sin)).log10()).toBeCloseTo(presion(s))
    expect(produccion(s).div(produccion(sin)).log10()).toBeCloseTo(presion(s) * densidad(s))
    expect(presion({ ...s, red: estadoInicial().red })).toBe(0) // sin el nodo Estratos
  })

  it('compras de §7.3: abrir 0/2/4/7/11/16/22/29 y Permeabilidad/Presión con costo cúbico', () => {
    expect(E.abrir_log10).toEqual([0, 2, 4, 7, 11, 16, 22, 29])
    expect(costoMejoraLog10('perm', 0, 0)).toBe(1)
    expect(costoMejoraLog10('perm', 3, 0)).toBe(4)
    expect(costoMejoraLog10('pres', 2, 6)).toBeCloseTo(1 + 2 + 0.6 * 6 + (0.1 * 216) / 6)
    let s = con({}, {}, { cristales: new Decimal(1000) })
    expect(abrirEstrato(s)).toBe(s) // hace falta el nodo Estratos
    s = con({ estratos: 1 }, {}, { cristales: new Decimal(1000) })
    expect(mejorarEstrato(s, 'perm', 0)).toBe(s) // sin abrir
    s = abrirEstrato(s)
    expect([s.estratos.abiertos, s.cristales.toNumber()]).toEqual([1, 999]) // 10^0 = 1 Cristal
    expect(costoAbrirLog10(s)).toBe(2)
    s = abrirEstrato(s)
    expect([s.estratos.abiertos, s.cristales.toNumber()]).toEqual([2, 899])
    s = mejorarEstrato(s, 'perm', 0) // 10^1
    s = mejorarEstrato(s, 'pres', 1) // 10^2
    expect([s.estratos.perm[0], s.estratos.pres[1], s.cristales.toNumber()]).toEqual([1, 1, 789])
    expect(mejorarEstrato(s, 'pres', 2)).toBe(s) // el tercero no está abierto
    const pobre = { ...s, cristales: new Decimal(3) }
    expect(mejorarEstrato(pobre, 'perm', 0)).toBe(pobre)
    expect(abrirEstrato(pobre)).toBe(pobre)
    const todos = con({ estratos: 1 }, { abiertos: 8 }, { cristales: new Decimal('1e300') })
    expect(abrirEstrato(todos)).toBe(todos)
    expect(costoAbrir(con({ estratos: 1 }, { abiertos: 7 })).log10()).toBeCloseTo(29)
  })

  it('persisten en el Infinito y en el guardado', () => {
    const e = { abiertos: 3, s: [12.5, 8, 1.25, 0, 0, 0, 0, 0], perm: [2, 1, 0, 0, 0, 0, 0, 0], pres: [0, 3, 1, 0, 0, 0, 0, 0] }
    const s = con({ estratos: 2 }, e, { energia: INFINITO, maxEnergia: INFINITO, infinitos: 1 })
    expect(infinito(s).estratos).toEqual(e)
    const p = deserializar(serializar({ estado: s, guardadoEn: 0, vistos: {}, record: 0, logros: {} }))
    expect(p.estado.estratos).toEqual(e)
    // Un guardado de antes de los Estratos: arrancan vacíos.
    const { estratos: _, ...viejo } = JSON.parse(serializar({ estado: s, guardadoEn: 0, vistos: {}, record: 0, logros: {} })).estado
    const v = deserializar(JSON.stringify({ version: 3, estado: viejo, guardadoEn: 0, vistos: {}, record: 0, logros: {} }))
    expect(v.estado.estratos).toEqual(estadoInicial().estratos)
  })

  it('el desglose de estadísticas suma la Presión', () => {
    const s = con({ estratos: 1 }, { abiertos: 2, s: [30, 20, 0, 0, 0, 0, 0, 0] }, { granos: 5000, colores: [8, 3, 0, 0], compresiones: 2 })
    const f = desglose(s)
    const p = f.find((x) => x.id === 'presion')!
    expect(p.log).toBeCloseTo(presion(s))
    expect(p.partes!.map((x) => x.log)).toEqual([presionEstrato(s, 0), presionEstrato(s, 1)])
    expect(f.reduce((a, x) => a + x.log, 0)).toBeCloseTo(produccion(s).log10(), 6)
    expect(desglose(estadoInicial()).some((x) => x.id === 'presion')).toBe(false)
  })
})
