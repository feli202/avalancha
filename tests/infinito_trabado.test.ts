// v1.0, bloque 1: el Infinito "trabado en 99 %". La partida real de un jugador y Energías alrededor del tope.
import Decimal from 'break_infinity.js'
import TRABADA from './fixtures/partida_trabada.txt?raw'
import { describe, expect, it } from 'vitest'
import {
  CFG, INFINITO, campoInvalido, comprar, congelada, cristalesAlInfinito, enInfinito, estadoInicial, infinito, maxCascada, nivel,
  produccion, tick, type State,
} from '../src/core'
import { importar, serializar, deserializar } from '../src/guardado/guardado'


describe('la partida trabada del reporte', () => {
  const p = importar(TRABADA)
  it('su Energía es exactamente el tope: el Infinito está disponible (la traba era de la vista, ver limite.test.ts)', () => {
    expect(p.estado.energia.eq(INFINITO)).toBe(true)
    expect(enInfinito(p.estado)).toBe(true)
    expect(congelada(p.estado)).toBe(true)
    const s = infinito(p.estado)
    expect(s.infinitos).toBe(p.estado.infinitos + 1)
    expect(s.cristales.gt(p.estado.cristales)).toBe(true)
    expect(campoInvalido(s)).toBe('')
  })
  it('Cascada nivel 10 sin Cascada+: está al máximo y comprar no rompe nada', () => {
    expect(p.estado.cascada).toBe(maxCascada(p.estado))
    expect(comprar(p.estado, 'cascada')).toBe(p.estado)
  })
  it('guardar y cargar no la mueve del tope', () => {
    expect(enInfinito(deserializar(serializar(p)).estado)).toBe(true)
  })
})

describe('Energías alrededor de 1e308', () => {
  const real = importar(TRABADA).estado // la Arena del reporte: produce ~5e312 por segundo
  const FUERTE = { infinitos: real.infinitos, cascada: 5 }
  const casos: [string, Decimal][] = [
    ['1e307', Decimal.pow10(307)], ['1e308', Decimal.pow10(308)], ['tope exacto', INFINITO],
    ['1e309', Decimal.pow10(309)], ['1e400', Decimal.pow10(400)],
  ]
  const autos = Object.fromEntries(Object.keys(estadoInicial().auto).map((k) => [k, true])) as State['auto']
  for (const [nombre, E] of casos)
    for (const romper of [false, true])
      for (const conAuto of [false, true])
        it(`${nombre}, ${romper ? 'roto' : 'sin romper'}, ${conAuto ? 'con' : 'sin'} autocompradores`, () => {
          const base = real
          let s: State = { ...base, ...FUERTE, energia: E, maxEnergia: E,
            red: { ...base.red, memoria: 4, ruptura: romper ? 1 : 0 }, auto: conAuto ? autos : Object.fromEntries(Object.keys(autos).map((k) => [k, false])) as State['auto'] }
          for (let i = 0; i < 30; i++) s = tick(s, 0.5)
          expect(campoInvalido(s)).toBe('')
          // Sin romper, la Energía nunca pasa del tope y, al llegar, el Infinito está disponible.
          if (!romper && E.lte(INFINITO)) expect(s.energia.lte(INFINITO)).toBe(true)
          if (s.infinitos === FUERTE.infinitos) {
            expect(enInfinito(s)).toBe(true) // con producción ×1e312 llega al tope en 15 s
            const c = cristalesAlInfinito(s)
            expect(c.gt(0) && Number.isFinite(c.log10())).toBe(true)
            s = infinito(s)
          }
          expect(s.infinitos).toBe(FUERTE.infinitos + 1)
          expect(campoInvalido(s)).toBe('')
          // Después del Infinito: Cascada se puede comprar (o queda igual si no alcanza), sin NaN.
          const t = comprar({ ...s, energia: Decimal.pow10(300), compresiones: 17 }, 'cascada')
          expect(nivel(t, 'cascada')).toBeGreaterThanOrEqual(nivel(s, 'cascada'))
          expect(campoInvalido(t)).toBe('')
          expect(produccion(t).gte(0)).toBe(true)
        })
})

describe('campoInvalido', () => {
  it('encuentra NaN e Infinity en números y Decimal', () => {
    expect(campoInvalido(estadoInicial())).toBe('')
    expect(campoInvalido({ ...estadoInicial(), granos: NaN })).toBe('estado.granos')
    expect(campoInvalido({ ...estadoInicial(), energia: new Decimal(NaN) })).toBe('estado.energia')
    expect(campoInvalido({ ...estadoInicial(), tiempoTotal: Infinity })).toBe('estado.tiempoTotal')
    expect(CFG.infinito_log10).toBeGreaterThan(308)
  })
})
