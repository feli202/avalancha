// Capa 2, fase 4: el Motor de Brasas, el reparto del calor y sus efectos (sectores Pila y Red), contra temperatura_motor.md.
import Decimal from 'break_infinity.js'
import { describe, expect, it } from 'vitest'
import {
  CFG2, INFINITO, SECTORES, abiertos, calor, cristalesAlInfinito, elegirReparto, estadoInicial, etapaMotor, extraSector, moverBorde,
  partes, ponerParte, ponerReparto, redLog10Motor, temperatura, valor, type State,
} from '../src/core'
import { deserializar, serializar, type Partida } from '../src/guardado/guardado'

const MARCA = { codigo: 'ABCD2345', desde: 1.71e12 }
const conFuego = (s: State, f: Partial<State['fuego']>): State => ({ ...s, fuego: { ...s.fuego, ...f } })
/** Primera vuelta: una Fundición, 32 Brasas totales (~1.680 K), todo el calor en el reparto 0. */
const vuelta = (rep: number[], nodos: string[] = []) =>
  conFuego({ ...estadoInicial(), colores: [40, 30, 20, 10], coloresDesbloqueados: 4, infinitos: 3, energia: INFINITO }, { fundiciones: 1, brasasTotales: 32, nodos, repartos: [rep, [1, 0, 0, 0, 0], [0, 1, 0, 0, 0]], reparto: 0 })
const suma = (p: number[]) => p.reduce((a, b) => a + b, 0)
const PILA_RED = [true, true, false, false, false]

describe('reparto del calor', () => {
  it('las partes suman 1 entre los abiertos; los cerrados no cuentan; sin nada, todo a Pila', () => {
    expect(partes([1, 3, 5, 0, 0], PILA_RED)).toEqual([0.25, 0.75, 0, 0, 0])
    expect(partes([0, 0, 1, 1, 1], PILA_RED)).toEqual([1, 0, 0, 0, 0])
    expect(partes([-2, 1, 0, 0, 0], PILA_RED)).toEqual([0, 1, 0, 0, 0])
  })
  it('poner un porcentaje reparte el resto en proporción, o igual si los otros estaban en 0', () => {
    const ab = [true, true, true, true, false]
    const p = ponerParte([0.5, 0.3, 0.2, 0, 0], 0, 0.75, ab)
    expect(p[0]).toBe(0.75); expect(p[1]).toBeCloseTo(0.15, 12); expect(p[2]).toBeCloseTo(0.1, 12); expect(p[3]).toBe(0)
    const q = ponerParte([1, 0, 0, 0, 0], 0, 0.4, ab)
    expect(q.map((x) => +x.toFixed(9))).toEqual([0.4, 0.2, 0.2, 0.2, 0])
    expect(suma(ponerParte([1, 0, 0, 0, 0], 1, 7, ab))).toBeCloseTo(1, 12) // se recorta a 0–1
    expect(ponerParte([0.3, 0.7, 0, 0, 0], 0, 0.5, [true, false, false, false, false])).toEqual([1, 0, 0, 0, 0]) // solo uno abierto
  })
  it('arrastrar un borde pasa calor entre dos vecinos sin salirse de 0–1', () => {
    const p = moverBorde([0.6, 0.4, 0, 0, 0], 1, 0, 0.1, PILA_RED)
    expect(p[0]).toBeCloseTo(0.5, 12); expect(p[1]).toBeCloseTo(0.5, 12)
    expect(moverBorde([0.6, 0.4, 0, 0, 0], 1, 0, 5, PILA_RED)).toEqual([0, 1, 0, 0, 0])
    expect(moverBorde([0.6, 0.4, 0, 0, 0], 1, 0, -5, PILA_RED)).toEqual([1, 0, 0, 0, 0])
  })
  it('3 repartos guardados: editar cambia solo el activo, cambiar es un toque', () => {
    let s = vuelta([1, 0, 0, 0, 0])
    s = ponerReparto(elegirReparto(s, 2), [0.2, 0.8, 0, 0, 0])
    expect(s.fuego.reparto).toBe(2)
    expect(s.fuego.repartos).toEqual([[1, 0, 0, 0, 0], [1, 0, 0, 0, 0], [0.2, 0.8, 0, 0, 0]])
    expect(elegirReparto(s, 3).fuego.reparto).toBe(2) // no existe
  })
})

describe('sectores y etapas', () => {
  it('sin Fundición el Motor está cerrado; después abren Pila y Red, y cada fuego abre su sector', () => {
    expect(etapaMotor(estadoInicial())).toBe(0)
    expect(abiertos(estadoInicial())).toEqual([false, false, false, false, false])
    expect(etapaMotor(vuelta([1, 0, 0, 0, 0]))).toBe(1)
    expect(abiertos(vuelta([1, 0, 0, 0, 0]))).toEqual(PILA_RED)
    expect(etapaMotor(vuelta([1, 0, 0, 0, 0], ['estratos', 'frio']))).toBe(3)
    expect(etapaMotor(vuelta([1, 0, 0, 0, 0], ['estratos', 'frio', 'engarces']))).toBe(4)
  })
  it('calor h = parte × (T − 300) / 1000', () => {
    const s = vuelta([0.25, 0.75, 0, 0, 0])
    const kK = (temperatura(s) - 300) / 1000
    expect(calor(s, 'pila')).toBeCloseTo(0.25 * kK, 12)
    expect(calor(s, 'red')).toBeCloseTo(0.75 * kK, 12)
    expect(calor(s, 'estratos')).toBe(0)
    expect(SECTORES.reduce((a, k) => a + calor(s, k), 0)).toBeCloseTo(kK, 12)
  })
})

describe('efectos desde config_capa2.json', () => {
  it('Pila: colores y cauce en log10 V × (1 + 1,2 h)', () => {
    const fria = vuelta([0, 1, 0, 0, 0]), pila = vuelta([1, 0, 0, 0, 0])
    const x = 1 + CFG2.motor.efecto.pila * calor(pila, 'pila')
    expect(extraSector(pila, 'pila')).toBeCloseTo(x, 12)
    expect(valor(pila).log10()).toBeCloseTo(valor(fria).log10() * x, 6) // sin anillos, cascada ni Eco: V son solo los colores
  })
  it('Red: Cristales por Infinito × 10^h', () => {
    const grande = (s: State): State => ({ ...s, red: { ...s.red, ruptura: 4, cristalografia: 4, cristalografia2: 4 }, defectos: { completos: ['vacancia', 'dislocacion', 'macla', 'impureza'], actual: '', reintento: {} } }) // pasado 1e6: sin redondeo a enteros
    const fria = grande(vuelta([1, 0, 0, 0, 0])), red = grande(vuelta([0, 1, 0, 0, 0]))
    expect(cristalesAlInfinito(fria).log10()).toBeGreaterThan(6)
    expect(redLog10Motor(red)).toBeCloseTo(CFG2.motor.efecto.red * calor(red, 'red'), 12)
    expect(cristalesAlInfinito(red).log10() - cristalesAlInfinito(fria).log10()).toBeCloseTo(redLog10Motor(red), 6)
  })
  it('sin fuego (el juego público) nada cambia', () => {
    const s = { ...estadoInicial(), colores: [40, 30, 20, 10], infinitos: 3, energia: Decimal.pow10(400) }
    expect(extraSector(s, 'pila')).toBe(1)
    expect(redLog10Motor(s)).toBe(0)
  })
})

describe('guardado del reparto', () => {
  const partida = (estado: State, beta = true): Partida => ({ estado, guardadoEn: 1.7e12, vistos: {}, record: 0, logros: {}, ...(beta && { beta: MARCA }) })
  it('ida y vuelta en la beta', () => {
    const s = elegirReparto(vuelta([0.3, 0.7, 0, 0, 0]), 1)
    expect(deserializar(serializar(partida(s))).estado.fuego).toEqual(s.fuego)
  })
  it('una partida de la fase 3 (sin repartos) migra con los de config', () => {
    const viejo = JSON.parse(serializar(partida(vuelta([1, 0, 0, 0, 0]))))
    delete viejo.estado.fuego.repartos; delete viejo.estado.fuego.reparto
    const f = deserializar(JSON.stringify(viejo)).estado.fuego
    expect(f.repartos).toEqual(CFG2.motor.repartos_iniciales)
    expect(f.reparto).toBe(0)
    expect(f.brasasTotales).toBe(32)
  })
  it('valores rotos se sanean (negativos a 0, más de 1 a 1, reparto fuera de rango)', () => {
    const viejo = JSON.parse(serializar(partida(vuelta([1, 0, 0, 0, 0]))))
    viejo.estado.fuego.repartos[0] = [-1, 9, 0.5, 0, 0]; viejo.estado.fuego.reparto = 7
    const f = deserializar(JSON.stringify(viejo)).estado.fuego
    expect(f.repartos[0]).toEqual([0, 1, 0.5, 0, 0])
    expect(f.reparto).toBe(2)
  })
  it('sin la marca de beta, los repartos de una partida nueva', () => {
    const f = deserializar(serializar(partida(ponerReparto(vuelta([0, 1, 0, 0, 0]), [0, 1, 0, 0, 0]), false))).estado.fuego
    expect(f).toEqual(estadoInicial().fuego)
  })
})
