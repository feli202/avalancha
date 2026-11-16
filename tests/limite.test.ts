// CORRECCIONES 2: los límites del sonido.
import { describe, expect, it } from 'vitest'
import { crearAtenuador, crearLimite } from '../src/ui/limite'

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
