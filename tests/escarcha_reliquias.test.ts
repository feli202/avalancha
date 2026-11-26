// Capa 2, fase 7: la Escarcha eterna, Hielo y fuego, Deshielo automático, el Relicario de fuego y Engaste de lava
// (docs/capa2/escarcha_reliquias.md). Mismo estado que balance/ref_capa2.py => mismos g, P, m, Esquirlas/s, costos y reliquias.
import Decimal from 'break_infinity.js'
import { describe, expect, it } from 'vitest'
import {
  CFG, CFG1, CFG2, INFINITO, MEJORAS_ESCARCHA, TIPOS, autoDisponible, brilloEscarcha, cascadaRel, casilleros, cauceRel, costoMejoraEscarchaLog10,
  crecimientoEscarcha, encenderFuego, equipadas, espacios, esquirlasPorSegundo, estadoInicial, etapaMotor, fueraDeLinea, fundir, infinito,
  puedeRomperEscarcha, puntoRuptura, tick, type Pieza, type State,
} from '../src/core'
import { deserializar, serializar, type Partida } from '../src/guardado/guardado'
import REF from './fixtures/capa2_escarcha.json'

const MARCA = { codigo: 'ABCD2345', desde: 1.71e12 }
const i0 = estadoInicial()
type Ref = (typeof REF)[number]

/** El estado del juego de un caso de la referencia: Escarcha abierta, sus fuegos, Brasas totales, reparto y Templado. */
function desde(c: Ref, red: Record<string, number> = {}): State {
  return {
    ...i0, red: { ...i0.red, ...red },
    escarcha: { ...i0.escarcha, abierta: true, logX: c.logX, mejoras: c.mejoras },
    fuego: { ...i0.fuego, fundiciones: 1, brasasTotales: c.Btot, nodos: c.fuegos, repartos: [[1 - c.escarcha - c.relicario, 0, 0, c.escarcha, c.relicario], ...i0.fuego.repartos.slice(1)],
      horno: { ...i0.fuego.horno, templado: c.templado } },
  }
}
const pieza = (id: number, tipo: string, nivel: number, inf = 1): Pieza => ({ id, tipo, nivel, foto: '', inf })
const conRel = (s: State, rel: Partial<State['relicario']>): State => ({ ...s, relicario: { ...s.relicario, ...rel } })
const conFuego = (s: State, nodos: string[]): State => ({ ...s, fuego: { ...s.fuego, fundiciones: Math.max(1, s.fuego.fundiciones), nodos } })
/** Cuántas Ámbar vale todo el Relicario de un tipo (3^nivel cada pieza, también las que esperan). */
const ambares = (s: State, t: string) => [...s.relicario.piezas, ...s.relicario.espera].reduce((a, p) => a + (p.tipo === t ? 3 ** p.nivel : 0), 0)

describe('contra sim_capa2.py', () => {
  for (const c of REF) it(c.nombre, () => {
    const s = desde(c)
    expect(crecimientoEscarcha(s) / c.g).toBeCloseTo(1, 10)
    expect(puntoRuptura(s)).toBeCloseTo(c.P, 9)
    expect(brilloEscarcha(s)).toBeCloseTo(c.m, 6)
    expect(Math.log10(esquirlasPorSegundo(s))).toBeCloseTo(c.esq_log, 10)
    for (const k of MEJORAS_ESCARCHA) expect(costoMejoraEscarchaLog10(k, c.mejoras[k as keyof typeof c.mejoras], true)).toBe(c.costos[k as keyof typeof c.costos])
    expect(espacios(s)).toBe(c.slots)
    // Las reliquias del simulador: Cascada Jade y Cauce Ámbar engarzadas (con Engarces nv1 entran las dos)
    const r = conRel(desde(c, { engarces: 1 }), { piezas: [pieza(1, 'cascada', 2), pieza(2, 'cauce', 0)], equipadas: [1, 2] })
    expect(cascadaRel(r)).toBeCloseTo(c.cBonus, 12)
    expect(cauceRel(r)).toBeCloseTo(c.cauceX, 12)
  })
})

describe('Escarcha eterna', () => {
  const c = REF[1] // pasado P, con Hielo y fuego
  it('no se rompe, sigue creciendo pasado P y da Esquirlas por segundo', () => {
    const s = desde(c)
    expect(s.escarcha.logX).toBeGreaterThan(puntoRuptura(s))
    expect(puedeRomperEscarcha(s)).toBe(false)
    const n = tick(s, 2)
    expect(n.escarcha.logX - s.escarcha.logX).toBeCloseTo(2 * crecimientoEscarcha(s), 9)
    expect(n.escarcha.esquirlas - s.escarcha.esquirlas).toBeCloseTo(2 * esquirlasPorSegundo(s), 9)
    // sin fuego, la misma Escarcha se queda en P y no da nada
    const capa1 = conFuego(s, [])
    expect(tick(capa1, 2).escarcha.logX).toBe(puntoRuptura(capa1))
    expect(esquirlasPorSegundo(capa1)).toBe(0)
    expect(puedeRomperEscarcha(capa1)).toBe(true)
  })
  it('las mejoras cuestan con el paso ×3,86 y la Escarcha queda entera al fundir', () => {
    const s = { ...desde(c), cristalesTotales: Decimal.pow10(CFG2.fundicion.requisito_log10) }
    expect(costoMejoraEscarchaLog10('brillo', 9, true)).toBeGreaterThan(costoMejoraEscarchaLog10('brillo', 9))
    expect(fundir(s).escarcha).toEqual(s.escarcha)
    expect(fundir(conFuego(s, ['germen'])).escarcha).toEqual(i0.escarcha)
  })
  it('crece con la Arena frenada en 1e308 y fuera de línea al 10 %', () => {
    const s = { ...desde(c), energia: INFINITO, auto: { ...i0.auto, infinito: false } }
    expect(tick(s, 3).escarcha.logX).toBeGreaterThan(s.escarcha.logX)
    const a = fueraDeLinea(s, 3600)
    expect(a.segundos).toBeCloseTo(3600 * 0.1, 6)
    expect(a.s.escarcha.esquirlas - s.escarcha.esquirlas).toBeCloseTo(360 * esquirlasPorSegundo(s), -1)
    expect(a.escarchaAntes).toBe(s.escarcha.logX)
  })
  it('Deshielo automático compra las tres mejoras, la más barata primero; Romper la Escarcha ya no existe', () => {
    const s = { ...desde(c, { deshielo: 4 }), escarcha: { ...desde(c).escarcha, esquirlas: 1e12 } }
    expect(autoDisponible(s, 'escarcha')).toBe(false)
    expect(autoDisponible(s, 'escarcha_mejoras')).toBe(false)
    const d = conFuego(s, [...c.fuegos, 'deshielo'])
    expect(autoDisponible(d, 'escarcha_mejoras')).toBe(true)
    const n = tick(d, CFG.automatizacion.intervalo_s)
    const sube = MEJORAS_ESCARCHA.map((k) => n.escarcha.mejoras[k] - d.escarcha.mejoras[k])
    expect(sube.reduce((a, b) => a + b, 0)).toBeGreaterThan(0)
    expect(n.escarcha.esquirlas).toBeLessThan(d.escarcha.esquirlas)
    // también con la Arena frenada en 1e308, esperando la Fundición
    const frenada = { ...d, energia: INFINITO, auto: { ...d.auto, infinito: false } }
    expect(tick(frenada, 0.1).escarcha.mejoras).not.toEqual(d.escarcha.mejoras)
    expect(tick({ ...d, auto: { ...d.auto, escarcha_mejoras: false } }, CFG.automatizacion.intervalo_s).escarcha.mejoras).toEqual(d.escarcha.mejoras)
  })
})

describe('Relicario de fuego', () => {
  const base = (nodos = ['engarces']) => conFuego({ ...i0, red: { ...i0.red, engarces: 1 }, energia: INFINITO, infinitos: 5 }, nodos)
  it('cada Infinito trae una de cada tipo, sin pop-up; se fusionan y se engarzan solas las mejores', () => {
    let s = conRel(base(), { piezas: [pieza(1, 'cauce', 0), pieza(2, 'cauce', 0), pieza(3, 'mutaciones', 1)] })
    s = infinito(s)
    expect(s.relicario.pendiente).toBe(0)
    expect(s.relicario.piezas.map((p) => `${p.tipo}${p.nivel}`).sort()).toEqual(['cascada0', 'cauce1', 'mutaciones0', 'mutaciones1'])
    expect(equipadas(s).map((p) => p.nivel)).toEqual([1, 1]) // las dos de nivel 1
    expect(s.relicario.piezas.every((p) => p.inf <= s.infinitos)).toBe(true)
    // sin el fuego: la reliquia espera su tipo (el pop-up)
    expect(infinito(base([])).relicario.pendiente).toBe(6)
  })
  it('inventario doble; lo que no entra espera y vuelve, nunca se pierde ni se traba', () => {
    expect(casilleros(base())).toBe(CFG1.relicario.casilleros * CFG2.red_fuego.engarces.casilleros_x)
    // inventario lleno sin nada que fusionar: dos de cada (tipo, nivel)
    const llenas = TIPOS.flatMap((t, i) => Array.from({ length: 16 }, (_, k) => pieza(i * 100 + k + 1, t, Math.floor(k / 2))))
    let s = conRel(base(), { piezas: llenas })
    for (let k = 0; k < 30; k++) s = infinito({ ...s, energia: INFINITO })
    expect(s.relicario.piezas.length).toBeLessThanOrEqual(casilleros(s))
    expect(s.relicario.espera.length).toBeLessThanOrEqual(6)
    for (const t of TIPOS) expect(ambares(s, t)).toBe(llenas.filter((p) => p.tipo === t).reduce((a, p) => a + 3 ** p.nivel, 0) + 30)
  })
  it('al encenderlo migra la configuración sin perder poder: elige la pendiente, trae la espera y solo cambia por mejores', () => {
    const antes = conRel({ ...base([]), fuego: { ...base([]).fuego, brasas: 99 }, red: { ...i0.red, engarces: 4 } }, {
      piezas: [pieza(1, 'cauce', 2), pieza(2, 'cascada', 1), pieza(3, 'mutaciones', 3), pieza(4, 'mutaciones', 0), pieza(5, 'mutaciones', 0)],
      equipadas: [1, 2], pendiente: 5, faltan: 1, espera: [pieza(6, 'mutaciones', 0)],
      regla: { ...i0.relicario.regla, modo: 'fijo', orden: ['mutaciones', 'cauce', 'cascada'] },
    })
    const s = encenderFuego(antes, 'engarces')
    expect(s.fuego.nodos).toContain('engarces')
    expect(s.relicario.pendiente).toBe(0)
    expect(s.relicario.espera).toEqual([])
    expect(ambares(s, 'mutaciones')).toBe(ambares(antes, 'mutaciones') + 1) // la pendiente, con su regla (Tipo fijo)
    // Las engarzadas de antes siguen o cedieron su lugar a una de nivel mayor: la suma de niveles no baja.
    const nivel = (x: State) => equipadas(x).reduce((a, p) => a + p.nivel + 1, 0)
    expect(nivel(s)).toBeGreaterThanOrEqual(nivel(antes))
    for (const p of equipadas(antes)) expect(equipadas(s).some((q) => q.id === p.id) || equipadas(s).every((q) => q.nivel > p.nivel)).toBe(true)
    expect(cauceRel(s)).toBe(cauceRel(antes))
  })
  it('una partida beta con el Relicario de fuego se ordena al cargar; sin la marca no cambia nada', () => {
    const s = conRel(base(), { piezas: [pieza(1, 'cauce', 0), pieza(2, 'cauce', 0), pieza(3, 'cauce', 0)], pendiente: 5, faltan: 1 })
    const partida = (estado: State, beta = true): Partida => ({ estado, guardadoEn: 1.7e12, vistos: {}, record: 0, logros: {}, ...(beta && { beta: MARCA }) })
    const e = deserializar(serializar(partida(s))).estado
    expect(e.relicario.pendiente).toBe(0)
    expect(e.relicario.piezas.some((p) => p.tipo === 'cauce' && p.nivel === 1)).toBe(true)
    const pub = deserializar(serializar(partida(s, false))).estado
    expect(pub.relicario.pendiente).toBe(5)
    expect(pub.fuego.nodos).toEqual([])
  })
  it('una partida de la fase 6 recibe el interruptor de Deshielo automático y conserva los espacios de Engaste de lava', () => {
    const partida = (estado: State): Partida => ({ estado, guardadoEn: 1.7e12, vistos: {}, record: 0, logros: {}, beta: MARCA })
    const viejo = JSON.parse(serializar(partida(i0)))
    delete viejo.estado.auto.escarcha_mejoras
    expect(deserializar(JSON.stringify(viejo)).estado.auto.escarcha_mejoras).toBe(true)
    const lava = conRel(base(['engarces', 'engarces2']), { piezas: [pieza(1, 'cauce', 0), pieza(2, 'cascada', 0), pieza(3, 'mutaciones', 0)], equipadas: [1, 2, 3] })
    expect(espacios(lava)).toBe(3)
    expect(deserializar(serializar(partida(lava))).estado.relicario.equipadas).toEqual([1, 2, 3])
  })
})

describe('Engaste de lava y el Motor', () => {
  it('Engaste: un espacio más y las engarzadas cuentan un nivel más', () => {
    const s = conRel(conFuego({ ...i0 }, ['engarces']), { piezas: [pieza(1, 'cascada', 0)], equipadas: [1] })
    const l = conFuego(s, ['engarces', 'engarces2'])
    expect(espacios(l)).toBe(espacios(s) + CFG2.red_fuego.engarces2.espacios)
    expect(cascadaRel(l)).toBeCloseTo(2 * cascadaRel(s), 12)
    // al encenderlo, el espacio nuevo se llena en el acto
    const tres = conRel({ ...s, red: { ...i0.red, engarces2: 4 }, fuego: { ...s.fuego, brasas: 9999 } }, { piezas: [pieza(1, 'cascada', 0), pieza(2, 'cauce', 0)], equipadas: [1] })
    expect(equipadas(encenderFuego(tres, 'engarces2')).length).toBe(2)
  })
  it('etapa 3 con la Escarcha eterna, etapa 4 con el Relicario de fuego (el Motor abierto del todo)', () => {
    const s = conFuego({ ...i0 }, ['estratos'])
    expect(etapaMotor(s)).toBe(2)
    expect(etapaMotor(conFuego(s, ['estratos', 'frio']))).toBe(3)
    expect(etapaMotor(conFuego(s, ['estratos', 'frio', 'engarces']))).toBe(4)
  })
  it('los sectores Escarcha y Relicario multiplican las Esquirlas/s y las reliquias engarzadas', () => {
    const c = REF[2]
    const sin = desde({ ...c, escarcha: 0, relicario: 0 }), con = desde(c)
    expect(esquirlasPorSegundo(con) / esquirlasPorSegundo(sin)).toBeGreaterThan(1)
    const r = (x: State) => cascadaRel(conRel(x, { piezas: [pieza(1, 'cascada', 0)], equipadas: [1] }))
    expect(r(con) / r(sin)).toBeGreaterThan(1)
  })
})
