import Decimal from 'break_infinity.js'
import { describe, expect, it } from 'vitest'
import {
  CFG, CFG1, INFINITO, NODOS, abierto, anillo, autoActivo, autoDisponible, comprarRed, costoRed, costoRedLog10, cristalesAlInfinito,
  densidad, disponibles, estadoInicial, infinito, maxCascada, tick, valor, type State,
} from '../src/core'
import { deserializar, serializar } from '../src/guardado/guardado'

const conRed = (red: Record<string, number>, extra: Partial<State> = {}): State => {
  const s = estadoInicial()
  return { ...s, ...extra, red: { ...s.red, ...red } }
}
const rico = (red: Record<string, number> = {}) => conRed(red, { cristales: new Decimal('1e300') })

describe('Red', () => {
  it('lee los 25 nodos de config: 13 en los anillos 0–2 y 12 en el anillo 3, en forma de rombo', () => {
    expect(Object.keys(NODOS)).toHaveLength(25)
    expect(Object.keys(CFG1.red.nodos).every((k) => anillo(k) <= 2)).toBe(true)
    expect(Object.keys(CFG1.red['anillo3_1.2']).every((k) => anillo(k) === 3)).toBe(true)
  })

  it('costos de §6.2 por anillo', () => {
    expect([0, 1, 2, 3].map((n) => costoRedLog10('memoria', n))).toEqual([0, 0, 0, 0])
    // Todo precio es 1eN: 0,15·L se redondea a 0 (1 Cristal); 1,6 + 0,3·L a 2, 2, 2, 3.
    expect([0, 1, 2, 3].map((n) => costoRedLog10('eco', n))).toEqual([0, 0, 0, 0])
    expect([0, 1, 2, 3].map((n) => costoRedLog10('ruptura', n))).toEqual([2, 2, 2, 3])
    expect([0, 3].map((n) => costoRedLog10('eco2', n))).toEqual([45, 60])
    expect([0, 3].map((n) => costoRedLog10('ruptura2', n))).toEqual([250, 265])
    expect([0, 1, 2, 3].map((n) => costoRed('eco', n).toNumber())).toEqual([1, 1, 1, 1])
    expect(costoRed('ruptura', 0).toNumber()).toBe(100)
  })

  it('apertura: un nodo se abre cuando un vecino ortogonal más cercano al centro llega a nivel 4', () => {
    expect(abierto(estadoInicial(), 'memoria')).toBe(true)
    expect(abierto(conRed({ memoria: 3 }), 'eco')).toBe(false)
    const m4 = conRed({ memoria: 4 })
    expect(['eco', 'sedimentacion', 'defectos'].every((k) => abierto(m4, k))).toBe(true)
    // Estratos: además pide Romper el Infinito (Ruptura nv1); un guardado que ya lo tenía lo sigue subiendo.
    expect(abierto(m4, 'estratos')).toBe(false)
    expect(abierto(conRed({ memoria: 4, ruptura: 1 }), 'estratos')).toBe(true)
    expect(abierto(conRed({ memoria: 4, estratos: 1 }), 'estratos')).toBe(true)
    expect(abierto(m4, 'ruptura')).toBe(false) // anillo 2: hace falta Eco en 4
    expect(abierto(m4, 'cascada_plus')).toBe(false) // diagonal de Memoria
    const eco4 = conRed({ memoria: 4, eco: 4 })
    expect(['ruptura', 'cristalografia', 'cascada_plus'].every((k) => abierto(eco4, k))).toBe(true)
    // Un vecino más lejos del centro no abre: Ruptura en 4 no abre Eco.
    expect(abierto(conRed({ ruptura: 4 }), 'eco')).toBe(false)
    // El anillo 3 queda con el candado de hielo hasta la Escarcha.
    expect(abierto(conRed({ memoria: 4, eco: 4, ruptura: 4 }), 'germen')).toBe(false)
  })

  it('comprar cobra Cristales, sube el nivel y no pasa de 4 ni compra cerrados o sin plata', () => {
    let s = conRed({}, { cristales: new Decimal(5) })
    expect(comprarRed(s, 'eco')).toBe(s)
    for (let i = 0; i < 4; i++) s = comprarRed(s, 'memoria')
    expect(s.red.memoria).toBe(4)
    expect(s.cristales.toNumber()).toBe(1)
    expect(comprarRed(s, 'memoria')).toBe(s)
    s = comprarRed(s, 'eco')
    expect([s.red.eco, s.cristales.toNumber()]).toEqual([1, 0])
    expect(comprarRed(s, 'eco')).toBe(s) // cuesta 2
  })

  it('Memoria nv1: autocompradores y compresión automática desde el inicio', () => {
    expect(autoActivo(estadoInicial(), 'violeta')).toBe(false)
    const s = conRed({ memoria: 1 })
    expect(Object.keys(CFG.autocompradores).every((k) => autoActivo(s, k))).toBe(true)
    // Primer tick: el autocomprador de Caudal compra con la Energía que haya.
    const t = tick({ ...s, energia: new Decimal('1e6'), relojAuto: 0.99 }, 0.05)
    expect(t.caudal).toBeGreaterThan(0)
  })

  // CORRECCIONES 3: la tienda muestra el interruptor "auto" de cada fila con autoDisponible, la misma regla que la economía.
  it('Memoria nv1: al empezar una corrida todas las filas con autocomprador muestran "auto"', () => {
    const claves = Object.keys(CFG.autocompradores)
    expect(claves.some((k) => autoDisponible(estadoInicial(), k))).toBe(false) // sin Memoria ni compresiones, ninguna
    const corrida = { ...infinito({ ...conRed({ memoria: 1 }), energia: INFINITO }), compresiones: 0 } // ni una Compresión conservada
    expect(claves.every((k) => autoDisponible(corrida, k) && autoActivo(corrida, k))).toBe(true)
    // Apagado sigue a la vista (para volver a prenderlo), pero no compra.
    const apagado = { ...corrida, auto: { ...corrida.auto, caudal: false } }
    expect([autoDisponible(apagado, 'caudal'), autoActivo(apagado, 'caudal')]).toEqual([true, false])
  })

  it('Memoria nv2 y nv3: Cascada y Mutaciones automáticas (con margen de Energía)', () => {
    // Sin los autocompradores de Caudal y colores, que se gastarían la Energía antes.
    const auto = { ...estadoInicial().auto, ...Object.fromEntries(Object.keys(CFG.autocompradores).map((k) => [k, false])) }
    const base = { energia: new Decimal('1e200'), maxEnergia: new Decimal('1e200'), compresiones: 6, relojAuto: 0.99, auto }
    const t1 = tick(conRed({ memoria: 1 }, base), 0.05)
    expect([t1.cascada, t1.mutaciones.caudal]).toEqual([0, 0])
    const t2 = tick(conRed({ memoria: 2 }, base), 0.05)
    expect(t2.cascada).toBe(CFG.cascada.nivel_max)
    expect(t2.mutaciones.caudal).toBe(0)
    const t3 = tick(conRed({ memoria: 3 }, base), 0.05)
    expect(Object.values(t3.mutaciones).some((n) => n > 0)).toBe(true)
  })

  it('Memoria nv4: Infinito automático; y conserva 3/5/7/9 compresiones', () => {
    const lleno = { energia: INFINITO, maxEnergia: INFINITO, compresiones: 17, infinitos: 1 }
    expect(tick(conRed({ memoria: 3 }, lleno), 0.05).infinitos).toBe(1)
    const t = tick(conRed({ memoria: 4 }, lleno), 0.05)
    expect(t.infinitos).toBe(2)
    expect(t.energia.toNumber()).toBe(0)
    expect(t.red.memoria).toBe(4) // la Red se conserva
    expect([0, 1, 2, 3, 4].map((n) => infinito(conRed({ memoria: n }, lleno)).compresiones)).toEqual([0, 3, 5, 7, 9])
    // Sedimentación manda si conserva más.
    expect(infinito(conRed({ memoria: 4, sedimentacion: 2 }, lleno)).compresiones).toBe(13)
  })

  it('efectos de la Arena: Compactación, Cascada+, Eco y Cristalografía', () => {
    expect(densidad(conRed({ compactacion: 2 })) - densidad(estadoInicial())).toBeCloseTo(0.16)
    const c = conRed({ cascada_plus: 1 }, { compresiones: 2, cascada: CFG.cascada.nivel_max })
    expect(maxCascada(c)).toBe(CFG.cascada.nivel_max + 5)
    expect(disponibles(c)).toContain('cascada')
    const eco = conRed({ eco: 1 }, { granos: 100, cristalesTotales: new Decimal(100) })
    expect(valor(eco).div(valor({ ...eco, red: estadoInicial().red })).log10()).toBeCloseTo(0.5 * 2)
    expect(cristalesAlInfinito(conRed({ cristalografia: 2 }, { infinitos: 1 })).toNumber()).toBe(Math.floor(10 ** (1 + CFG1.cristales.base_log10)))
  })

  it('nodos de la corrección 6: Compactación II, Sedimentación nv4, Eco II y Cristalografía II', () => {
    // Compactación II: Densidad por cada anillo de la corrida (64 granos = 1 anillo, cada ×2 uno más).
    const g = { granos: CFG.anillos.granos_primer_anillo * 2 ** 99 } // 100 anillos
    expect(densidad(conRed({ compactacion2: 4 }, g)) - densidad(conRed({}, g))).toBeCloseTo(0.04, 9)
    // Sedimentación nv4: la Cascada no vuelve a cero con la Compresión ni con el Infinito.
    const u = CFG.compresion.umbrales_log10
    const comp = (red: Record<string, number>) =>
      tick(conRed(red, { compresiones: 3, cascada: 7, energia: Decimal.pow10(u[3]), auto: { ...estadoInicial().auto, compresion_auto: true } }), 0.001)
    expect([comp({ memoria: 1 }).compresiones, comp({ memoria: 1 }).cascada]).toEqual([4, 0])
    expect([comp({ memoria: 1, sedimentacion: 4 }).compresiones, comp({ memoria: 1, sedimentacion: 4 }).cascada]).toEqual([4, 7])
    const inf = (red: Record<string, number>) => infinito(conRed(red, { cascada: 7, energia: INFINITO, infinitos: 1 })).cascada
    expect([inf({ sedimentacion: 3 }), inf({ sedimentacion: 4 })]).toEqual([0, 7])
    // Eco II ya no suma al exponente del Eco (ahora es de la Escarcha, C10).
    const eco = conRed({ eco: 1, eco2: 4 }, { granos: 100, cristalesTotales: new Decimal(100) })
    expect(valor(eco).div(valor({ ...eco, red: estadoInicial().red })).log10()).toBeCloseTo(0.5 * 2, 9)
    // Cristalografía II crece con los Defectos completos; sin Defectos (llegan en C7) no suma.
    expect(cristalesAlInfinito(conRed({ cristalografia2: 4 }, { infinitos: 1 })).toNumber()).toBe(Math.floor(10 ** CFG1.cristales.base_log10))
  })

  it('el guardado conserva la Red y no recorta una Cascada subida por Cascada+', () => {
    let s = rico()
    for (const k of ['memoria', 'memoria', 'memoria', 'memoria', 'eco', 'eco', 'eco', 'eco', 'cascada_plus']) s = comprarRed(s, k)
    s = { ...s, cascada: CFG.cascada.nivel_max + 3, infinitos: 1 }
    const p = deserializar(serializar({ estado: s, guardadoEn: 0, vistos: {}, record: 0, logros: {} }))
    expect(p.estado.red).toEqual(s.red)
    expect(p.estado.cascada).toBe(CFG.cascada.nivel_max + 3)
  })
})

describe('Memoria y Sedimentación en medio de una corrida (C8)', () => {
  it('la corrida salta a las compresiones que conserva el nodo, sin perder lo que tenía', async () => {
    const { comprarRed, estadoInicial } = await import('../src/core')
    const b = estadoInicial()
    const s = { ...b, infinitos: 1, cristales: b.cristales.add(1e6), energia: b.energia.add(1e5), caudal: 7, compresiones: 1 }
    const m = comprarRed(s, 'memoria')
    expect(m.compresiones).toBe(3)
    expect(m.caudal).toBe(7)
    expect(m.energia.eq(s.energia)).toBe(true)
    const mas = { ...m, red: { ...m.red, memoria: 4 }, compresiones: 12 } // ya más arriba: no baja
    expect(comprarRed(mas, 'sedimentacion').compresiones).toBe(12)
    expect(comprarRed({ ...mas, compresiones: 2 }, 'sedimentacion').compresiones).toBe(11)
  })
})
