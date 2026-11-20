// Bloque 8: el Relicario como inventario. Fusión, engarces, efectos, regla automática y migración del guardado viejo.
import Decimal from 'break_infinity.js'
import { describe, expect, it } from 'vitest'
import {
  CFG, CFG1, INFINITO, TIPOS, cascadaC, cauceRel, caudal, conFoto, desequipar, efectoNivel, elegir, elegirSola, equipar,
  equiparMejores, escalon, espacios, estadoInicial, fusionables, fusionar, fusionarTodo, infinito, mutacionesRel, tick,
  tipoAutomatico, valor, type Pieza, type Regla, type State,
} from '../src/core'
import { deserializar, serializar } from '../src/guardado/guardado'
import { LADO } from '../src/render/pila'
import { desdeFoto, instantanea } from '../src/render/instantanea'

const R = CFG1.relicario
const FOTO = (n: number) => btoa(String.fromCharCode(...new Uint8Array(256).fill(n + 1)))
let id = 0
const pz = (tipo: string, nivel = 0, inf = ++id, foto = ''): Pieza => ({ id: ++id, tipo, nivel, foto, inf })
const con = (rel: Partial<State['relicario']>, extra: Partial<State> = {}): State => {
  const s = estadoInicial()
  return { ...s, ...extra, relicario: { ...s.relicario, ...rel } }
}
const regla = (r: Partial<Regla>) => ({ ...estadoInicial().relicario.regla, ...r })
const lleno: Partial<State> = { energia: INFINITO, maxEnergia: INFINITO }

describe('Relicario: elegir el tipo', () => {
  it('cada Infinito deja una reliquia esperando su tipo; elegir agrega una Ámbar con la pila de ese Infinito', () => {
    let s = conFoto(infinito(con({}, lleno)), FOTO(7))
    expect(s.relicario).toMatchObject({ pendiente: 1, foto: FOTO(7) })
    expect(elegir(s, 'nada')).toBe(s)
    s = elegir(s, 'cascada')
    expect(s.relicario.piezas).toEqual([{ id: 1, tipo: 'cascada', nivel: 0, foto: FOTO(7), inf: 1 }])
    expect(s.relicario).toMatchObject({ pendiente: 0, foto: '', ultimo: 'cascada' })
    expect(elegir(s, 'cauce')).toBe(s) // ya no hay nada que elegir
    // Un Infinito con la anterior sin elegir: se elige sola (con su pila) y llega la nueva.
    const dos = infinito({ ...conFoto(infinito({ ...s, ...lleno }), FOTO(1)), ...lleno })
    expect(dos.relicario.piezas.map((p) => p.foto)).toEqual([FOTO(7), FOTO(1)])
    expect(dos.relicario.pendiente).toBe(3)
  })

  it('con el inventario lleno el Infinito no deja reliquia, salvo que la fusión automática le haga lugar', () => {
    const llenas = [pz('cauce'), pz('cauce'), ...Array.from({ length: R.casilleros - 2 }, (_, i) => pz(TIPOS[1], 1 + (i % 2) + 2 * Math.floor(i / 2)))]
    const s = con({ piezas: llenas, pendiente: 9, regla: regla({ fusionar: true, equipar: false }) })
    const perdida = elegir(s, 'cauce')
    expect(perdida.relicario.piezas).toBe(llenas)
    expect(perdida.relicario.pendiente).toBe(0)
    expect(elegirSola(s).relicario.piezas).toBe(llenas) // el Infinito automático tampoco
    // Con Engarces II la nueva completa tres Cauce Ámbar: entra y se fusiona.
    const fusiona = elegir({ ...s, red: { ...s.red, engarces2: 1 } }, 'cauce')
    expect(fusiona.relicario.piezas.length).toBe(R.casilleros - 1)
    expect(elegir({ ...s, red: { ...s.red, engarces2: 1 } }, 'mutaciones').relicario.piezas).toBe(llenas)
  })

  it('Engarces nv4: cada Infinito deja dos reliquias; se eligen de a una (o las dos del mismo tipo) y la regla elige las dos', () => {
    const s = conFoto(infinito(con({}, { ...lleno, infinitos: 1, red: { ...estadoInicial().red, engarces: 4 } })), FOTO(2))
    expect(s.relicario).toMatchObject({ pendiente: 2, faltan: 2 })
    const una = elegir(s, 'cauce')
    expect(una.relicario).toMatchObject({ pendiente: 2, faltan: 1, foto: FOTO(2) })
    const dos = elegir(una, 'cauce')
    expect(dos.relicario).toMatchObject({ pendiente: 0, faltan: 0 })
    expect(dos.relicario.piezas.map((p) => [p.tipo, p.inf, p.foto])).toEqual([['cauce', 2, FOTO(2)], ['cauce', 2, FOTO(2)]])
    expect(elegirSola(s).relicario.piezas).toHaveLength(2)
    expect(infinito(con({}, { ...lleno, infinitos: 1, red: { ...estadoInicial().red, engarces: 3 } })).relicario.faltan).toBe(1)
  })

  it('la foto llega también a la pieza que el Infinito automático eligió en el mismo tick', () => {
    const s = con({}, { ...lleno, infinitos: 1, red: { ...estadoInicial().red, memoria: 4 } })
    const t = tick(s, 0.05)
    expect(t.infinitos).toBe(2)
    expect(t.relicario.pendiente).toBe(0)
    expect(t.relicario.piezas).toHaveLength(1)
    const f = conFoto(t, FOTO(3))
    expect(f.relicario.piezas[0].foto).toBe(FOTO(3))
    expect(conFoto(f, FOTO(9))).toBe(f) // no pisa una foto puesta
  })
})

describe('Relicario: fusión', () => {
  it('3 del mismo tipo y nivel → 1 del nivel siguiente, con la pila de la más vieja; si no son iguales, nada', () => {
    const [a, b, c] = [pz('cauce', 0, 5, FOTO(5)), pz('cauce', 0, 2, FOTO(2)), pz('cauce', 0, 9, FOTO(9))]
    const s = con({ piezas: [a, b, c, pz('cascada')] })
    expect(fusionables(s)).toEqual([[b.id, a.id, c.id]])
    const f = fusionar(s, [a.id, b.id, c.id])
    const nueva = f.relicario.piezas.at(-1)!
    expect(nueva).toMatchObject({ tipo: 'cauce', nivel: 1, foto: FOTO(2), inf: 2 })
    expect(f.relicario.piezas).toHaveLength(2)
    expect(fusionar(s, [a.id, b.id, s.relicario.piezas[3].id])).toBe(s) // otro tipo
    expect(fusionar(s, [a.id, b.id])).toBe(s)
    const otro = con({ piezas: [a, b, pz('cauce', 1)] })
    expect(fusionar(otro, [a.id, b.id, id])).toBe(otro) // otro nivel
  })

  it('la fusionada queda en el engarce de la que estaba puesta', () => {
    const ps = [pz('mutaciones'), pz('mutaciones'), pz('mutaciones'), pz('cauce')]
    const s = con({ piezas: ps, equipadas: [ps[3].id, ps[1].id] }, { red: { ...estadoInicial().red, engarces: 1 } })
    const f = fusionar(s, ps.slice(0, 3).map((p) => p.id))
    expect(f.relicario.equipadas).toEqual([ps[3].id, f.relicario.piezas.at(-1)!.id])
  })

  it('fusionar todo sube en cadena: 9 Ámbar → 1 Jade; escalera Ámbar → Coral → Jade → Violeta → Ámbar +1', () => {
    const s = fusionarTodo(con({ piezas: Array.from({ length: 11 }, () => pz('cascada')) }))
    expect(s.relicario.piezas.map((p) => p.nivel).sort()).toEqual([0, 0, 2])
    expect([0, 1, 2, 3, 4, 5].map(escalon)).toEqual([
      { color: 0, vuelta: 0 }, { color: 1, vuelta: 0 }, { color: 2, vuelta: 0 }, { color: 3, vuelta: 0 }, { color: 0, vuelta: 1 }, { color: 1, vuelta: 1 },
    ])
  })

  it('fusión automática solo con Engarces II y la opción prendida', () => {
    const dos = [pz('cauce'), pz('cauce')]
    const base = con({ piezas: dos, pendiente: 1 }, { infinitos: 1 })
    expect(elegir(base, 'cauce').relicario.piezas).toHaveLength(3)
    const e2 = { ...base, red: { ...base.red, engarces2: 1 } }
    expect(elegir(e2, 'cauce').relicario.piezas.map((p) => p.nivel)).toEqual([1])
    const apagada = { ...e2, relicario: { ...e2.relicario, regla: regla({ fusionar: false }) } }
    expect(elegir(apagada, 'cauce').relicario.piezas).toHaveLength(3)
  })
})

describe('Relicario: engarces y efectos', () => {
  it('1 espacio, 2/2/3/3 con Engarces; se engarza por pieza, gratis; cambiar de lugar', () => {
    const [a, b] = [pz('cauce'), pz('cascada')]
    const s = con({ piezas: [a, b] })
    expect(espacios(s)).toBe(1)
    expect([1, 2, 3, 4].map((n) => espacios({ ...s, red: { ...s.red, engarces: n } }))).toEqual([2, 2, 3, 3])
    expect(equipar(s, 999, 0)).toBe(s)
    expect(equipar(s, a.id, 1)).toBe(s) // no hay segundo espacio
    let e = equipar(s, a.id, 0)
    expect(e.relicario.equipadas).toEqual([a.id])
    expect(e.cristales.toNumber()).toBe(0)
    e = equipar(e, b.id, 0) // un solo espacio: reemplaza
    expect(e.relicario.equipadas).toEqual([b.id])
    const dos = { ...equipar({ ...e, red: { ...e.red, engarces: 1 } }, a.id, 1) }
    expect(dos.relicario.equipadas).toEqual([b.id, a.id])
    expect(equipar(dos, a.id, 0).relicario.equipadas).toEqual([a.id, b.id])
    expect(desequipar(dos, b.id).relicario.equipadas).toEqual([a.id])
  })

  it('efectos de §5 por nivel (n+1), solo las engarzadas, y dos del mismo tipo se suman', () => {
    const arena: Partial<State> = { granos: 1e6, colores: [10, 5, 0, 0], cascada: 3, mutaciones: { caudal: 2, colores: 2, expansion: 0, cascada: 0 } }
    const jade = { cauce: pz('cauce', 2), cascada: pz('cascada', 2), mutaciones: pz('mutaciones', 2) } as Record<string, Pieza>
    const sin = con({ piezas: Object.values(jade) }, arena)
    const base = con({}, arena)
    expect(valor(sin).eq(valor(base))).toBe(true)
    expect(caudal(sin)).toBe(caudal(base))
    const eq = (t: string) => ({ ...sin, relicario: { ...sin.relicario, equipadas: [jade[t].id] } })
    const coloresLog = valor({ ...base, granos: 1, cascada: 0, mutaciones: { ...base.mutaciones, colores: 0 } }).log10()
    expect(valor(eq('cauce')).div(valor(base)).log10()).toBeCloseTo(coloresLog * R.cauce_colores_pct_por_nivel * 3)
    expect(cascadaC(eq('cascada')) - cascadaC(base)).toBeCloseTo(R.cascada_c_por_nivel * 3)
    expect(cascadaC({ ...eq('cascada'), cascada: 0 })).toBe(0)
    const m = 1 + R.mutaciones_efecto_por_nivel * 3
    expect(Math.log10(caudal(eq('mutaciones')) / caudal(base))).toBeCloseTo(2 * (m - 1) * Math.log10(CFG.mutaciones.caudal.por_nivel))
    expect(valor(eq('mutaciones')).div(valor(base)).log10()).toBeCloseTo(2 * (m - 1) * Math.log10(CFG.mutaciones.colores.por_nivel))
    // Dos del mismo tipo: Jade (3) + Ámbar (1) = 4 pasos; una tercera fuera de los espacios no cuenta.
    const [j, a, b] = [pz('mutaciones', 2), pz('mutaciones'), pz('mutaciones')]
    const dos = con({ piezas: [j, a, b], equipadas: [j.id, a.id, b.id] }, { red: { ...estadoInicial().red, engarces: 1 } })
    expect(mutacionesRel(dos)).toBeCloseTo(R.mutaciones_efecto_por_nivel * 4)
  })

  it('equipar las mejores: mayor nivel primero', () => {
    const ps = [pz('cauce'), pz('cascada', 3), pz('mutaciones', 1), pz('cauce', 1)]
    const s = equiparMejores(con({ piezas: ps }, { red: { ...estadoInicial().red, engarces: 1 } }))
    expect(s.relicario.equipadas).toEqual([ps[1].id, ps[3].id])
    // Con la opción, cada elección vuelve a engarzar las mejores.
    const e = elegir(con({ piezas: [], pendiente: 1, regla: regla({ equipar: true }) }, { infinitos: 1 }), 'cascada')
    expect(e.relicario.equipadas).toEqual([e.relicario.piezas[0].id])
  })
})

describe('Relicario: regla automática', () => {
  const r = (modo: Regla['modo'], rel: Partial<State['relicario']> = {}, orden = [...TIPOS]) =>
    tipoAutomatico(con({ pendiente: 1, ...rel, regla: regla({ modo, orden }) }))

  it('tipo fijo, rotar y prioridad', () => {
    expect(r('fijo', {}, ['mutaciones', 'cauce', 'cascada'])).toBe('mutaciones')
    expect(r('rotar', { ultimo: '' })).toBe(TIPOS[0])
    expect(r('rotar', { ultimo: TIPOS[0] })).toBe(TIPOS[1])
    expect(r('rotar', { ultimo: TIPOS[2] })).toBe(TIPOS[0])
    // Prioridad: el primero va un nivel arriba del segundo y dos arriba del tercero.
    const orden = ['cascada', 'cauce', 'mutaciones']
    expect(r('prioridad', {}, orden)).toBe('cascada')
    expect(r('prioridad', { piezas: [pz('cascada')] }, orden)).toBe('cascada') // 0+0 contra −1+1 y −1+2: empate, gana el primero
    expect(r('prioridad', { piezas: [pz('cascada', 1)] }, orden)).toBe('cauce')
    expect(r('prioridad', { piezas: [pz('cascada', 2), pz('cauce', 1)] }, orden)).toBe('mutaciones')
  })

  it('completar fusiones: al que le falte menos; en empate, el que tiene alguna engarzada', () => {
    const ps = [pz('cauce'), pz('cascada'), pz('cascada'), pz('mutaciones')]
    expect(r('completar', { piezas: ps })).toBe('cascada')
    const emp = [pz('cauce'), pz('mutaciones')]
    expect(r('completar', { piezas: emp, equipadas: [emp[1].id] })).toBe('mutaciones')
  })

  it('subir el más bajo: el tipo cuya mejor engarzada tiene menor nivel (sin ninguna engarzada, primero)', () => {
    const ps = [pz('cauce', 3), pz('cascada', 1), pz('mutaciones', 2)]
    const s = { piezas: ps, equipadas: ps.map((p) => p.id) }
    expect(tipoAutomatico({ ...con({ ...s, pendiente: 1, regla: regla({ modo: 'subir' }) }), red: { ...estadoInicial().red, engarces: 3 } })).toBe('cascada')
    expect(r('subir', { piezas: ps, equipadas: [ps[0].id] })).toBe('cascada') // cascada y mutaciones sin engarzar: −1, gana el orden
  })

  it('sin elegir a tiempo o con Infinito automático, elige la regla', () => {
    const s = con({ pendiente: 1, ultimo: 'cauce', regla: regla({ modo: 'rotar' }) }, { infinitos: 1 })
    expect(elegirSola(s).relicario.piezas[0].tipo).toBe(TIPOS[(TIPOS.indexOf('cauce') + 1) % 3])
    const auto = tick(con({ regla: regla({ modo: 'fijo', orden: ['mutaciones', 'cauce', 'cascada'] }) }, { ...lleno, infinitos: 1, red: { ...estadoInicial().red, memoria: 4 } }), 0.05)
    expect(auto.relicario.piezas[0].tipo).toBe('mutaciones')
  })
})

describe('Relicario: guardado y migración', () => {
  const ida = (e: unknown) => deserializar(JSON.stringify({ version: 3, estado: e, guardadoEn: 0, vistos: {}, record: 0, logros: {} })).estado
  const plano = (s: State) => JSON.parse(serializar({ estado: s, guardadoEn: 0, vistos: {}, record: 0, logros: {} })).estado

  it('conserva el inventario y limpia lo imposible', () => {
    const ps = [pz('cauce', 2, 1, FOTO(4)), pz('cascada', 0, 2)]
    const s = con({ piezas: ps, equipadas: [ps[0].id], pendiente: 2, faltan: 1, foto: FOTO(1), ultimo: 'cauce', regla: regla({ modo: 'prioridad', orden: ['mutaciones', 'cauce', 'cascada'] }) }, { infinitos: 6, cristales: new Decimal(3) })
    expect(ida(plano(s)).relicario).toEqual(s.relicario)
    const p = plano(s)
    const roto = { ...p, relicario: { ...p.relicario, pendiente: 40, foto: 'x', regla: { modo: 'otro', orden: ['cauce', 'nada'] },
      piezas: [...p.relicario.piezas, { id: ps[0].id, tipo: 'cauce', nivel: 1 }, { id: 99, tipo: 'nada', nivel: 0 }, { id: 50, tipo: 'cauce', nivel: 1.5, foto: 'y', inf: 70 }],
      equipadas: [ps[0].id, ps[0].id, 7, 50, ps[1].id] } }
    const r = ida(roto).relicario
    expect(r.piezas.map((x) => x.id)).toEqual([ps[0].id, ps[1].id, 50])
    expect(r.piezas[2]).toEqual({ id: 50, tipo: 'cauce', nivel: 1, foto: '', inf: 6 })
    expect(r).toMatchObject({ equipadas: [ps[0].id], pendiente: 6, foto: '', regla: { modo: 'completar', orden: ['cauce', 'cascada', 'mutaciones'] } })
  })

  it('un Relicario viejo (cantidad por tipo) pasa a piezas fusionadas sin perder poder', () => {
    const viejoRel = { semilla: 5, reliquias: { cauce: 14, cascada: 1, mutaciones: 81 }, equipadas: ['cauce', 'mutaciones'], pendiente: 2 }
    const base = plano(con({}, { infinitos: 6, red: { ...estadoInicial().red, engarces: 1 } }))
    const s = ida({ ...base, relicario: viejoRel })
    const niveles = (t: string) => s.relicario.piezas.filter((p) => p.tipo === t).map((p) => p.nivel).sort()
    // 14 = 112 en base 3: 2 Ámbar, 1 Coral, 1 Jade. 81 = una Ámbar +1. 1 = una Ámbar.
    expect(niveles('cauce')).toEqual([0, 0, 1, 2])
    expect(niveles('mutaciones')).toEqual([4])
    expect(niveles('cascada')).toEqual([0])
    expect(s.relicario.pendiente).toBe(2)
    // El efecto viejo: efectoNivel(t, floor(log3(n))) de cada tipo engarzado.
    expect(cauceRel(s)).toBeCloseTo(efectoNivel('cauce', 2))
    expect(mutacionesRel(s)).toBeCloseTo(efectoNivel('mutaciones', 4))
    expect(cascadaC({ ...s, cascada: 3 })).toBeCloseTo(cascadaC({ ...estadoInicial(), cascada: 3 }))
    // Y sobrevive a otra vuelta de guardado.
    expect(ida(plano(s)).relicario).toEqual(s.relicario)
  })

  it('un guardado de antes del Relicario, con Infinitos hechos, tiene una reliquia para elegir', () => {
    const { relicario: _, ...viejo } = plano(con({}, { infinitos: 6 }))
    expect(ida(viejo).relicario).toMatchObject({ pendiente: 6, piezas: [], equipadas: [] })
  })
})

describe('Relicario: instantánea de la pila', () => {
  it('32×32 celdas de 2 bits (256 bytes), el radio medido en las alturas; una pila casi vacía no da foto', () => {
    const C = LADO >> 1, h = new Uint8Array(LADO * LADO)
    h[C * LADO + C] = 1
    expect(instantanea(h)).toBe('') // recién reiniciada: el juego se queda con la última buena
    for (let d = -20; d <= 20; d++) h[C * LADO + C + d] = 3 // una raya de radio 20
    h[C * LADO + C] = 2
    const f = instantanea(h)
    expect(atob(f)).toHaveLength(256)
    const e = desdeFoto(f)
    expect(e.radio).toBe(16)
    expect(e.alturas[C * LADO + C]).toBe(2)
    expect(e.alturas[C * LADO + C + 14]).toBe(3) // la raya llega casi al borde del círculo
    expect(e.alturas[(C - 5) * LADO + C]).toBe(0)
    expect(e.dentro[(C - 16) * LADO + C - 16]).toBe(0) // la esquina queda afuera del círculo
  })
})
