// Bloque 7: el número que muestra cada mejora y cada estrato sale del núcleo, no de una cuenta aparte.
import { describe, expect, it } from 'vitest'
import { caudal, densidad, estadoInicial, gammaEstrato, presion, produccion, type State } from '../src/core'
import { valorMejora, velocidadEstrato } from '../src/ui/desglose'

// Una partida avanzada: Red, reliquias equipadas, Mutaciones, Cascada, Compresiones (Densidad) y estratos abiertos.
const base = estadoInicial()
const s: State = {
  ...base,
  energia: base.energia.mul(1e50), granos: 40000, caudal: 37, colores: [41, 22, 13, 5], cascada: 12, compresiones: 9,
  mutaciones: { caudal: 3, colores: 2, expansion: 1, cascada: 2 },
  red: { ...base.red, memoria: 4, compactacion: 3, estratos: 3, inercia: 2, presion: 2, eco: 1, cascada_plus: 1, engarces: 3 },
  relicario: { ...base.relicario, reliquias: { cauce: 9, cascada: 3, mutaciones: 27 }, equipadas: ['cauce', 'mutaciones', 'cascada'] },
  estratos: { abiertos: 3, s: [30, 28, 25, 0, 0, 0, 0, 0], perm: [2, 1, 0, 0, 0, 0, 0, 0], pres: [1, 0, 3, 0, 0, 0, 0, 0] },
  tiempoInfinito: 240,
}
const cerca = (a: number, b: number) => expect(Math.abs(a - b)).toBeLessThan(1e-6 * Math.max(1, Math.abs(b)))
const prodLog = (t: State) => produccion(t).log10()

describe('Valores finales (bloque 7)', () => {
  it('Caudal muestra los granos/s del núcleo', () => cerca(10 ** valorMejora(s, 'caudal')!.log, caudal(s)))

  it.each([
    ['color0', { colores: [0, 22, 13, 5] }], ['color3', { colores: [41, 22, 13, 0] }], ['cascada', { cascada: 0 }],
    ['mut_caudal', { mutaciones: { ...s.mutaciones, caudal: 0 } }], ['mut_colores', { mutaciones: { ...s.mutaciones, colores: 0 } }],
  ] as [string, Partial<State>][])('%s: lo que muestra = cuánto cae la Energía/s del núcleo sin la mejora', (id, sin) => {
    const v = valorMejora(s, id)!
    cerca(v.log, prodLog(s) - prodLog({ ...s, ...sin }))
    cerca(v.partes.reduce((a, p) => a + p.log, 0), v.log)
    expect(v.partes.every((p) => p.log >= 0)).toBe(true)
  })

  it('las reliquias y la Densidad aparecen en el desglose', () => {
    const p = (id: string, parte: string) => valorMejora(s, id)!.partes.find((x) => x.id === parte)!.log
    expect(p('caudal', 'reliquia')).toBeGreaterThan(0)
    expect(p('color0', 'cauce')).toBeGreaterThan(0)
    expect(p('color0', 'densidad')).toBeGreaterThan(0)
    expect(p('cascada', 'reliquia')).toBeGreaterThan(0)
  })

  it('velocidad de cada estrato = γ del núcleo', () => {
    for (let k = 0; k < 3; k++) cerca(velocidadEstrato(s, k).gamma / gammaEstrato(s, k, Math.log10(caudal(s))), 1)
  })

  it('cada derrumbe vale ×10^(Presión × Densidad): la Energía/s sin estratos cae eso', () => {
    cerca(presion(s) * densidad(s), prodLog(s) - prodLog({ ...s, estratos: { ...s.estratos, abiertos: 0 } }))
  })
})
