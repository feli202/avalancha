// I8: comprarMax rápido da lo mismo que comprar de a uno mientras se pueda.
import Decimal from 'break_infinity.js'
import { describe, expect, it } from 'vitest'
import { CFG, MUTACIONES, comprar, comprarMax, estadoInicial, puedeComprar, type ItemId, type State } from '../src/core'

const lento = (s: State, id: ItemId) => { while (puedeComprar(s, id)) s = comprar(s, id); return s }

describe('comprarMax (I8)', () => {
  const base = { ...estadoInicial(), compresiones: 17, coloresDesbloqueados: 4, maxEnergia: Decimal.pow(10, 200) }
  const ids: ItemId[] = ['caudal', 'color0', 'color1', 'color2', 'color3', 'cascada', ...MUTACIONES.map((m): ItemId => `mut_${m}`)]
  for (const log of [0, 3, 50, 150, CFG.infinito_log10 - 0.001])
    for (const id of ids)
      it(`${id} con 1e${log.toFixed(0)}`, () => {
        const s = { ...base, energia: Decimal.pow(10, log) }
        expect(comprarMax(s, id)).toEqual(lento(s, id))
      })
  it('sin poder comprar devuelve el mismo estado', () => { const s = estadoInicial(); expect(comprarMax(s, 'caudal')).toBe(s) })
})
