import Decimal from 'break_infinity.js'
import { describe, expect, it } from 'vitest'
import {
  CFG, CFG1, DEFECTOS, INFINITO, abandonarDefecto, autocomprar, cascadaC, comprar, costo, cristalesAlInfinito, densidad, disponibles,
  energiaPorGrano, enDefecto, entrarDefecto, estadoInicial, falta, infinito, multAnillos, produccion, puedeComprar, tick, valor,
  type DefectoId, type State,
} from '../src/core'
import { deserializar, serializar } from '../src/guardado/guardado'
// Lo escribe `python balance/ref_defectos.py` con Arena.D, Arena.logV_parts y Arena.lograte de sim_capa1.py.
import SIM from './fixtures/defectos_sim.json'

const DF = CFG1.defectos
const conDef = (s: State, actual: string, completos: string[] = []): State => ({ ...s, defectos: { completos, actual, reintento: {} } })

/** La Arena del fixture, con los nombres del núcleo. */
function arena(): State {
  const s = estadoInicial(), a = SIM.arena
  return {
    ...s, caudal: a.caudal, colores: [...a.colores], cascada: a.cascada, compresiones: a.compresiones, granos: 10 ** a.log_granos, tiempoCorrida: a.tiempo_corrida,
    mutaciones: { caudal: a.mut[0], colores: a.mut[1], expansion: a.mut[2], cascada: a.mut[3] },
    red: { ...s.red, ...SIM.red }, cristalesTotales: Decimal.pow10(SIM.ctot_log10),
    estratos: { ...s.estratos, abiertos: SIM.estratos.abiertos, s: [...SIM.estratos.s, 0, 0, 0, 0, 0], pres: [...SIM.estratos.pres, 0, 0, 0, 0, 0] },
  }
}

describe('Defectos: las reglas y las recompensas hacen lo mismo que sim_capa1.py', () => {
  for (const c of SIM.casos)
    it(`${c.nombre}: Densidad, log10 V y log10 de la producción`, () => {
      const s = conDef(arena(), c.defecto, c.hechos)
      expect(densidad(s)).toBeCloseTo(c.D, 9)
      expect(valor(s).log10()).toBeCloseTo(c.logV, 6)
      expect(produccion(s).log10()).toBeCloseTo(c.lograte, 3) // el sim redondea log10(3) a 0,4771 en lF (6e-5 por Mutación de Caudal)
      expect(costo(s, 'color3').log10()).toBe(c.costo_violeta_log10)
    })
})

describe('Defectos: cada regla', () => {
  const s0 = arena()
  it('Vacancia: Violeta se compra pero no suma, y el autocomprador no lo compra', () => {
    const v = conDef({ ...s0, energia: Decimal.pow10(300), coloresDesbloqueados: 4 }, 'vacancia')
    expect(valor(v).log10()).toBeCloseTo(valor({ ...s0, colores: [...s0.colores.slice(0, 3), 0] }).log10(), 9)
    expect(puedeComprar(v, 'color3')).toBe(true)
    expect(valor(comprar(v, 'color3')).log10()).toBe(valor(v).log10())
    const auto = autocomprar({ ...v, automat: { ...v.automat, segundos: 0 } })
    expect(auto.colores[3]).toBe(v.colores[3])
    expect(auto.colores[0]).toBeGreaterThan(v.colores[0])
  })
  it('Dislocación: la Cascada no funciona y la Presión vale ×0,5', () => {
    const d = conDef(s0, 'dislocacion')
    expect(cascadaC(d)).toBe(0)
    expect(cascadaC(s0)).toBeGreaterThan(0)
    // sin la Cascada, lo único que cambia en log V es la mitad de la Presión
    const sinCasc = { ...s0, cascada: 0 }, dSinCasc = conDef(sinCasc, 'dislocacion')
    const P = valor(sinCasc).log10() - valor({ ...sinCasc, estratos: { ...sinCasc.estratos, abiertos: 0 } }).log10()
    expect(valor(sinCasc).log10() - valor(dSinCasc).log10()).toBeCloseTo(P * (1 - DF.dislocacion.presion_x), 9)
  })
  it('Macla: sin Mutaciones en la tienda y Densidad ×0,85', () => {
    const m = conDef({ ...s0, maxEnergia: Decimal.pow10(300) }, 'macla')
    expect(disponibles({ ...s0, maxEnergia: Decimal.pow10(300) }).some((id) => id.startsWith('mut_'))).toBe(true)
    expect(disponibles(m).some((id) => id.startsWith('mut_'))).toBe(false)
    expect(densidad(m) / densidad(s0)).toBeCloseTo(DF.macla.densidad_x, 12)
  })
  it('Impureza: derrumbes por grano con tope 1e4 y colores a la mitad', () => {
    const i = conDef(s0, 'impureza')
    expect(CFG.K_derrumbes_por_grano * s0.granos).toBeGreaterThan(1e4)
    expect(energiaPorGrano(i).log10()).toBeCloseTo(DF.impureza.derrumbes_tope_log10 + valor(i).log10() * densidad(i), 6)
    const sinCol = (s: State) => ({ ...s, colores: [0, 0, 0, 0] })
    const col = valor(s0).log10() - valor(sinCol(s0)).log10()
    expect(valor(i).log10() - valor(sinCol(i)).log10()).toBeCloseTo(col * DF.impureza.colores_x, 9)
  })
})

describe('Defectos: cada recompensa (permanente, también fuera del Defecto)', () => {
  const s0 = arena()
  it('Vacancia: el hito de color ×4 → ×6', () => {
    const hitos = s0.colores.reduce((n, c) => n + Math.floor(c / CFG.hito_colores.cada), 0)
    const pura = (s: State) => ({ ...s, cascada: 0 }) // la Cascada no depende de los colores; se saca para que la cuenta sea exacta
    const dif = valor(conDef(pura(s0), '', ['vacancia'])).log10() - valor(pura(s0)).log10()
    expect(dif).toBeCloseTo(hitos * Math.log10(DF.vacancia.recompensa_hito_mult / CFG.hito_colores.mult) * (1 + 0), 9)
  })
  it('Dislocación: cada anillo ×1,10 → ×1,12', () => {
    const r = conDef({ ...s0, mutaciones: { ...s0.mutaciones, expansion: 0 } }, '', ['dislocacion'])
    const n = Math.floor(Math.log2(s0.granos / CFG.anillos.granos_primer_anillo)) + 1
    expect(multAnillos(r).log10()).toBeCloseTo(n * Math.log10(DF.dislocacion.recompensa_anillo_mult), 9)
  })
  it('Macla: el término cuadrático de los colores ×0,9 (más baratos)', () => {
    const c = CFG.colores[2], n = s0.colores[2]
    const exp = Math.round(c.c0 + c.g * n + (c.s * DF.macla.recompensa_color_s_x * n * n) / 2)
    expect(costo(conDef(s0, '', ['macla']), 'color2').log10()).toBe(exp)
    expect(costo(conDef(s0, '', ['macla']), 'color2').lt(costo(s0, 'color2'))).toBe(true)
  })
  it('Impureza: +0,1 a la c de la Cascada, solo con al menos un nivel', () => {
    expect(cascadaC(conDef(s0, '', ['impureza'])) - cascadaC(s0)).toBeCloseTo(DF.impureza.recompensa_cascada_c, 12)
    expect(cascadaC(conDef({ ...s0, cascada: 0 }, '', ['impureza']))).toBe(0)
  })
})

describe('Defectos: entrar, abandonar y ganar', () => {
  /** Lista para la Vacancia: un Infinito hecho, Defectos nv1, Memoria completa e Infinito automático prendido. */
  const lista = (red: Record<string, number> = {}): State => {
    const s = estadoInicial()
    return { ...s, infinitos: 3, cristales: new Decimal(50), cristalesTotales: new Decimal(80), energia: Decimal.pow10(100), red: { ...s.red, memoria: 4, defectos: 1, ...red } }
  }
  it('requisitos: en orden, nivel de Defectos en la Red y estratos abiertos', () => {
    const s = lista()
    expect(falta(s, 'vacancia')).toBe('')
    expect(falta(s, 'dislocacion')).toBe('anterior')
    const v = conDef({ ...s, red: { ...s.red, defectos: 2 } }, '', ['vacancia'])
    expect(falta(v, 'dislocacion')).toBe('estratos')
    expect(falta({ ...v, estratos: { ...v.estratos, abiertos: DF.requisitos.dislocacion.estratos_abiertos! } }, 'dislocacion')).toBe('')
    expect(falta({ ...v, red: { ...v.red, defectos: 1 } }, 'dislocacion')).toBe('red')
    expect(falta(v, 'vacancia')).toBe('hecho')
    expect(falta(conDef(s, 'vacancia'), 'vacancia')).toBe('otro')
    expect(DEFECTOS.map((d) => DF.requisitos[d].red)).toEqual([
      ['defectos', 1], ['defectos', 2], ['defectos', 3], ['defectos', 4], ['defectos2', 1], ['defectos2', 2], ['defectos2', 3], ['defectos2', 4],
    ])
  })
  it('Defectos II: Fatiga abre el grupo (no pide Impureza) y pide Cristales totales; Frontera pide Fatiga', () => {
    const s = lista({ defectos2: 2 })
    expect(falta(s, 'fatiga')).toBe('cristales')
    const r = { ...s, cristalesTotales: Decimal.pow10(DF.requisitos.fatiga.cristales_totales_log10!) }
    expect(falta(r, 'fatiga')).toBe('')
    expect(falta(r, 'frontera')).toBe('anterior')
  })
  it('entrar sale de la corrida sin Cristales ni reliquia; abandonar no castiga y sugiere ×30 Cristales totales', () => {
    const s = lista(), e = entrarDefecto(s, 'vacancia')
    expect(enDefecto(e, 'vacancia')).toBe(true)
    expect(e.energia.eq(0)).toBe(true)
    expect([e.cristales.eq(s.cristales), e.infinitos, e.relicario.pendiente]).toEqual([true, s.infinitos, 0])
    expect(entrarDefecto(e, 'vacancia')).toBe(e) // ya adentro
    const a = abandonarDefecto({ ...e, energia: Decimal.pow10(200) })
    expect([enDefecto(a), a.energia.eq(0), a.cristales.eq(s.cristales), a.infinitos]).toEqual([false, true, true, s.infinitos])
    expect(a.defectos.reintento.vacancia).toBeCloseTo(Math.log10(80) + DF.reintento_cristales_totales_log10, 9)
    expect(entrarDefecto(lista({ defectos: 0 }), 'vacancia').defectos.actual).toBe('')
  })
  it('el Infinito (a mano o automático) no saca de un Defecto', () => {
    const r = lista({ ruptura: 1 }), soloInfinito = Object.fromEntries(Object.keys(r.auto).map((k) => [k, k === 'infinito']))
    const d = conDef({ ...r, auto: soloInfinito, energia: INFINITO.mul(1e5) }, 'dislocacion')
    expect(infinito(d)).toBe(d)
    const t = tick(d, 1)
    expect([enDefecto(t, 'dislocacion'), t.infinitos, t.energia.gt(INFINITO)]).toEqual([true, r.infinitos, true])
  })
  it('ganar: llega a la meta, queda completo, da los Cristales de ese Infinito y una reliquia (con la regla si es automático)', () => {
    const meta = DF.vacancia.meta_log10
    const d = conDef({ ...lista(), energia: Decimal.pow10(meta + 0.01) }, 'vacancia')
    const c = cristalesAlInfinito(conDef(d, '', ['vacancia']))
    const g = tick(d, 0.05)
    expect([enDefecto(g), g.defectos.completos, g.infinitos]).toEqual([false, ['vacancia'], d.infinitos + 1])
    expect(g.cristales.eq(d.cristales.add(c))).toBe(true)
    expect(g.relicario.pendiente).toBe(0) // Infinito automático: la reliquia la eligió la regla
    expect(g.relicario.piezas.length).toBe(1)
    // con el Infinito automático apagado, la reliquia espera que se elija
    const m = tick({ ...d, auto: { ...d.auto, infinito: false } }, 0.05)
    expect([m.defectos.completos, m.relicario.pendiente]).toEqual([['vacancia'], d.infinitos + 1])
    // por debajo de la meta, sigue adentro
    expect(enDefecto(tick({ ...d, energia: Decimal.pow10(meta - 1) }, 0.05), 'vacancia')).toBe(true)
  })
  it('Cristalografía II cuenta los Defectos completos', () => {
    const s = lista({ cristalografia2: 4 })
    const k = (CFG1.red['anillo3_1.2'].cristalografia2.cristales_log10_por_defecto as number[])[3]
    const l = (n: number) => cristalesAlInfinito(conDef(s, '', DEFECTOS.slice(0, n) as unknown as DefectoId[])).log10()
    expect(l(2) - l(0)).toBeCloseTo(2 * k, 1)
  })
  it('el guardado conserva los Defectos y descarta lo que no existe', () => {
    const s = { ...lista(), defectos: { completos: ['vacancia', 'nada', 'vacancia'], actual: 'dislocacion', reintento: { macla: 30, nada: 1 } } }
    const p = deserializar(serializar({ estado: s, guardadoEn: 0, vistos: {}, record: 0, logros: {} }))
    expect(p.estado.defectos).toEqual({ completos: ['vacancia'], actual: 'dislocacion', reintento: { macla: 30 } })
  })
})
