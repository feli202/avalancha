// C11: el anillo 3 de la Red (SPEC_CAPA1 §6.3) y el Pulido de reliquias (§5). Cada efecto contra su fórmula, con los
// números de config_capa1.json (como Player.v / esc_params / esq_items de balance/sim_capa1.py).
import Decimal from 'break_infinity.js'
import { describe, expect, it } from 'vitest'
import {
  CFG1, abierto, aguanteEscarcha, costoPulido, costoPulidoLog10, crecimientoEscarcha, equipadas, espacios, esquirlasAlRomper,
  estadoInicial, ordenesQ, puedePulir, pulir, tick, type Pieza, type State,
} from '../src/core'

const A3 = CFG1.red['anillo3_1.2'] as Record<string, Record<string, number[]>>
const PU = CFG1.escarcha.pulido
const pz = (id: number, tipo: string, nivel: number): Pieza => ({ id, tipo, nivel, foto: '', inf: id })
const con = (red: Record<string, number>, extra: Partial<State> = {}): State => {
  const s = estadoInicial()
  return { ...s, ...extra, red: { ...s.red, ...red }, escarcha: { ...s.escarcha, abierta: true, ...extra.escarcha } }
}

describe('Anillo 3 de la Red', () => {
  it('se abre con la Escarcha: antes, ni con el vecino en nivel 4', () => {
    const s = con({ memoria: 4, eco: 4, ruptura: 4 })
    expect(abierto(s, 'eco2')).toBe(true)
    expect(abierto({ ...s, escarcha: { ...s.escarcha, abierta: false } }, 'eco2')).toBe(false)
  })

  it('Germen multiplica el crecimiento de la Escarcha y Eco II lo suma por orden de Cristales totales', () => {
    const base = con({}, { cristalesTotales: Decimal.pow10(100) })
    const g0 = crecimientoEscarcha(base)
    expect(crecimientoEscarcha(con({ germen: 4 }, { cristalesTotales: Decimal.pow10(100) })) / g0).toBeCloseTo(A3.germen.escarcha_g_x[3], 9)
    expect(crecimientoEscarcha(con({ eco2: 2 }, { cristalesTotales: Decimal.pow10(100) })) / g0).toBeCloseTo(1 + A3.eco2.escarcha_eco[1] * 100, 9)
  })

  it('Frío multiplica el aguante H', () => {
    expect(aguanteEscarcha(con({ frio: 3 })) / aguanteEscarcha(con({}))).toBeCloseTo(A3.frio.escarcha_H_x[2], 9)
  })

  it('Ruptura II resta órdenes a Q', () => {
    expect(ordenesQ(con({})) - ordenesQ(con({ ruptura2: 4 }))).toBe(A3.ruptura2.Q_resta[3])
  })

  it('Deshielo: la rompe sola cada 30 min desde tick y multiplica las Esquirlas', () => {
    const lista = (red: Record<string, number>) =>
      con(red, { escarcha: { ...estadoInicial().escarcha, abierta: true, logX: 100, reloj: CFG1.escarcha.ruptura_bot_min * 60 } })
    expect(esquirlasAlRomper(lista({ deshielo: 3 }))).toBe(5 * A3.deshielo.esquirlas_x[2])
    const r = tick(lista({ deshielo: 3 }), 0.001)
    expect(r.escarcha.esquirlas).toBe(5 * A3.deshielo.esquirlas_x[2])
    expect(r.escarcha.reloj).toBeLessThan(1)
    expect(tick(lista({}), 0.001).escarcha.esquirlas).toBe(0) // sin Deshielo no la rompe
    const apagado = lista({ deshielo: 1 })
    expect(tick({ ...apagado, auto: { ...apagado.auto, escarcha: false } }, 0.001).escarcha.esquirlas).toBe(0) // con el interruptor apagado tampoco
  })

  it('Engarces II da 3 espacios', () => {
    expect(espacios(con({ engarces2: 1 }))).toBe(3)
  })
})

describe('Pulido', () => {
  const rel = (piezas: Pieza[], equip: number[] = []) => ({ ...estadoInicial().relicario, piezas, equipadas: equip })
  const conEsq = (esquirlas: number, red: Record<string, number> = {}, piezas = [pz(1, 'cauce', 2)], fusionar = true) => {
    const s = con(red)
    return { ...s, escarcha: { ...s.escarcha, esquirlas }, relicario: { ...rel(piezas, [1]), regla: { ...s.relicario.regla, fusionar } } }
  }

  it('cuesta 10^round(c0 + paso × nivel × pulido_x) Esquirlas, más caro con el nivel y más barato con Engarces II', () => {
    const s = conEsq(0)
    expect(costoPulidoLog10(s, 0)).toBe(Math.floor(PU.c0 + 0.5))
    expect(costoPulidoLog10(s, 5)).toBe(Math.floor(PU.c0 + PU.paso * 5 + 0.5))
    expect(costoPulidoLog10(s, 6)).toBeGreaterThan(costoPulidoLog10(s, 2))
    const px = A3.engarces2.pulido_x[3]
    expect(costoPulidoLog10(conEsq(0, { engarces2: 4 }), 5)).toBe(Math.floor(PU.c0 + PU.paso * 5 * px + 0.5))
  })

  it('sube UNA reliquia un color sin fusionar y gasta las Esquirlas; sin alcanzar o sin Escarcha no hace nada', () => {
    const c = costoPulido(conEsq(0), 2)
    const s = conEsq(c + 3)
    const n = pulir(s, 1)
    expect(n.relicario.piezas).toEqual([pz(1, 'cauce', 3)])
    expect(n.escarcha.esquirlas).toBe(3)
    expect(equipadas(n).map((p) => p.id)).toEqual([1]) // sigue engarzada
    expect(pulir(conEsq(c - 1), 1)).toEqual(conEsq(c - 1))
    expect(puedePulir(conEsq(c - 1), 1)).toBe(false)
    const cerrada = { ...s, escarcha: { ...s.escarcha, abierta: false } }
    expect(pulir(cerrada, 1)).toBe(cerrada)
    expect(pulir(s, 99)).toBe(s)
  })

  it('si completa tres iguales, con Engarces II y "fusionar solas" se fusiona', () => {
    const tres = [pz(1, 'cauce', 2), pz(2, 'cauce', 3), pz(3, 'cauce', 3)]
    const c = costoPulido(conEsq(0, { engarces2: 1 }), 2)
    const n = pulir(conEsq(c, { engarces2: 1 }, tres), 1)
    expect(n.relicario.piezas.map((p) => [p.tipo, p.nivel])).toEqual([['cauce', 4]])
    const sinFusion = pulir(conEsq(c, { engarces2: 1 }, tres, false), 1)
    expect(sinFusion.relicario.piezas.map((p) => p.nivel)).toEqual([3, 3, 3])
  })
})
