// Capa 2, fase 5: el Horno y el Vidrio (docs/capa2/horno.md). Mismo estado que balance/ref_capa2.py => mismo Vidrio/s.
import Decimal from 'break_infinity.js'
import { describe, expect, it } from 'vitest'
import {
  CFG1, CFG2, INFINITO, MEJORAS_HORNO, brasasAlFundir, cascadaRel, costoHornoLog10, flujoFuego, fundir, hornoEncendido, infinito, mejorarHorno,
  puedeMejorarHorno, temperatura, tick, vidrioLog10, vidrioPorSegundo, estadoInicial, etapaMotor, type State,
} from '../src/core'
import { deserializar, serializar, type Partida } from '../src/guardado/guardado'
import REF from './fixtures/capa2_horno.json'

const MARCA = { codigo: 'ABCD2345', desde: 1.71e12 }
type Ref = (typeof REF)[number]
/** El estado del juego que corresponde a un caso de la referencia: 8 estratos abiertos, s_8, El Horno y su reparto. */
function desde(c: Ref): State {
  const i = estadoInicial()
  return {
    ...i, red: { ...i.red, estratos: 1 },
    estratos: { ...i.estratos, abiertos: 8, s: [...Array(7).fill(0), c.s8] },
    fuego: { ...i.fuego, fundiciones: 1, brasasTotales: c.Btot, nodos: ['estratos'], repartos: [[1 - c.estratos, 0, c.estratos, 0, 0], ...i.fuego.repartos.slice(1)], horno: c.horno },
  }
}

describe('contra sim_capa2.py', () => {
  for (const c of REF) it(c.nombre, () => {
    const s = desde(c)
    expect(vidrioLog10(s)).toBeCloseTo(c.vidrio_log, 9)
    expect(temperatura(s)).toBeCloseTo(c.T, 9)
    expect(flujoFuego(s)).toBeCloseTo(c.flujo_x, 9)
    expect(CFG2.fundicion.M_B + CFG2.horno.mejoras.crisol.suma * s.fuego.horno.crisol).toBe(c.MB)
    for (const k of MEJORAS_HORNO) expect(costoHornoLog10(k, s.fuego.horno[k])).toBe(c.costos[k])
    // Templado: el efecto de las reliquias engarzadas por relic_x (sin el sector Relicario, que no está abierto)
    const pz = { id: 1, tipo: 'cascada', nivel: 2, foto: '', inf: 1 }
    const conPieza = (x: State): State => ({ ...x, relicario: { ...x.relicario, piezas: [pz], equipadas: [1] } })
    expect(cascadaRel(conPieza(s))).toBeCloseTo(cascadaRel(conPieza(estadoInicial())) * c.relic_x, 12)
  })
})

describe('el Horno', () => {
  const c = REF[2]
  it('apagado sin El Horno o con menos de 8 estratos; el juego público no cambia', () => {
    const s = desde(c)
    expect(hornoEncendido(s)).toBe(true)
    expect(hornoEncendido({ ...s, fuego: { ...s.fuego, nodos: [] } })).toBe(false)
    expect(hornoEncendido({ ...s, estratos: { ...s.estratos, abiertos: 7 } })).toBe(false)
    expect(vidrioPorSegundo(estadoInicial()).eq(0)).toBe(true)
    expect(flujoFuego(estadoInicial())).toBe(1)
  })
  it('el Vidrio sube por segundo en el tick, también con la Arena frenada en 1e308', () => {
    const s = desde(c)
    const v = vidrioPorSegundo(s)
    expect(tick(s, 2).fuego.vidrio.div(v).toNumber()).toBeCloseTo(2, 6)
    const frenada = { ...s, energia: INFINITO, auto: { ...s.auto, infinito: false } }
    expect(tick(frenada, 3).fuego.vidrio.div(v).toNumber()).toBeCloseTo(3, 6)
  })
  it('Cristal fundido: cada Infinito suma 10 s de Vidrio', () => {
    const s = { ...desde(c), energia: INFINITO, infinitos: 2 }
    expect(infinito(s).fuego.vidrio.eq(0)).toBe(true)
    const f = { ...s, fuego: { ...s.fuego, nodos: ['estratos', 'cristalografia'] } }
    expect(infinito(f).fuego.vidrio.div(vidrioPorSegundo(f)).toNumber()).toBeCloseTo(CFG2.red_fuego.cristalografia.vidrio_s_por_infinito, 6)
  })
  it('las mejoras se pagan con Vidrio (1eN) y suben su nivel; sin Vidrio, nada', () => {
    const s = desde(REF[0])
    expect(puedeMejorarHorno(s, 'temperatura')).toBe(false)
    const rico = { ...s, fuego: { ...s.fuego, vidrio: new Decimal(25) } }
    const n = mejorarHorno(rico, 'temperatura')
    expect(n.fuego.horno.temperatura).toBe(1)
    expect(n.fuego.vidrio.toNumber()).toBeCloseTo(25 - 10 ** costoHornoLog10('temperatura', 0), 9)
    expect(vidrioLog10(n) - vidrioLog10(rico)).toBeCloseTo(Math.log10(2), 12)
    expect(mejorarHorno(s, 'crisol')).toBe(s)
  })
  it('Crisol sube las Brasas al fundir; Calor latente, la Temperatura', () => {
    const s = { ...desde(c), cristalesTotales: INFINITO }
    expect(brasasAlFundir(s)).toBe(1 + c.horno.crisol)
    expect(temperatura(s) - temperatura({ ...s, fuego: { ...s.fuego, horno: { ...s.fuego.horno, calor_latente: 0 } } })).toBeCloseTo(c.horno.calor_latente * 50, 9)
  })
  it('Motor etapa 2 con El Horno', () => expect(etapaMotor(desde(c))).toBe(2))
})

describe('estratos llenos (desde la primera Fundición)', () => {
  it('con el nodo Estratos nv1 se abren los 8 juntos, s_8 = 290,9 y cada uno la separación más que el de abajo', () => {
    const i = estadoInicial()
    const s: State = { ...i, red: { ...i.red, estratos: 1 }, fuego: { ...i.fuego, fundiciones: 1 } }
    const e = tick(s, 0.1).estratos
    const sep = CFG1.estratos.separacion_log10
    expect(e.abiertos).toBe(8)
    expect(e.s[7]).toBeGreaterThanOrEqual(CFG2.escalado.estratos_llenos_s8)
    expect(e.s[0]).toBeGreaterThanOrEqual(CFG2.escalado.estratos_llenos_s8 + 7 * sep)
  })
  it('sin Fundición (Capa 1) no', () => {
    const i = estadoInicial()
    expect(tick({ ...i, red: { ...i.red, estratos: 1 } }, 0.1).estratos.abiertos).toBe(0)
  })
  it('la Fundición conserva el Vidrio y las mejoras', () => {
    const s = { ...desde(REF[2]), cristalesTotales: INFINITO }
    const v = { ...s, fuego: { ...s.fuego, vidrio: new Decimal('1e40') } }
    const f = fundir(v).fuego
    expect(f.vidrio.eq(v.fuego.vidrio)).toBe(true)
    expect(f.horno).toEqual(v.fuego.horno)
  })
})

describe('guardado del Horno', () => {
  const partida = (estado: State, beta = true): Partida => ({ estado, guardadoEn: 1.7e12, vistos: {}, record: 0, logros: {}, ...(beta && { beta: MARCA }) })
  const s = (() => { const x = desde(REF[3]); return { ...x, fuego: { ...x.fuego, vidrio: new Decimal('3.5e420') } } })()
  it('ida y vuelta en la beta (Vidrio en break_infinity)', () => {
    const f = deserializar(serializar(partida(s))).estado.fuego
    expect(f.vidrio.eq(s.fuego.vidrio)).toBe(true)
    expect(f.horno).toEqual(s.fuego.horno)
  })
  it('una partida de la fase 4 (sin Vidrio ni Horno) migra en cero', () => {
    const viejo = JSON.parse(serializar(partida(s)))
    delete viejo.estado.fuego.vidrio; delete viejo.estado.fuego.horno
    const f = deserializar(JSON.stringify(viejo)).estado.fuego
    expect(f.vidrio.eq(0)).toBe(true)
    expect(f.horno).toEqual(estadoInicial().fuego.horno)
    expect(f.brasasTotales).toBe(REF[3].Btot)
  })
  it('valores rotos se sanean y sin la marca de beta no hay Horno', () => {
    const viejo = JSON.parse(serializar(partida(s)))
    viejo.estado.fuego.vidrio = [-2, 5]; viejo.estado.fuego.horno = { temperatura: -1, tiro: 2.6, crisol: 1, calor_latente: 0, templado: 0 }
    const f = deserializar(JSON.stringify(viejo)).estado.fuego
    expect(f.vidrio.eq(0)).toBe(true)
    expect(f.horno).toMatchObject({ temperatura: 0, tiro: 2 })
    const pub = deserializar(serializar(partida(s, false))).estado.fuego
    expect(pub.vidrio.eq(0)).toBe(true)
    expect(pub.horno).toEqual(estadoInicial().fuego.horno)
  })
})
