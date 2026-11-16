// Cada fórmula de SPEC.md sección 4 contra valores calculados a mano.
import Decimal from 'break_infinity.js'
import { describe, expect, it } from 'vitest'
import {
  CFG, CFG1, INFINITO, infinito, anillos, aplicar, autocomprar, cascadaC, caudal, comprar, comprarMax, comprimir, costoCascada,
  costoCaudal, costoColor, costoMutacion, densidad, disponibles, estadoInicial, multAnillos, multCascada,
  multColor, produccion, puedeComprimir, punado, tick, valor, type State,
} from '../src/core'

const con = (p: Partial<State>): State => ({ ...estadoInicial(), ...p })
const cerca = (d: Decimal | number, esperado: number) =>
  expect(new Decimal(d).div(esperado).toNumber()).toBeCloseTo(1, 3)

describe('costos', () => {
  it('Caudal: 10, 100, 1000, 1000, 1e5, 1e6 (SPEC 4.2: exponente redondeado al entero más cercano)', () => {
    const esperados = [10, 100, 1000, 1000, 1e5, 1e6]
    esperados.forEach((e, n) => cerca(costoCaudal(n), e))
  })
  it('colores: 10^(c0 + g·n + s·n²/2)', () => {
    cerca(costoColor(0, 0), 10)
    cerca(costoColor(0, 1), 10) // 1 + 0,35 + 0,04/2 = 1,37 → 1e1
    cerca(costoColor(0, 2), 100) // 1,78 → 1e2
    cerca(costoColor(1, 0), 1e4)
    cerca(costoColor(2, 2), 1e11) // 9 + 1,4 + 0,15·4/2 = 10,7 → 1e11
    cerca(costoColor(3, 4), 1e22) // 16 + 4 + 0,25·16/2
  })
  it('softcap más allá del Infinito (SPEC 4.11): por encima de 1e308 cada nivel ×10 el siguiente', async () => {
    const { costoMutacion, masAlla } = await import('../src/core')
    // Mutación Colores: 130 + 22n. n = 8 → 1e306 (normal); n = 9 → 328 > 308 es n_1e308 (sin extra); después +1, +2…
    expect([8, 9, 10, 11].map((n) => costoMutacion('colores', n).log10())).toEqual([306, 328, 351, 374])
    expect(masAlla(con({ mutaciones: { caudal: 0, colores: 8, expansion: 0, cascada: 0 } }), 'mut_colores')).toBe(false)
    expect(masAlla(con({ mutaciones: { caudal: 0, colores: 9, expansion: 0, cascada: 0 } }), 'mut_colores')).toBe(true)
    expect(costoCaudal(40).log10()).toBe(Math.floor(1 + 0.6 * 40 + 0.075 * 1600 + 0.5)) // 145: por debajo, sin extra
  })
  it('Cascada: 10^(40 + 6n)', () => {
    cerca(costoCascada(0), 1e40)
    cerca(costoCascada(3), 1e58)
  })
  it('Mutaciones (SPEC 4.6)', () => {
    cerca(costoMutacion('caudal', 0), 1e120)
    cerca(costoMutacion('caudal', 1), 1e138)
    cerca(costoMutacion('colores', 2), 1e174)
    cerca(costoMutacion('expansion', 1), 1e145)
    cerca(costoMutacion('cascada', 4), 1e252)
  })
})

describe('producción', () => {
  it('Caudal: 2^nivel × 3^mutación', () => {
    expect(caudal(con({ caudal: 0 }))).toBe(1)
    expect(caudal(con({ caudal: 5 }))).toBe(32)
    expect(caudal(con({ caudal: 2, mutaciones: { caudal: 2, colores: 0, expansion: 0, cascada: 0 } }))).toBe(36)
  })
  it('color: mult^nivel × 4^floor(nivel/25)', () => {
    cerca(multColor(0, 4), 2.44140625)
    cerca(multColor(1, 2), 2.25)
    cerca(multColor(2, 24), 2 ** 24)
    cerca(multColor(2, 25), 2 ** 25 * 4)
    cerca(multColor(3, 50), 3 ** 50 * 16)
  })
  it('anillos: uno por cada duplicación desde 64', () => {
    expect([0, 63, 64, 127, 128, 1000, 64 * 2 ** 20].map(anillos)).toEqual([0, 0, 1, 1, 2, 4, 21])
    cerca(multAnillos(con({ granos: 1000 })), 1.4641)
    cerca(multAnillos(con({ granos: 128, mutaciones: { caudal: 0, colores: 0, expansion: 5, cascada: 0 } })), 1.44)
  })
  it('Cascada: G^(0,478c) / 10^(0,131c), mínimo ×1', () => {
    const muts = { caudal: 0, colores: 0, expansion: 0, cascada: 2 }
    expect(cascadaC(con({ cascada: 0, mutaciones: muts }))).toBe(0)
    expect(cascadaC(con({ cascada: 3 }))).toBeCloseTo(0.12)
    expect(cascadaC(con({ cascada: 3, mutaciones: muts }))).toBeCloseTo(0.18)
    cerca(multCascada(con({ cascada: 1, granos: 1e6 })), 10 ** 0.10948) // 0,04 × (0,478·6 − 0,131)
    cerca(multCascada(con({ cascada: 10, granos: 1 })), 1) // sin el mínimo daría menos de 1
    cerca(multCascada(con({ cascada: 0, granos: 1e6 })), 1)
  })
  it('Densidad: 1 + 0,12 × compresiones', () => {
    expect(densidad(con({ compresiones: 0 }))).toBe(1)
    expect(densidad(con({ compresiones: 17 }))).toBeCloseTo(3.04)
  })
  it('Energía/s = F × 0,035 × G × V^D', () => {
    expect(produccion(con({ granos: 0 })).toNumber()).toBe(0)
    cerca(produccion(estadoInicial()), 0.035 * CFG.granos_iniciales) // la primera corrida arranca con granos
    cerca(produccion(con({ granos: 100 })), 3.85) // 1 × 3,5 × 1,1 (un anillo)
    // F = 4, G = 50 (sin anillos), V = 1,25² × 10 = 15,625, D = 1,24
    const s = con({ granos: 50, caudal: 2, colores: [2, 0, 0, 0], compresiones: 2, mutaciones: { caudal: 0, colores: 1, expansion: 0, cascada: 0 } })
    cerca(valor(s), 15.625)
    cerca(produccion(s), 4 * 0.035 * 50 * 15.625 ** 1.24)
  })
})

describe('tienda', () => {
  it('comprar cobra y sube un nivel; sin Energía no hace nada', () => {
    const pobre = con({ energia: new Decimal(9) })
    expect(comprar(pobre, 'caudal')).toBe(pobre)
    const s = comprar(con({ energia: new Decimal(12) }), 'caudal')
    expect(s.caudal).toBe(1)
    cerca(s.energia, 2)
  })
  it('comprarMax compra todo lo que alcanza', () => {
    const s = comprarMax(con({ energia: new Decimal(1200) }), 'caudal') // 10 + 100 + 1000 = 1110; el siguiente es otro 1000
    expect(s.caudal).toBe(3)
    cerca(s.energia, 90)
  })
  it('ofrece cada cosa recién cuando corresponde', () => {
    expect(disponibles(estadoInicial())).toEqual(['caudal', 'color0'])
    expect(disponibles(con({ coloresDesbloqueados: 4, compresiones: 2 }))).toEqual(
      ['caudal', 'color0', 'color1', 'color2', 'color3', 'cascada'])
    expect(disponibles(con({ compresiones: 2, cascada: 10 }))).not.toContain('cascada')
    expect(disponibles(con({ compresiones: 5, maxEnergia: new Decimal('1e119') }))).not.toContain('mut_caudal')
    const conMuts = disponibles(con({ compresiones: 5, maxEnergia: new Decimal('1e120'), mutaciones: { caudal: 5, colores: 0, expansion: 0, cascada: 0 } }))
    expect(conMuts).toEqual(['caudal', 'color0', 'cascada', 'mut_colores', 'mut_expansion', 'mut_cascada'])
  })
  it('no deja comprar lo que no está disponible', () => {
    const s = con({ energia: new Decimal('1e50') })
    expect(comprar(s, 'cascada')).toBe(s)
    expect(comprar(s, 'color1')).toBe(s)
    expect(aplicar(s, 'color1').colores).toEqual([0, 1, 0, 0])
  })
})

describe('tick', () => {
  it('suma Energía y granos (Euler) y es determinista', () => {
    const s = tick(con({ granos: 100 }), 2)
    cerca(s.energia, 7.7)
    expect(s.granos).toBe(102)
    expect(s.tiempoCorrida).toBe(2)
    expect(tick(con({ granos: 100 }), 2)).toEqual(s)
  })
  it('desbloquea colores al alcanzar su Energía, para siempre', () => {
    const s = tick(con({ energia: new Decimal(1e9) }), 0.05)
    expect(s.coloresDesbloqueados).toBe(3)
    expect(comprimir(con({ coloresDesbloqueados: 3, energia: new Decimal(1e17) })).coloresDesbloqueados).toBe(3)
  })
  it('autocompradores: según la Compresión, con interruptor, una vez por segundo', () => {
    const rico = { energia: new Decimal(1200), coloresDesbloqueados: 4 }
    expect(autocomprar(con({ ...rico, compresiones: 1 })).caudal).toBe(0)
    const s2 = autocomprar(con({ ...rico, compresiones: 2 }))
    expect([s2.caudal, s2.colores[0]]).toEqual([3, 0])
    const s3 = autocomprar(con({ ...rico, compresiones: 3 }))
    expect([s3.caudal, s3.colores[0]]).toEqual([3, 2]) // Máx de cada uno: Caudal 10 + 100 + 1000; sobran 90: Ámbar 10 + 10
    const apagado = con({ ...rico, compresiones: 3 })
    apagado.auto = { ...apagado.auto, caudal: false }
    expect(autocomprar(apagado).caudal).toBe(0)
    expect(tick(con({ ...rico, compresiones: 2 }), 0.5).caudal).toBe(0)
    expect(tick(tick(con({ ...rico, compresiones: 2 }), 0.5), 0.5).caudal).toBe(3)
  })
  it('Compresión automática desde la 6', () => {
    const listo = { energia: new Decimal('1e80'), granos: 10 }
    expect(tick(con({ ...listo, compresiones: 5 }), 0.05).compresiones).toBe(5)
    expect(tick(con({ ...listo, compresiones: 6 }), 0.05).compresiones).toBe(7)
  })
  it('la Energía se frena en 1e308 y la economía espera el Infinito', () => {
    const s = tick(con({ energia: INFINITO.div(2), granos: 1e22, caudal: 60, colores: [116, 82, 59, 45], cascada: 10, compresiones: 17, mutaciones: { caudal: 5, colores: 5, expansion: 5, cascada: 5 } }), 1e6)
    expect(s.energia.eq(INFINITO)).toBe(true)
    expect(s.infinitos).toBe(0)
    expect(tick(s, 100)).toBe(s)
    expect(comprar(s, 'caudal')).toBe(s)
    expect(punado(s)).toBe(s)
  })
})

describe('Infinito (SPEC_CAPA1 §3 y §4, sin Romper)', () => {
  const lleno = con({
    energia: INFINITO, granos: 1e20, caudal: 50, colores: [100, 80, 60, 40], cascada: 10, compresiones: 17,
    mutaciones: { caudal: 5, colores: 5, expansion: 5, cascada: 5 }, maxEnergia: INFINITO, coloresDesbloqueados: 4,
    tiempoTotal: 9000, tiempoCorrida: 100, granosTotales: 1e21, auto: { ...estadoInicial().auto, caudal: false },
  })
  it('sin llegar a 1e308 no pasa nada', () => {
    const s = con({ energia: INFINITO.div(10) })
    expect(infinito(s)).toBe(s)
  })
  it('el primero da primer_infinito; los siguientes, floor(10^base)', () => {
    const uno = infinito(lleno)
    expect(uno.cristales.toNumber()).toBe(CFG1.cristales.primer_infinito)
    expect(uno.infinitos).toBe(1)
    const dos = infinito({ ...uno, energia: INFINITO })
    const gana = Math.floor(10 ** CFG1.cristales.base_log10)
    expect(gana).toBe(2) // SPEC_CAPA1 §4: "2 al principio"
    expect(dos.cristales.toNumber()).toBe(CFG1.cristales.primer_infinito + gana)
    expect(dos.cristalesTotales.eq(dos.cristales)).toBe(true)
    expect(dos.infinitos).toBe(2)
  })
  it('reinicia todo lo de la Arena y conserva lo demás', () => {
    const s = infinito(lleno)
    const { cristales, cristalesTotales, ...resto } = s
    expect(resto).toEqual({
      ...estadoInicial(), cristales: undefined, cristalesTotales: undefined, granos: 0, infinitos: 1,
      tiempoTotal: 9000, granosTotales: 1e21, auto: lleno.auto,
      relicario: { ...estadoInicial().relicario, pendiente: 1 }, // la reliquia de este Infinito espera su tipo (bloque 8)
    })
    expect(tick(s, 1).energia.lt(INFINITO)).toBe(true) // la Arena vuelve a andar
  })
})

describe('Compresión', () => {
  it('umbrales fijos; después de la 17 no hay más', () => {
    expect(puedeComprimir(con({ energia: new Decimal('9.9e16') }))).toBe(false)
    expect(puedeComprimir(con({ energia: new Decimal('1e17') }))).toBe(true)
    expect(puedeComprimir(con({ energia: new Decimal('1e27'), compresiones: 1 }))).toBe(false)
    expect(puedeComprimir(con({ energia: new Decimal('1e300'), compresiones: 17 }))).toBe(false)
  })
  it('reinicia la corrida y conserva lo permanente (SPEC 4.7)', () => {
    const antes = con({
      energia: new Decimal('1e30'), maxEnergia: new Decimal('1e30'), granos: 5e6, caudal: 20, colores: [30, 20, 10, 5],
      cascada: 0, compresiones: 1, coloresDesbloqueados: 4, tiempoCorrida: 600, tiempoTotal: 1500,
      mutaciones: { caudal: 1, colores: 0, expansion: 0, cascada: 0 },
    })
    antes.auto = { ...antes.auto, caudal: false }
    const s = comprimir(antes)
    expect(s).toEqual({
      ...antes, compresiones: 2, energia: new Decimal(0), granos: 0, caudal: 0, colores: [0, 0, 0, 0], tiempoCorrida: 0,
      mejorCorrida: 600, // estadística: la corrida más corta hasta ahora
    })
    const sinLlegar = con({ energia: new Decimal(1e10) })
    expect(comprimir(sinLlegar)).toBe(sinLlegar)
  })
})

describe('Puñado', () => {
  it('suelta 5 granos, como mucho 8 veces por segundo', () => {
    const s = punado(con({ granos: 100 }))
    expect(s.granos).toBe(105)
    cerca(s.energia, 5 * 3.85)
    expect(punado(s)).toBe(s)
    expect(punado(tick(s, 0.1)).granos).toBeCloseTo(105.1) // 0,1 s < 1/8 s: todavía no
    expect(punado(tick(s, 0.2)).granos).toBeCloseTo(110.2)
  })
})

describe('modos de compra (hito 3)', () => {
  it('comprarN compra n niveles o ninguno', async () => {
    const { comprarN } = await import('../src/core')
    const s = con({ energia: new Decimal(150) }) // Caudal 10 + 100 = 110; el tercero cuesta 1000
    expect(comprarN(s, 'caudal', 2).caudal).toBe(2)
    expect(comprarN(s, 'caudal', 3)).toBe(s)
  })
  it('comprarTodo compra lo más barato primero', async () => {
    const { comprarTodo } = await import('../src/core')
    const t = comprarTodo(con({ energia: new Decimal(70) }), ['caudal', 'color0'])
    // Caudal 10, Ámbar 10, Ámbar 23,4, sobran 26,6 < 47 (Caudal) y < 54,95 (Ámbar 2)
    expect([t.caudal, t.colores[0]]).toEqual([1, 2])
  })
})
