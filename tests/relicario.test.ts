import Decimal from 'break_infinity.js'
import { describe, expect, it } from 'vitest'
import {
  CFG, CFG1, INFINITO, TIPOS, cascadaC, caudal, desequipar, elegir, elegirSola, equipar, escalon, espacios, estadoInicial,
  infinito, nivelFusion, oferta, tick, valor, type State,
} from '../src/core'
import { deserializar, serializar } from '../src/guardado/guardado'

const R = CFG1.relicario
const con = (rel: Partial<State['relicario']>, extra: Partial<State> = {}): State => {
  const s = estadoInicial()
  return { ...s, ...extra, relicario: { ...s.relicario, ...rel, reliquias: { ...s.relicario.reliquias, ...rel.reliquias } } }
}

describe('Relicario', () => {
  it('ofertas: misma semilla = mismas ofertas; 3 (4 con Engarces nv2+), nunca todas iguales', () => {
    const a = con({ semilla: 7 }), b = con({ semilla: 7 }), c = con({ semilla: 8 })
    const serie = (s: State) => Array.from({ length: 300 }, (_, i) => oferta(s, i + 1))
    expect(serie(a)).toEqual(serie(b))
    expect(serie(a)).not.toEqual(serie(c))
    for (const o of serie(a)) {
      expect(o).toHaveLength(R.ofertas_por_infinito)
      expect(o.every((t) => TIPOS.includes(t))).toBe(true)
      expect(new Set(o).size).toBeGreaterThan(1)
    }
    expect(new Set(serie(a).flat())).toEqual(new Set(TIPOS)) // salen los tres tipos
    const eng = (n: number) => ({ ...a, red: { ...a.red, engarces: n } })
    expect([1, 2, 3, 4].map((n) => oferta(eng(n), 1).length)).toEqual([3, 4, 4, 4])
    expect(serie(eng(2)).every((o) => new Set(o).size > 1)).toBe(true)
    expect(oferta(a)).toEqual([]) // sin Infinito pendiente no hay oferta
  })

  it('fusión: nivel = floor(log3(reliquias)); escalera Ámbar → Coral → Jade → Violeta → Ámbar +1', () => {
    expect([0, 1, 2, 3, 8, 9, 26, 27, 80, 81, 243].map(nivelFusion)).toEqual([-1, 0, 0, 1, 1, 2, 2, 3, 3, 4, 5])
    expect([1, 3, 9, 27, 81].map((n) => escalon(nivelFusion(n)))).toEqual([
      { color: 0, vuelta: 0 }, { color: 1, vuelta: 0 }, { color: 2, vuelta: 0 }, { color: 3, vuelta: 0 }, { color: 0, vuelta: 1 },
    ])
  })

  it('cada Infinito deja una oferta; elegir suma una reliquia; recargar no cambia la oferta', () => {
    const lleno = { energia: INFINITO, maxEnergia: INFINITO }
    let s = infinito(con({ semilla: 99 }, lleno))
    expect(s.relicario.pendiente).toBe(1)
    const o = oferta(s)
    const p = deserializar(serializar({ estado: s, guardadoEn: 0, vistos: {}, record: 0, logros: {} }))
    expect(oferta(p.estado)).toEqual(o)
    s = elegir(s, 1)
    expect(s.relicario.reliquias[o[1]]).toBe(1)
    expect(s.relicario.pendiente).toBe(0)
    expect(elegir(s, 0)).toBe(s) // ya no hay oferta
    // Un Infinito con la oferta anterior sin elegir: se elige sola y llega la nueva.
    s = infinito({ ...infinito({ ...s, ...lleno }), ...lleno })
    expect(Object.values(s.relicario.reliquias).reduce((a, b) => a + b)).toBe(2)
    expect(s.relicario.pendiente).toBe(3)
  })

  it('elección sola: la que suba de color antes; en empate, la del tipo equipado', () => {
    // Semilla con los tres tipos en la primera oferta.
    const semilla = Array.from({ length: 500 }, (_, i) => i).find((x) => new Set(oferta(con({ semilla: x }), 1)).size === 3)!
    const base = { semilla, pendiente: 1 }
    // Cascada tiene 2 (le falta 1 para Coral); las otras, 1 (les faltan 2).
    expect(elegirSola(con({ ...base, reliquias: { cauce: 1, cascada: 2, mutaciones: 1 } })).relicario.reliquias.cascada).toBe(3)
    // Empate: gana la equipada.
    const emp = con({ ...base, reliquias: { cauce: 1, cascada: 1, mutaciones: 1 }, equipadas: ['mutaciones'] })
    expect(elegirSola(emp).relicario.reliquias.mutaciones).toBe(2)
  })

  it('Infinito automático (Memoria nv4): elige solo', () => {
    const s = con({}, { energia: INFINITO, maxEnergia: INFINITO, infinitos: 1 })
    const t = tick({ ...s, red: { ...s.red, memoria: 4 } }, 0.05)
    expect(t.infinitos).toBe(2)
    expect(t.relicario.pendiente).toBe(0)
    expect(Object.values(t.relicario.reliquias).reduce((a, b) => a + b)).toBe(1)
  })

  it('Engarces: 1 espacio, 2/2/3/3 con el nodo; equipar es gratis y solo lo que se tiene', () => {
    const s = con({ reliquias: { cauce: 1, cascada: 1 } })
    expect(espacios(s)).toBe(1)
    expect([1, 2, 3, 4].map((n) => espacios({ ...s, red: { ...s.red, engarces: n } }))).toEqual([2, 2, 3, 3])
    expect(equipar(s, 'mutaciones', 0)).toBe(s) // no tiene ninguna
    expect(equipar(s, 'cauce', 1)).toBe(s) // no hay segundo espacio
    let e = equipar(s, 'cauce', 0)
    expect(e.relicario.equipadas).toEqual(['cauce'])
    expect(e.cristales.toNumber()).toBe(0)
    e = equipar(e, 'cascada', 0) // un solo espacio: reemplaza
    expect(e.relicario.equipadas).toEqual(['cascada'])
    const dos = { ...e, red: { ...e.red, engarces: 1 } }
    expect(equipar(dos, 'cauce', 1).relicario.equipadas).toEqual(['cascada', 'cauce'])
    expect(equipar(equipar(dos, 'cauce', 1), 'cauce', 0).relicario.equipadas).toEqual(['cauce', 'cascada']) // sin repetir
    expect(desequipar(e, 'cascada').relicario.equipadas).toEqual([])
  })

  it('efectos de §5 con los números de config, solo equipadas', () => {
    const arena: Partial<State> = { granos: 1e6, colores: [10, 5, 0, 0], cascada: 3, mutaciones: { caudal: 2, colores: 2, expansion: 0, cascada: 0 } }
    const sin = con({ reliquias: { cauce: 9, cascada: 9, mutaciones: 9 } }, arena) // nivel 2 (Jade), sin equipar
    const base = con({}, arena)
    expect(valor(sin).eq(valor(base))).toBe(true)
    expect(caudal(sin)).toBe(caudal(base))
    const eq = (t: string) => ({ ...sin, relicario: { ...sin.relicario, equipadas: [t] } })
    // Cauce: + colores_log10 × pct × (n+1) a log V.
    const coloresLog = valor({ ...base, granos: 1, cascada: 0, mutaciones: { ...base.mutaciones, colores: 0 } }).log10()
    expect(valor(eq('cauce')).div(valor(base)).log10()).toBeCloseTo(coloresLog * R.cauce_colores_pct_por_nivel * 3)
    // Cascada: + c_por_nivel × (n+1) al exponente c (solo con la Cascada comprada).
    expect(cascadaC(eq('cascada')) - cascadaC(base)).toBeCloseTo(R.cascada_c_por_nivel * 3)
    expect(cascadaC({ ...eq('cascada'), cascada: 0 })).toBe(0)
    // Mutaciones: las de Caudal y Colores rinden × (1 + pct × (n+1)).
    const m = 1 + R.mutaciones_efecto_por_nivel * 3
    expect(Math.log10(caudal(eq('mutaciones')) / caudal(base))).toBeCloseTo(2 * (m - 1) * Math.log10(CFG.mutaciones.caudal.por_nivel))
    expect(valor(eq('mutaciones')).div(valor(base)).log10()).toBeCloseTo(2 * (m - 1) * Math.log10(CFG.mutaciones.colores.por_nivel))
    // Nivel 0 (una reliquia): un solo paso.
    const una = con({ reliquias: { cascada: 1 }, equipadas: ['cascada'] }, arena)
    expect(cascadaC(una) - cascadaC(base)).toBeCloseTo(R.cascada_c_por_nivel)
  })

  it('guardado: conserva el Relicario, limpia lo imposible y le deja una oferta a un guardado de antes', () => {
    const s = con({ semilla: 5, reliquias: { cauce: 4, cascada: 1 }, equipadas: ['cauce'], pendiente: 2 }, { infinitos: 6, cristales: new Decimal(3) })
    const ida = (e: unknown) => deserializar(JSON.stringify({ version: 3, estado: e, guardadoEn: 0, vistos: {}, record: 0, logros: {} })).estado
    const plano = JSON.parse(serializar({ estado: s, guardadoEn: 0, vistos: {}, record: 0, logros: {} })).estado
    expect(ida(plano).relicario).toEqual(s.relicario)
    // Equipadas repetidas, de un tipo que no se tiene o más que los espacios; pendiente mayor que los Infinitos.
    const roto = { ...plano, relicario: { ...plano.relicario, equipadas: ['mutaciones', 'cauce', 'cauce', 'cascada', 7], pendiente: 40 } }
    expect(ida(roto).relicario).toMatchObject({ equipadas: ['cauce'], pendiente: 6 })
    const { relicario: _, ...viejo } = plano
    expect(ida(viejo).relicario).toMatchObject({ pendiente: 6, equipadas: [] })
  })
})
