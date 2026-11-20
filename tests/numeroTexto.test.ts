// v1.0, bloque 10: los campos de número del Infinito automático aceptan notación científica.
import { describe, expect, it } from 'vitest'
import { leerLog10 } from '../src/ui/numeroTexto'

describe('leerLog10', () => {
  it.each([['1e12', 12], ['1E12', 12], ['1,5e30', Math.log10(1.5) + 30], ['1.5e30', Math.log10(1.5) + 30], ['1000000', 6],
    ['1.000.000', 6], [' 2e400 ', Math.log10(2) + 400], ['10', 1], ['0,5', Math.log10(0.5)]])('%s', (t, l) => expect(leerLog10(t)).toBeCloseTo(l, 9))
  it.each(['', 'hola', '1e', 'e5', '-3', '0', '1,2,3'])('rechaza %j', (t) => expect(leerLog10(t)).toBeNull())
})
