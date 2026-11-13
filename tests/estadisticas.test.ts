// Estadísticas: el desglose suma la producción real, y el historial anota corridas y avalanchas.
import { describe, expect, it } from 'vitest'
import { comprarTodo, comprimir, disponibles, estadoInicial, produccion, tick, type State } from '../src/core'
import { contarAvalancha, historialVacio, limpiarHistorial, muestraAvalancha, registrar } from '../src/guardado/historial'
import { deserializar, serializar } from '../src/guardado/guardado'
import { desglose } from '../src/ui/desglose'

/** Juega `seg` segundos comprando todo cada 15 s, anotando en el historial cada paso. */
function jugar(s: State, seg: number, h = historialVacio(0)) {
  for (let i = 1; i <= seg; i++) {
    const antes = s
    s = tick(s, 1)
    if (i % 15 === 0) s = comprarTodo(s, disponibles(s))
    registrar(h, antes, s)
  }
  return s
}

const suma = (s: State) => desglose(s).reduce((a, f) => a + f.log, 0)

describe('desglose de producción', () => {
  it('la suma de los factores en log10 es log10(Energía/s), y la de las partes, la del factor', () => {
    let s = estadoInicial()
    for (const seg of [60, 600, 1800]) {
      s = jugar(s, seg)
      expect(suma(s)).toBeCloseTo(produccion(s).log10(), 6)
      for (const f of desglose(s)) if (f.partes) expect(f.partes.reduce((a, p) => a + p.log, 0)).toBeCloseTo(f.log, 6)
    }
    // Con Densidad, Cascada y todas las Mutaciones.
    const c = {
      ...comprimir({ ...s, energia: s.energia.mul(1e30) }),
      mutaciones: { caudal: 2, colores: 1, expansion: 3, cascada: 1 }, cascada: 4,
    }
    const d = jugar(c, 120)
    expect(suma(d)).toBeCloseTo(produccion(d).log10(), 6)
  })
})

describe('historial', () => {
  it('anota la Compresión con su duración y la Energía', () => {
    const h = historialVacio(0)
    const s = jugar(estadoInicial(), 300, h)
    const antes = { ...s, energia: s.energia.mul(1e40) }
    const despues = comprimir(antes)
    expect(despues.compresiones).toBe(1)
    registrar(h, antes, despues)
    expect(h.corridas).toHaveLength(1)
    expect(h.corridas[0].duracion).toBeCloseTo(300, 6)
    expect(h.corridas[0].energia).toBeCloseTo(antes.energia.log10(), 6)
    expect(h.serie.length).toBeGreaterThan(10)
    expect(h.derrumbes).toBeGreaterThan(0)
  })

  it('cuenta avalanchas en casillas log y limpia un guardado roto', () => {
    const h = historialVacio(0)
    for (const n of [0, 1, 2, 9, 10, 11, 1000]) muestraAvalancha(h, n), contarAvalancha(h, n)
    expect(h.avalanchas).toEqual([1, 1, 0, 1, 2, 0, 0, 0, 0, 0, 0, 0, 1]) // 4 casillas por década
    expect(h.mayorCorrida).toBe(1000)
    expect(h.derrumbesPila).toBe(1033)
    const l = limpiarHistorial({ corridas: [{ duracion: 1, energia: 'x', densidad: 1 }], avalanchas: [1, -2], serie: [[1, 2], [3]], inicio: 5 }, 9)
    expect(l.corridas).toEqual([])
    expect(l.avalanchas).toEqual([])
    expect(l.serie).toEqual([[1, 2]])
    expect(l.inicio).toBe(5)
    expect(limpiarHistorial(null, 9).inicio).toBe(9)
  })
  it('viaja en el guardado', () => {
    const h = historialVacio(123)
    const s = jugar(estadoInicial(), 120, h)
    contarAvalancha(h, 500)
    const p = deserializar(serializar({ estado: s, guardadoEn: 1e12, vistos: {}, record: 500, logros: {}, historial: h }))
    expect(p.historial).toEqual(h)
  })
})

describe('Compresión fuera de línea (M3)', async () => {
  const { CFG } = await import('../src/core')
  const Decimal = (await import('break_infinity.js')).default
  it('la corrida se anota con la Energía del umbral, no la del comienzo de la ausencia', () => {
    const antes = { ...estadoInicial(), compresiones: 3 } // Energía 0 al irse
    const u = CFG.compresion.umbrales_log10[3]
    const despues = comprimir({ ...antes, energia: Decimal.pow(10, u + 0.5) }) // lo que hizo fueraDeLinea
    const h = historialVacio(0)
    registrar(h, antes, despues)
    expect(h.corridas.at(-1)!.energia).toBe(u)
  })
})
