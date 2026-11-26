// Capa 2, fase 6: las liberaciones (docs/capa2/liberaciones.md). Mismo estado que balance/ref_capa2.py => mismos números.
import Decimal from 'break_infinity.js'
import { describe, expect, it } from 'vitest'
import {
  CFG, MUTACIONES, autocomprar, cascadaC, comprarMax, costo, densidad, densidadFuego, disponibles, efectoRed, estadoInicial,
  extraLiberado, fundir, impulso, magma, nivelLiberado, tick, umbralLog10, type MutId, type State,
} from '../src/core'
import { deserializar, serializar, type Partida } from '../src/guardado/guardado'
import REF from './fixtures/capa2_liberaciones.json'

const MARCA = { codigo: 'ABCD2345', desde: 1.71e12 }
const i0 = estadoInicial()
const con = (nodos: string[], x: Partial<State> = {}): State => ({ ...i0, ...x, fuego: { ...i0.fuego, ...x.fuego, fundiciones: 1, nodos } })

describe('contra sim_capa2.py', () => {
  it('el softcap común: nivel efectivo y órdenes de más', () => {
    for (const c of REF.softcap) {
      expect(nivelLiberado(c.n, c.tope)).toBeCloseTo(c.efectivo, 12)
      expect(extraLiberado(c.n, c.tope)).toBe(c.extra)
    }
  })
  it('DESBORDE: costo de la Cascada pasado el nivel 10', () => {
    for (const c of REF.desborde) expect(costo(con(['cascada_plus'], { cascada: c.L }), 'cascada').log10()).toBeCloseTo(c.costo, 9)
  })
  it('METAMORFOSIS: costo de cada Mutación pasado el nivel 5', () => {
    for (const c of REF.metamorfosis) {
      const s = con(['mutacion_plus'], { mutaciones: { ...i0.mutaciones, [c.mut]: c.L } })
      expect(costo(s, `mut_${c.mut as MutId}`).log10()).toBeCloseTo(c.costo, 9)
    }
  })
  it('LECHO: umbrales de las compresiones 17+ y Densidad de cada una', () => {
    REF.lecho.umbrales.forEach((u, k) => expect(umbralLog10(con(['sedimentacion'], { compresiones: 16 + k }))).toBeCloseTo(u, 9))
    const d17 = densidad(con(['sedimentacion'], { compresiones: 17 }))
    REF.lecho.densidad_extra.forEach((d, j) => expect(densidad(con(['sedimentacion'], { compresiones: 18 + j })) - d17).toBeCloseTo(d, 12))
  })
  it('Densidad ígnea, ETERNA (Inercia eterna) y Magma', () => {
    for (const c of REF.nodos) {
      const s = con(['compactacion', 'inercia', 'presion'], {
        red: { ...i0.red, inercia: c.red, presion: c.red }, tiempoInfinito: 1e9, fuego: { ...i0.fuego, brasasTotales: c.Btot, vuelta: c.horas * 3600 },
      })
      expect(densidadFuego(s)).toBeCloseTo(c.dens, 12)
      expect(impulso(s)).toBeCloseTo(c.impulso_x, 12)
      expect(efectoRed(s, 'presion', 'w_x', 1) * magma(s)).toBeCloseTo(c.w_x, 12)
    }
  })
})

describe('las liberaciones en el juego', () => {
  const rica = (nodos: string[]): State => con(nodos, {
    compresiones: 17, cascada: CFG.cascada.nivel_max, mutaciones: { caudal: 5, colores: 5, expansion: 5, cascada: 5 },
    energia: Decimal.pow10(300), maxEnergia: Decimal.pow10(300), red: { ...i0.red, memoria: 3 },
  })
  it('sin el nodo de fuego, todo igual que antes: tope y efecto', () => {
    const s = rica([])
    expect(disponibles(s)).not.toContain('cascada')
    expect(autocomprar(s).cascada).toBe(CFG.cascada.nivel_max)
    expect(cascadaC({ ...s, cascada: 12 })).toBeCloseTo(CFG.cascada.c_por_nivel * 12 + CFG.mutaciones.cascada.por_nivel * 5, 12)
  })
  it('los autocompradores de Cascada y Mutaciones siguen pasado el tope viejo (y el "Máx" de la tienda)', () => {
    const s = rica(['cascada_plus', 'mutacion_plus'])
    const a = autocomprar(s)
    expect(a.cascada).toBeGreaterThan(CFG.cascada.nivel_max)
    for (const m of MUTACIONES) expect(a.mutaciones[m]).toBeGreaterThan(CFG.mutaciones.nivel_max)
    expect(comprarMax(s, 'cascada').cascada).toBeGreaterThan(CFG.cascada.nivel_max)
  })
  it('pasado el tope, cada nivel rinde la mitad', () => {
    const s = { ...rica(['cascada_plus']), cascada: 14, mutaciones: i0.mutaciones }
    expect(cascadaC(s)).toBeCloseTo(CFG.cascada.c_por_nivel * 12, 12)
  })
  it('la vuelta cuenta el tiempo y la Fundición la vuelve a 0', () => {
    const s = tick(con([], { fuego: { ...i0.fuego, vuelta: 100 } }), 1)
    expect(s.fuego.vuelta).toBe(101)
    expect(tick(i0, 1).fuego.vuelta).toBe(0) // sin fundir (el juego público) no corre
    expect(fundir({ ...s, cristalesTotales: Decimal.pow10(309) }).fuego.vuelta).toBe(0)
  })
})

describe('guardado de las liberaciones', () => {
  const partida = (estado: State, beta = true): Partida => ({ estado, guardadoEn: 1.7e12, vistos: {}, record: 0, logros: {}, ...(beta && { beta: MARCA }) })
  const s = con(['cascada_plus', 'mutacion_plus'], { cascada: 14, mutaciones: { ...i0.mutaciones, colores: 9 }, fuego: { ...i0.fuego, vuelta: 1234 } })
  it('Cascada y Mutaciones pasado el máximo se conservan en la beta', () => {
    const e = deserializar(serializar(partida(s))).estado
    expect(e.cascada).toBe(14)
    expect(e.mutaciones.colores).toBe(9)
    expect(e.fuego.vuelta).toBe(1234)
  })
  it('sin la marca de beta (o sin el nodo) vuelven al máximo', () => {
    const e = deserializar(serializar(partida(s, false))).estado
    expect(e.cascada).toBe(CFG.cascada.nivel_max)
    expect(e.mutaciones.colores).toBe(CFG.mutaciones.nivel_max)
    const sin = deserializar(serializar(partida({ ...s, fuego: { ...s.fuego, nodos: [] } }))).estado
    expect(sin.cascada).toBe(CFG.cascada.nivel_max)
  })
  it('una partida de la fase 5 (sin reloj de la vuelta) migra en cero', () => {
    const viejo = JSON.parse(serializar(partida(s)))
    delete viejo.estado.fuego.vuelta
    expect(deserializar(JSON.stringify(viejo)).estado.fuego.vuelta).toBe(0)
  })
})
