// CORRECCIONES 2: los límites del sonido.
import { describe, expect, it } from 'vitest'
import { crearAtenuador, crearLimite, crearRefresco } from '../src/ui/limite'

describe('límite de sonidos', () => {
  it('el mismo sonido no se repite antes de 80 ms; otro distinto sí suena', () => {
    const pasa = crearLimite(4, 80)
    expect(pasa('compra:ambar', 0, 400)).toBe(true)
    expect(pasa('compra:ambar', 79, 400)).toBe(false)
    expect(pasa('compra:coral', 79, 400)).toBe(true)
    expect(pasa('compra:ambar', 80, 400)).toBe(true)
  })
  it('como máximo 4 a la vez: el quinto se descarta y no queda en cola', () => {
    const pasa = crearLimite(4, 80)
    for (const n of ['a', 'b', 'c', 'd']) expect(pasa(n, 0, 400)).toBe(true)
    expect(pasa('e', 100, 400)).toBe(false)
    expect(pasa('f', 400, 400)).toBe(true) // los cuatro primeros ya terminaron; 'e' no suena después
  })
})

describe('derrumbes seguidos', () => {
  it('sueltos suenan enteros; una seguidilla baja de volumen en vez de sumarse', () => {
    const vol = crearAtenuador(3, 1000)
    expect(vol(0)).toBe(1)
    let ultimo = 1, suma = 0
    for (let t = 50; t <= 5000; t += 50) { ultimo = vol(t); if (t > 4000) suma += ultimo }
    expect(ultimo).toBeLessThan(0.2)
    expect(suma).toBeLessThan(4) // 20 por segundo suenan como ~3
    expect(vol(60_000)).toBe(1) // después de un rato de silencio, entero otra vez
  })
})

describe('refresco de la vista (v1.0, bloque 1: el Infinito trabado en 99 %)', () => {
  it('el último valor siempre llega aunque llegue antes de los 100 ms y después no cambie más', () => {
    let t = 0
    const cola: [() => void, number][] = []
    const vistos: number[] = []
    const r = crearRefresco<number>(100, (v) => vistos.push(v), () => t, (f, ms) => cola.push([f, t + ms]), (h) => { const i = cola.findIndex((c) => c === h); if (i >= 0) cola.splice(i, 1) })
    r(1, true) // 99 %
    t = 50
    r(2, true) // llega a 1e308 y la economía se congela: nunca vuelve a llamarse
    expect(vistos).toEqual([1])
    t = 100
    cola.splice(0).forEach(([f]) => f())
    expect(vistos).toEqual([1, 2])
  })
  it('sin limitar muestra todo', () => {
    const vistos: number[] = []
    const r = crearRefresco<number>(100, (v) => vistos.push(v), () => 0)
    r(1, false); r(2, false)
    expect(vistos).toEqual([1, 2])
  })
})
