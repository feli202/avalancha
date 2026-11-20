// v1.0, bloque 8: qué hitos se mandan (puro, sin red).
import Decimal from 'break_infinity.js'
import { describe, expect, it, vi } from 'vitest'
vi.mock('../src/ui/ajustes.svelte', () => ({ ajustes: { estadisticas: true } }))
const { eventosNuevos, franja } = await import('../src/ui/estadisticasAnonimas')
const { estadoInicial, INFINITO } = await import('../src/core')

describe('estadísticas anónimas', () => {
  const s0 = estadoInicial()
  it('primera compra, compresiones de a 5, primer Infinito, Romper, Defectos, 1.1 y fin de capa', () => {
    expect(eventosNuevos(s0, { ...s0, caudal: 1 })).toEqual(['primera-compra'])
    expect(eventosNuevos(s0, { ...s0, compresiones: 1 })).toEqual(['primera-compresion'])
    expect(eventosNuevos({ ...s0, compresiones: 4 }, { ...s0, compresiones: 5 })).toEqual(['compresion-5'])
    expect(eventosNuevos({ ...s0, compresiones: 5 }, { ...s0, compresiones: 6 })).toEqual([])
    expect(eventosNuevos(s0, { ...s0, infinitos: 1 })).toEqual(['primer-infinito'])
    expect(eventosNuevos({ ...s0, infinitos: 3 }, { ...s0, infinitos: 3, red: { ...s0.red, ruptura: 1 } })).toEqual(['romper-infinito'])
    expect(eventosNuevos({ ...s0, infinitos: 3 }, { ...s0, infinitos: 3, defectos: { ...s0.defectos, completos: ['vacancia'] } })).toEqual(['defecto-vacancia'])
    expect(eventosNuevos({ ...s0, infinitos: 3 }, { ...s0, infinitos: 3, escarcha: { ...s0.escarcha, abierta: true } })).toEqual(['fin-capa-1-1'])
    expect(eventosNuevos({ ...s0, infinitos: 3 }, { ...s0, infinitos: 3, cristalesTotales: INFINITO })).toEqual(['fin-capa-1'])
    expect(eventosNuevos(s0, { ...s0, energia: new Decimal(10) })).toEqual([])
  })
  it('el tiempo va redondeado', () => {
    expect(franja(14.6 * 60)).toBe('15min')
    expect(franja(3.4 * 3600)).toBe('3h')
  })
})
