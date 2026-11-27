// Capa 2, fase 9: Fusión del Infinito y Fusión, Cristales y Energía pasados 1e308, el escalado (Permeabilidad, Esquirla de
// fuego, Geoda), los 25 nodos de fuego y la Fundición automática (docs/capa2/escalado_ignicion.md, fundicion.md, red_fuego.md).
// Mismo estado que balance/ref_capa2.py => mismo freno, Brasas, Temperatura, Esquirlas/s, costos, escalado y Vidrio/s.
import Decimal from 'break_infinity.js'
import { describe, expect, it, vi } from 'vitest'
import REAL from '../docs/capa2/partidas/mi_partida_fin_capa1.txt?raw'
import {
  CFG, CFG1, CFG2, COMPRAS_ESQUIRLAS, INFINITO, NIVEL_MAX_RED, NODOS_FUEGO, autoDisponible, brasasAlFundir, campoInvalido, comprarEsquirla,
  comprarFuego, comprimir, costoEsquirlaLog10, cristalesAlInfinito, densidadFuego, ecoLog10, escaladoPermeabilidad, escarchaEterna, espacios,
  esquirlasPorSegundo, estadoInicial, factoresCrecimiento, flujoFuego, frenoCristales, fueraDeLinea, fundir, gammaEstrato, hornoEncendido, inerciaEterna,
  infinito, limiteCascada, limiteMutacion, magma, multBrasas, presionEstrato, puedeComprarEsquirla, puedeComprarFuego, relicarioFuego, temperatura,
  tick, topeCristales, toparCristales, umbralLog10, vidrioAlInfinito, vidrioLog10, cargasAbiertas, type CompraEsquirla, type State,
} from '../src/core'
import { deserializar, importar, serializar, type Partida } from '../src/guardado/guardado'
import REF from './fixtures/capa2_escalado.json'

const ajustes = vi.hoisted(() => ({ notacion: 'cientifica' }))
vi.mock('../src/ui/ajustes.svelte', () => ({ ajustes }))
const { formato, NOTACIONES } = await import('../src/ui/formato')
const { desglose, desgloseV } = await import('../src/ui/desglose')

const MARCA = { codigo: 'ABCD2345', desde: 1.71e12 }
const i0 = estadoInicial()
const conFuego = (s: State, f: Partial<State['fuego']>): State => ({ ...s, fuego: { ...s.fuego, fundiciones: Math.max(1, s.fuego.fundiciones), ...f } })
const partida = (estado: State, b = true): Partida => ({ estado, guardadoEn: 1.7e12, vistos: {}, record: 0, logros: {}, ...(b && { beta: MARCA }) })
const E = CFG1.estratos

describe('contra sim_capa2.py', () => {
  it('el freno de los Cristales pasado el tope', () => {
    for (const c of REF.freno) expect(frenoCristales(c.lc)).toBeCloseTo(c.freno, 9)
  })
  it('Brasas con Crisol, cargas, Facetas de fuego y Fusión (también 1e5 y 1e6 en log10)', () => {
    for (const c of REF.brasas) {
      const cargas = DEF8.map((_, i) => (i < c.cargas / 4 ? 5 : 0))
      const s = conFuego({ ...i0, cristalesTotales: Decimal.pow10(c.Ctot) }, { nodos: c.fuegos, cargas, horno: { ...i0.fuego.horno, crisol: c.crisol } })
      expect(brasasAlFundir(s) / c.brasas).toBeCloseTo(1, 12)
    }
  })
  it('Temperatura con Esquirla de fuego, Compresión térmica y Calor latente', () => {
    for (const c of REF.T) {
      const s = conFuego(i0, { brasasTotales: c.Btot, compras: { esquirla_fuego: c.esquirla_fuego, geoda: 0 }, compresiones: c.compresiones, horno: { ...i0.fuego.horno, calor_latente: c.calor_latente } })
      expect(temperatura(s)).toBeCloseTo(c.T, 6)
    }
  })
  it('Esquirlas/s con Geoda y los costos de Esquirla de fuego y Geoda', () => {
    for (const c of REF.esquirlas) {
      const s = conFuego({ ...i0, escarcha: { ...i0.escarcha, abierta: true, logX: c.logX } }, { nodos: ['frio'], compras: { esquirla_fuego: 0, geoda: c.geoda } })
      expect(Math.log10(esquirlasPorSegundo(s))).toBeCloseTo(c.esq_log, 10)
    }
    for (const k of COMPRAS_ESQUIRLAS) REF.costos[k].forEach((c, L) => expect(costoEsquirlaLog10(k, L)).toBe(c))
  })
  it('Permeabilidad ×(1 + 0,3 F), con la raíz pasadas 20 Fundiciones', () => {
    for (const c of REF.escalado) expect(escaladoPermeabilidad(conFuego(i0, { fundiciones: c.F }))).toBeCloseTo(c.x, 12)
  })
  it('Vidrio/s con Sedimento fundido, Abismo ardiente y Eco del Horno; flujo con Convección', () => {
    for (const c of REF.vidrio) {
      const s = conFuego({ ...i0, red: { ...i0.red, estratos: 1, eco: c.eco }, cristalesTotales: Decimal.pow10(c.Ctot), estratos: { ...i0.estratos, abiertos: 8, s: c.s } },
        { brasasTotales: c.Btot, nodos: c.fuegos })
      expect(vidrioLog10(s)).toBeCloseTo(c.vidrio_log, 9)
      expect(flujoFuego(s)).toBeCloseTo(c.flujo_x, 12)
    }
  })
})
const DEF8 = i0.fuego.cargas

describe('Fusión del Infinito', () => {
  const real = importar(REAL).estado
  const sin = conFuego(real, { nodos: [] })
  const con = conFuego(real, { nodos: ['ruptura'] })
  it('levanta el tope en topeCristales: un Infinito pasa de 1e308, con el freno ^0,757', () => {
    expect(topeCristales(sin).eq(INFINITO)).toBe(true)
    expect(topeCristales(con).gt(Decimal.pow10(1e6))).toBe(true)
    const e = Decimal.pow10(1e6) // Energía muy pasada: el Infinito da más de 1e308 Cristales (con 1e5000 da 1e44, por el blando)
    expect(cristalesAlInfinito({ ...sin, energia: e }).log10()).toBeGreaterThan(CFG.infinito_log10 + 2)
    const a = infinito({ ...sin, energia: e }), b = infinito({ ...con, energia: e })
    expect(a.cristalesTotales.eq(INFINITO)).toBe(true)
    expect(b.cristalesTotales.log10()).toBeGreaterThan(CFG.infinito_log10 + 1)
    expect(cristalesAlInfinito({ ...con, energia: e }).log10()).toBeCloseTo(frenoCristales(cristalesAlInfinito({ ...sin, energia: e }).log10()), 9)
  })
  it('las Brasas escalan con los Cristales; Fusión (Ruptura II) las sube', () => {
    const a = { ...con, cristalesTotales: Decimal.pow10(700) }
    expect(brasasAlFundir(a)).toBeGreaterThan(brasasAlFundir({ ...a, cristalesTotales: INFINITO }))
    expect(brasasAlFundir(conFuego(a, { nodos: ['ruptura', 'ruptura2'] }))).toBeGreaterThan(brasasAlFundir(a))
  })
  it('una partida beta con Fusión y 1e400 Cristales se carga sin topar; sin Fusión, se topa', () => {
    const s = { ...con, cristales: Decimal.pow10(400), cristalesTotales: Decimal.pow10(450) }
    const p = deserializar(serializar(partida(s)))
    expect(p.tope).toBeUndefined()
    expect(p.estado.cristalesTotales.log10()).toBeCloseTo(450, 9)
    const t = deserializar(serializar(partida(conFuego(s, { nodos: [] }))))
    expect(t.estado.cristalesTotales.eq(INFINITO)).toBe(true)
    // sin la beta el fuego no existe: la misma partida se topa
    expect(deserializar(serializar(partida(s, false))).estado.cristalesTotales.eq(INFINITO)).toBe(true)
  })
})

describe('Cristales y Energía pasados 1e308: nada da Infinity ni NaN', () => {
  const real = conFuego(importar(REAL).estado, { nodos: [...NODOS_FUEGO], brasasTotales: 5000, brasas: 100 })
  for (const L of [309, 1000, 1e5, 1e6]) it(`1e${L}`, () => {
    const x = Decimal.pow10(L)
    let s: State = { ...real, cristales: x, cristalesTotales: x, energia: x, maxEnergia: x }
    expect(campoInvalido(s)).toBe('')
    for (let k = 0; k < 50; k++) s = tick(s, 0.05)
    expect(campoInvalido(s)).toBe('')
    expect(s.cristalesTotales.gte(x)).toBe(true)
    const c = cristalesAlInfinito(s)
    expect(Number.isFinite(c.log10())).toBe(true)
    const n = infinito(s)
    expect(campoInvalido(n)).toBe('')
    expect(n.cristalesTotales.gte(s.cristalesTotales)).toBe(true)
    expect(Number.isFinite(brasasAlFundir(s)) && Number.isFinite(temperatura(s)) && Number.isFinite(vidrioLog10(s))).toBe(true)
    expect(Number.isFinite(ecoLog10(s))).toBe(true)
    const f = fundir(s)
    expect(campoInvalido(f)).toBe('')
    expect(f.fuego.fundiciones).toBe(s.fuego.fundiciones + 1)
    for (const v of [...desglose(s).map((d) => d.log), ...desgloseV(s).map((d) => d.log)]) expect(Number.isFinite(v)).toBe(true)
    for (const nt of NOTACIONES) for (const d of [x, s.energia, c]) expect(formato(d, false, nt)).not.toMatch(/Infinity|NaN|—/)
    // se guarda y se lee igual
    const p = deserializar(serializar(partida(s))).estado
    expect(p.cristalesTotales.eq(s.cristalesTotales) && p.energia.eq(s.energia)).toBe(true)
    // sin Fusión, la migración lo baja al tope sin trabarse
    const t = toparCristales(conFuego(s, { nodos: [] })).estado
    expect(t.cristalesTotales.eq(INFINITO) && campoInvalido(t) === '').toBe(true)
  })
})

describe('los 25 nodos de fuego funcionan', () => {
  // Cada uno: un estado de prueba y lo que cambia al encenderlo.
  const base = conFuego({
    ...i0, red: { ...i0.red, eco: 4, inercia: 4, presion: 2, estratos: 1, capilaridad: 2, engarces: 4 }, compresiones: 17, cristalesTotales: Decimal.pow10(700),
    estratos: { ...i0.estratos, abiertos: 8, s: Array.from({ length: 8 }, (_, k) => 600 + (7 - k) * 2) }, escarcha: { ...i0.escarcha, abierta: true, logX: 500 },
    defectos: { ...i0.defectos, completos: ['vacancia'] },
  }, { brasasTotales: 3000, vuelta: 3600, cargas: [5, 3, 0, 0, 2, 0, 0, 0], horno: { ...i0.fuego.horno, crisol: 2 } })
  const MIDE: Record<string, (s: State) => unknown> = {
    memoria: (s) => fundir({ ...s, cristalesTotales: Decimal.pow10(309) }).red.memoria,
    sedimentacion: umbralLog10,
    cascada_plus: limiteCascada,
    estratos: hornoEncendido,
    mutacion_plus: limiteMutacion,
    eco: ecoLog10,
    compactacion: densidadFuego,
    defectos: (s) => cargasAbiertas(s, 'vacancia'),
    frio: escarchaEterna,
    inercia: inerciaEterna,
    presion: magma,
    cristalografia: (s) => vidrioAlInfinito(conFuego(s, { nodos: [...s.fuego.nodos, 'estratos'] })).vidrio.toString(),
    ruptura: (s) => topeCristales(s).toString(),
    germen: (s) => factoresCrecimiento(s).hieloYFuego,
    engarces: relicarioFuego,
    capilaridad: flujoFuego,
    sedimento2: (s) => vidrioLog10(conFuego(s, { nodos: [...s.fuego.nodos, 'estratos'] })),
    defectos2: (s) => cargasAbiertas(s, 'fatiga'),
    compactacion2: (s) => temperatura(comprimir({ ...s, compresiones: 0, energia: Decimal.pow10(umbralLog10({ ...s, compresiones: 0 }) + 1) })),
    eco2: (s) => vidrioLog10(conFuego(s, { nodos: [...s.fuego.nodos, 'estratos'] })),
    deshielo: (s) => autoDisponible(conFuego(s, { nodos: [...s.fuego.nodos, 'frio'] }), 'escarcha_mejoras'),
    cristalografia2: multBrasas,
    engarces2: espacios,
    abismo: (s) => vidrioLog10(conFuego({ ...s, estratos: { ...s.estratos, s: s.estratos.s.map((x, k) => (k > 4 ? x - 10 : x)) } }, { nodos: [...s.fuego.nodos, 'estratos'] })),
    ruptura2: brasasAlFundir,
  }
  it('son 25, todos con prueba', () => expect(Object.keys(MIDE).sort()).toEqual([...NODOS_FUEGO].sort()))
  for (const id of NODOS_FUEGO) it(id, () => {
    const s = { ...base, red: { ...base.red, [id]: NIVEL_MAX_RED }, fuego: { ...base.fuego, brasas: CFG2.red_fuego[id].precio } }
    expect(puedeComprarFuego(s, id)).toBe(true) // ninguno queda "próximamente"
    const con = comprarFuego(s, id)
    expect(con.fuego.nodos).toContain(id)
    expect(con.fuego.brasas).toBe(0)
    // Sedimento fundido, Eco del Horno y Abismo ardiente miran el Vidrio con El Horno; el resto, solos
    expect(MIDE[id](con)).not.toEqual(MIDE[id](s))
  })
})

describe('el escalado', () => {
  const s = conFuego({ ...i0, red: { ...i0.red, estratos: 1 }, estratos: { ...i0.estratos, abiertos: 8, perm: Array(8).fill(10), pres: Array(8).fill(10), s: Array(8).fill(300) } }, { fundiciones: 1 })
  it('la Permeabilidad rinde más por Fundición; la Presión no', () => {
    const f5 = conFuego(s, { fundiciones: 5 })
    const g = (t: State) => gammaEstrato(t, 3, 10) / (1 + E.permeabilidad.suma_gamma * escaladoPermeabilidad(t) * 10)
    expect(g(f5)).toBeCloseTo(g(s), 12) // todo lo demás igual: solo cambia el término de la Permeabilidad
    expect(gammaEstrato(f5, 3, 10)).toBeGreaterThan(gammaEstrato(s, 3, 10))
    expect(presionEstrato(f5, 3)).toBe(presionEstrato(s, 3))
    expect(escaladoPermeabilidad(i0)).toBe(1) // sin Fundiciones (la partida pública) nada cambia
  })
  it('Esquirla de fuego y Geoda: con Esquirlas, desde la primera Fundición, permanentes', () => {
    const t = conFuego({ ...s, escarcha: { ...s.escarcha, abierta: true, esquirlas: 1e6 } }, { brasasTotales: 50 })
    expect(puedeComprarEsquirla({ ...t, fuego: { ...t.fuego, fundiciones: 0 } }, 'geoda')).toBe(false)
    let u = t
    for (const k of ['esquirla_fuego', 'geoda', 'geoda'] as CompraEsquirla[]) u = comprarEsquirla(u, k)
    expect(u.fuego.compras).toEqual({ esquirla_fuego: 1, geoda: 2 })
    expect(u.escarcha.esquirlas).toBe(1e6 - 10 - 10 - 100)
    expect(temperatura(u)).toBeGreaterThan(temperatura(t))
    expect(fundir({ ...u, cristalesTotales: Decimal.pow10(309) }).fuego.compras).toEqual(u.fuego.compras)
    expect(comprarEsquirla({ ...u, escarcha: { ...u.escarcha, esquirlas: 5 } }, 'geoda').fuego.compras.geoda).toBe(2) // no alcanza
  })
  it('Compresión térmica: cada compresión suma 0,05 K, también después de fundir', () => {
    const t = conFuego({ ...i0, energia: Decimal.pow10(umbralLog10(i0) + 1) }, { nodos: ['compactacion2'] })
    const u = comprimir(t)
    expect(u.fuego.compresiones).toBe(1)
    expect(temperatura(u) - temperatura(t)).toBeCloseTo(CFG2.red_fuego.compactacion2.K_por_compresion, 12)
    expect(comprimir(conFuego(t, { nodos: [] })).fuego.compresiones).toBe(0)
    expect(fundir({ ...u, cristalesTotales: Decimal.pow10(309) }).fuego.compresiones).toBe(1)
  })
})

describe('Fundición automática', () => {
  const lista = conFuego({ ...i0, cristalesTotales: Decimal.pow10(309), auto: { ...i0.auto, fundicion: true } }, { nodos: ['memoria'], brasasTotales: 100 })
  it('aparece con Memoria eterna y arranca apagada', () => {
    expect(i0.auto.fundicion).toBe(false)
    expect(autoDisponible(conFuego(lista, { nodos: [] }), 'fundicion')).toBe(false)
    expect(autoDisponible(lista, 'fundicion')).toBe(true)
    expect(tick({ ...lista, auto: { ...lista.auto, fundicion: false } }, 0.05).fuego.fundiciones).toBe(1)
  })
  it('"apenas llegás": funde en el tick; fuera de línea y dentro de un Defecto, no', () => {
    expect(tick(lista, 0.05).fuego.fundiciones).toBe(2)
    expect(tick({ ...lista, cristalesTotales: INFINITO.div(10) }, 0.05).fuego.fundiciones).toBe(1)
    expect(fueraDeLinea(lista, 600).s.fuego.fundiciones).toBe(1)
    expect(tick({ ...lista, defectos: { ...lista.defectos, actual: 'vacancia' } }, 0.05).fuego.fundiciones).toBe(1)
  })
  it('"multiplicar mis Brasas ×N": con Fusión espera a que las Brasas totales queden ×N; sin Fusión funde apenas llega', () => {
    const m = { ...lista, automat: { ...lista.automat, fundicion: { modo: 'multiplicar' as const, x: 1.5 } } }
    expect(tick(m, 0.05).fuego.fundiciones).toBe(2) // sin Fusión da M_B igual: no tiene sentido esperar
    const f = conFuego(m, { nodos: ['memoria', 'ruptura'] })
    expect(brasasAlFundir(f)).toBeLessThan(50)
    expect(tick(f, 0.05).fuego.fundiciones).toBe(1) // daría menos de ×1,5
    const g = { ...f, cristalesTotales: Decimal.pow10(700) }
    expect(brasasAlFundir(g)).toBeGreaterThanOrEqual(50)
    expect(tick(g, 0.05).fuego.fundiciones).toBe(2)
  })
})

describe('guardado', () => {
  const s = conFuego({ ...i0, auto: { ...i0.auto, fundicion: true }, automat: { ...i0.automat, fundicion: { modo: 'multiplicar', x: 2.5 } } },
    { compras: { esquirla_fuego: 3, geoda: 7 }, compresiones: 41 })
  it('lo nuevo se guarda en la beta; una partida de la fase 8 lo arranca en cero; la pública no tiene fuego', () => {
    const p = deserializar(serializar(partida(s))).estado
    expect(p.fuego.compras).toEqual(s.fuego.compras)
    expect(p.fuego.compresiones).toBe(41)
    expect(p.automat.fundicion).toEqual({ modo: 'multiplicar', x: 2.5 })
    expect(p.auto.fundicion).toBe(true)
    const vieja = JSON.parse(serializar(partida(s)))
    delete vieja.estado.fuego.compras; delete vieja.estado.fuego.compresiones; delete vieja.estado.automat.fundicion; delete vieja.estado.auto.fundicion
    const q = deserializar(JSON.stringify(vieja)).estado
    expect(q.fuego.compras).toEqual({ esquirla_fuego: 0, geoda: 0 })
    expect(q.fuego.compresiones).toBe(0)
    expect(q.automat.fundicion).toEqual(i0.automat.fundicion)
    expect(q.auto.fundicion).toBe(false)
    expect(deserializar(serializar(partida(s, false))).estado.fuego.compras).toEqual({ esquirla_fuego: 0, geoda: 0 })
  })
  it('valores imposibles (editados a mano) quedan en rango', () => {
    const d = JSON.parse(serializar(partida(s)))
    d.estado.fuego.compras = { esquirla_fuego: -3, geoda: 2.7 }; d.estado.fuego.compresiones = -1
    d.estado.automat.fundicion = { modo: 'siempre', x: 0.2 }
    const q = deserializar(JSON.stringify(d)).estado
    expect(q.fuego.compras).toEqual({ esquirla_fuego: 0, geoda: 2 })
    expect(q.fuego.compresiones).toBe(0)
    expect(q.automat.fundicion).toEqual({ modo: 'llegar', x: 1 })
  })
})

