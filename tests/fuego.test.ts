// Capa 2, fase 3: la Fundición, las Brasas, la Temperatura, los nodos de fuego que ya funcionan (Memoria eterna, Lecho infinito,
// Resonancia) y su guardado. Brasas y Temperatura contra sim_capa2.py.
import Decimal from 'break_infinity.js'
import { describe, expect, it } from 'vitest'
import {
  CFG, CFG1, CFG2, INFINITO, NODOS, brasasAlFundir, comprarFuego, comprimir, densidad, ecoLog10, estadoInicial, fundir, infinito,
  puedeFundir, temperatura, tick, umbralLog10, type State,
} from '../src/core'
import { deserializar, serializar, type Partida } from '../src/guardado/guardado'
// Lo escribe `python balance/ref_capa2.py`.
import SIM_JSON from './fixtures/capa2_sim.json'
import MITAD_CAPA1 from './fixtures/mitad_capa1.json?raw'

const SIM = SIM_JSON as { nombre: string; Ctot: number; Btot: number; brasas: number; T: number; dens: number }[]
const MARCA = { codigo: 'ABCD2345', desde: 1.71e12 }
const N = CFG.compresion.umbrales_log10.length
const conFuego = (s: State, f: Partial<State['fuego']>): State => ({ ...s, fuego: { ...s.fuego, ...f } })
const conRed = (s: State, red: Record<string, number>): State => ({ ...s, red: { ...s.red, ...red } })
/** Fin de una vuelta: Cristales en el tope, la Red entera, Estratos y Escarcha abiertos. */
const enTope = (): State => ({
  ...estadoInicial(), infinitos: 40, compresiones: N, cristales: INFINITO, cristalesTotales: INFINITO,
  red: Object.fromEntries(Object.keys(NODOS).map((k) => [k, 4])), estratos: { ...estadoInicial().estratos, abiertos: 8 },
  escarcha: { ...estadoInicial().escarcha, abierta: true, logX: 50 }, defectos: { completos: ['vacancia'], actual: '', reintento: {} },
})
const partida = (estado: State, beta = true): Partida => ({ estado, guardadoEn: 1.7e12, vistos: {}, record: 0, logros: {}, ...(beta && { beta: MARCA }) })

describe('Brasas y Temperatura contra sim_capa2.py', () => {
  it.each(SIM)('$nombre: mismas Brasas, Temperatura y Densidad', ({ Ctot, Btot, brasas, T, dens }) => {
    const s = conFuego({ ...estadoInicial(), cristalesTotales: Decimal.pow10(Ctot) }, { brasasTotales: Btot })
    expect(brasasAlFundir(s)).toBe(brasas)
    expect(temperatura(s)).toBeCloseTo(T, 6)
    // D_total = D de las Capas 0 y 1 + (T − 300) / 1000
    expect(densidad(s) - densidad({ ...s, fuego: estadoInicial().fuego })).toBeCloseTo(dens, 9)
  })
  it('sin Brasas la Temperatura es la ambiente y no cambia la Densidad', () => {
    expect(temperatura(estadoInicial())).toBe(CFG2.temperatura.inicial)
    expect(densidad({ ...estadoInicial(), compresiones: 5 })).toBeCloseTo(1 + 5 * CFG.compresion.densidad_por_nivel, 12)
  })
})

describe('Fundición', () => {
  it('pide 1e308 Cristales totales en la vuelta', () => {
    const s = { ...enTope(), cristalesTotales: Decimal.pow10(300) }
    expect(puedeFundir(s)).toBe(false)
    expect(fundir(s)).toBe(s)
    expect(puedeFundir(enTope())).toBe(true)
  })

  it('reinicia las Capas 0 y 1, conserva la Automatización y suma Brasas para siempre', () => {
    const t = enTope()
    const antes: State = conFuego({
      ...t, auto: { ...t.auto, caudal: false }, automat: { ...t.automat, intervalo: { ...t.automat.intervalo, caudal: 7 } },
      relicario: { ...t.relicario, regla: { ...t.relicario.regla, modo: 'fijo' } }, tiempoTotal: 1234,
    }, { brasas: 3, brasasTotales: 10, fundiciones: 2, nodos: ['eco'] })
    const s = fundir(antes)
    expect(s.fuego).toMatchObject({ brasas: 4, brasasTotales: 11, fundiciones: 3, nodos: ['eco'] })
    expect(s.cristales.eq(0) && s.cristalesTotales.eq(0) && s.energia.eq(0)).toBe(true)
    expect([s.infinitos, s.compresiones, s.estratos.abiertos, s.escarcha.logX, s.defectos.completos.length]).toEqual([0, 0, 0, 0, 0])
    expect(Object.values(s.red).every((n) => n === 0)).toBe(true)
    expect(s.escarcha.abierta).toBe(false)
    expect(s.auto.caudal).toBe(false)
    expect(s.automat.intervalo.caudal).toBe(7)
    expect(s.relicario.regla.modo).toBe('fijo')
    expect(s.tiempoTotal).toBe(1234)
  })

  it('el Infinito no toca el fuego', () => {
    const s = conFuego({ ...enTope(), energia: INFINITO.mul(10), cristalesTotales: Decimal.pow10(100) }, { brasas: 2, nodos: ['memoria'] })
    expect(infinito(s).fuego).toEqual(s.fuego)
  })
})

describe('nivel de fuego de los nodos', () => {
  it('se compra con Brasas, con el nodo en nv4, y solo los que ya funcionan', () => {
    const s = conFuego(enTope(), { brasas: 1 })
    expect(comprarFuego(conRed(s, { memoria: 3 }), 'memoria').fuego.nodos).toEqual([])
    const c = comprarFuego(s, 'memoria')
    expect(c.fuego).toMatchObject({ brasas: 0, nodos: ['memoria'] })
    expect(comprarFuego(conFuego(c, { brasas: 9 }), 'memoria')).toEqual(conFuego(c, { brasas: 9 })) // ya lo tiene
    expect(comprarFuego(conFuego(s, { brasas: 99 }), 'frio').fuego.nodos).toEqual([]) // Escarcha eterna: próximamente
    expect(comprarFuego(conFuego(s, { brasas: 1 }), 'eco').fuego.nodos).toEqual([]) // Resonancia cuesta 2
  })

  it('Memoria eterna: la vuelta arranca con Memoria nv4 y sus compresiones; autocompradores el doble de seguido', () => {
    const s = fundir(conFuego(enTope(), { nodos: ['memoria'] }))
    expect(s.red.memoria).toBe(4)
    expect(s.compresiones).toBe((CFG1.red.nodos.memoria.conservar_compresiones as number[])[3])
    const medio = CFG.automatizacion.intervalo_s / 2
    expect(tick(s, medio).automat.segundos).toBe(1)
    expect(tick(fundir(enTope()), medio).automat.segundos).toBe(0)
  })

  it('Lecho infinito: compresiones pasadas las 17, la 17 + j pide 295 × 1,25^j y suma 0,03 de Densidad', () => {
    const u = CFG.compresion.umbrales_log10, L = CFG2.liberaciones
    const s = { ...estadoInicial(), compresiones: N }
    expect(umbralLog10(s)).toBe(Infinity)
    const l = conFuego(s, { nodos: ['sedimentacion'] })
    expect(umbralLog10(l)).toBeCloseTo(u[N - 1] * L.lecho_umbral_x, 9)
    expect(umbralLog10({ ...l, compresiones: N + 1 })).toBeCloseTo(u[N - 1] * L.lecho_umbral_x ** 2, 9)
    expect(densidad({ ...l, compresiones: N + 2 }) - densidad(l)).toBeCloseTo(2 * L.lecho_densidad, 12)
    // Con el Infinito roto la Energía llega: la compresión 18 se hace.
    const rota = conRed({ ...l, energia: Decimal.pow10(umbralLog10(l) + 1) }, { ruptura: 1 })
    expect(comprimir(rota).compresiones).toBe(N + 1)
  })

  it('Resonancia: el Eco suma p × 300 × Brasas totales^0,2', () => {
    const s = conFuego(conRed({ ...estadoInicial(), cristalesTotales: Decimal.pow10(50) }, { eco: 4 }), { brasasTotales: 32 })
    const p = (CFG1.red.nodos.eco.p as number[])[3]
    expect(ecoLog10(conFuego(s, { nodos: ['eco'] })) - ecoLog10(s)).toBeCloseTo(p * CFG2.red_fuego.eco.res_x * 32 ** CFG2.red_fuego.eco.res_exp, 9)
  })
})

describe('guardado del fuego', () => {
  const lleno = conFuego({ ...estadoInicial(), compresiones: N + 3 }, { brasas: 5, brasasTotales: 12, fundiciones: 4, nodos: ['memoria', 'sedimentacion', 'estratos'] })

  it('ida y vuelta en la beta (también nodos que esta versión todavía no hace y compresiones de Lecho)', () => {
    const p = deserializar(serializar(partida(lleno)))
    expect(p.estado.fuego).toEqual(lleno.fuego)
    expect(p.estado.compresiones).toBe(N + 3)
  })

  it('una partida beta de la fase 1B (sin fuego) migra con el fuego en cero', () => {
    const viejo = JSON.parse(serializar(partida(enTope())))
    delete viejo.estado.fuego
    const p = deserializar(JSON.stringify(viejo))
    expect(p.beta).toEqual(MARCA)
    expect(p.estado.fuego).toEqual(estadoInicial().fuego)
    expect(puedeFundir(p.estado)).toBe(true)
  })

  it('sin la marca de beta el fuego no existe (el juego público no cambia)', () => {
    const p = deserializar(serializar(partida(lleno, false)))
    expect(p.estado.fuego).toEqual(estadoInicial().fuego)
    expect(p.estado.compresiones).toBe(N)
    expect(deserializar(MITAD_CAPA1).estado.fuego).toEqual(estadoInicial().fuego)
  })

  it('valores rotos se sanean: enteros no negativos, nodos que existen y sin repetir', () => {
    const d = JSON.parse(serializar(partida(lleno)))
    d.estado.fuego = { brasas: -3, brasasTotales: 2.7, fundiciones: 1, nodos: ['eco', 'nada', 'eco', 7] }
    const texto = JSON.stringify(d)
    expect(deserializar(texto).estado.fuego).toMatchObject({ brasas: 0, brasasTotales: 2, fundiciones: 1, nodos: ['eco'] })
  })
})
