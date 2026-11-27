// Correcciones Capa 1, bloque 10: el panel de Automatización. Cada interruptor, intervalo, cantidad, condición y regla hace
// lo que dice; la configuración se guarda y se limpia.
import Decimal from 'break_infinity.js'
import { describe, expect, it } from 'vitest'
import {
  AUTOS, CFG, INFINITO, autoActivo, autoDisponible, autocomprar, comprarMax, encenderTodo, estadoInicial, tick,
  type Automat, type Pieza, type Regla, type State,
} from '../src/core'
import { deserializar, serializar } from '../src/guardado/guardado'

const conRed = (red: Partial<State['red']>, extra: Partial<State> = {}): State => {
  const s = estadoInicial()
  return { ...s, ...extra, red: { ...s.red, ...red } as State['red'] }
}
const conAuto = (s: State, cambio: Partial<Automat>): State => ({ ...s, automat: { ...s.automat, ...cambio } })
function apagado(s: State, k: string): State { return { ...s, auto: { ...s.auto, [k]: false } } }
// Con todo desbloqueado (Cascada y Mutaciones piden compresiones); sin Compresión automática, que reiniciaría la corrida.
const rico = apagado(conRed({ memoria: 3 }, {
  energia: new Decimal('1e200'), maxEnergia: new Decimal('1e200'), coloresDesbloqueados: 4,
  compresiones: Math.max(CFG.cascada.compresiones_para_desbloquear, CFG.mutaciones.compresiones_para_desbloquear),
}), 'compresion_auto')
/** Solo Cascada y Mutaciones (Caudal y los colores, que van primero, se gastan la Energía: para eso es el margen). */
const soloMemoria = ['caudal', ...CFG.colores.map((c) => c.id)].reduce(apagado, rico)
/** Un disparo de los autocompradores en el segundo `seg`. */
const disparo = (s: State, seg = 1) => autocomprar(conAuto(s, { segundos: seg }))

describe('Automatización: interruptores', () => {
  it('cada autocomprador de compras apagado deja de comprar lo suyo (y la tienda deja de decir AUTO: autoActivo)', () => {
    const todo = disparo(rico)
    expect(todo.caudal).toBeGreaterThan(0)
    expect(todo.colores.every((n) => n > 0)).toBe(true)
    const mem = disparo(soloMemoria)
    expect(mem.cascada).toBeGreaterThan(0)
    expect(Object.values(mem.mutaciones).some((n) => n > 0)).toBe(true)

    expect(disparo(apagado(rico, 'caudal')).caudal).toBe(0)
    CFG.colores.forEach((c, i) => {
      const t = disparo(apagado(rico, c.id))
      expect(t.colores[i]).toBe(0)
      expect(autoActivo(t, c.id)).toBe(false)
    })
    expect(disparo(apagado(soloMemoria, 'cascada')).cascada).toBe(0)
    expect(Object.values(disparo(apagado(soloMemoria, 'mutaciones')).mutaciones).every((n) => n === 0)).toBe(true)
  })

  it('Cascada, Mutaciones e Infinito se tienen con Memoria nv2, nv3 y nv4', () => {
    for (const [k, nv] of [['cascada', 2], ['mutaciones', 3], ['infinito', 4]] as const) {
      expect(autoDisponible(conRed({ memoria: nv - 1 }), k)).toBe(false)
      expect(autoDisponible(conRed({ memoria: nv }), k)).toBe(true)
    }
  })

  it('Encender todo / Apagar todo cambian solo los que el jugador tiene', () => {
    const s = conRed({ memoria: 2 })
    const off = encenderTodo(s, false)
    expect(AUTOS.filter((k) => autoDisponible(s, k)).every((k) => off.auto[k] === false)).toBe(true)
    expect(off.auto.mutaciones).toBe(true) // Memoria nv2: Mutaciones todavía no está
    expect(off.auto.infinito).toBe(true)
    const on = encenderTodo(off, true)
    expect(AUTOS.every((k) => on.auto[k] === (k !== 'fundicion'))).toBe(true) // la Fundición automática arranca apagada y sin Memoria eterna no está
  })
})

describe('Automatización: intervalo y cantidad', () => {
  it('por defecto (cada 1 s, máx) compra igual que comprar el máximo, como antes del bloque 10', () => {
    expect(disparo(apagado(rico, 'cascada')).caudal).toBe(comprarMax(rico, 'caudal').caudal)
    const t = tick({ ...conRed({ memoria: 1 }), energia: new Decimal('1e6'), relojAuto: 0.99 }, 0.05)
    expect(t.caudal).toBeGreaterThan(0)
    expect(t.automat.segundos).toBe(1)
  })

  it('cada 3 s: compra en los segundos 3, 6, 9… y no en los otros', () => {
    const s = conAuto(rico, { intervalo: { ...rico.automat.intervalo, caudal: 3 } })
    expect([1, 2, 3, 4, 5, 6].map((seg) => disparo(s, seg).caudal > 0)).toEqual([false, false, true, false, false, true])
    // Con tick: en 6 s de juego compra 2 veces (×1 para contarlas).
    let t = conAuto(s, { cantidad: { ...s.automat.cantidad, caudal: 1 } })
    for (let i = 0; i < 6; i++) t = tick(t, 1)
    expect(t.caudal).toBe(2)
  })

  it('cantidad ×1, ×10 y máx', () => {
    const con = (c: 0 | 1 | 10) => disparo(conAuto(rico, { cantidad: { ...rico.automat.cantidad, caudal: c } })).caudal
    expect(con(1)).toBe(1)
    expect(con(10)).toBe(10)
    expect(con(0)).toBeGreaterThan(10)
    // ×10 no compra si no alcanzan los diez (como el modo ×10 de la tienda).
    const pobre = { ...rico, energia: new Decimal(1) }
    expect(disparo(conAuto(pobre, { cantidad: { ...rico.automat.cantidad, caudal: 10 } })).caudal).toBe(0)
  })

  it('la cantidad también limita a Cascada y Mutaciones', () => {
    const uno = Object.fromEntries(Object.keys(rico.automat.cantidad).map((k) => [k, 1])) as Automat['cantidad']
    const t = disparo(conAuto(soloMemoria, { cantidad: uno }))
    expect(t.cascada).toBe(1)
    expect(Object.values(t.mutaciones).reduce((a, b) => a + b, 0)).toBe(1)
  })
})

describe('Automatización: Compresión', () => {
  const umbral = Decimal.pow10(CFG.compresion.umbrales_log10[0])
  // Solo la Compresión automática prendida: que los otros no gasten la Energía y la saquen del umbral.
  const lista = { ...encenderTodo(conRed({ memoria: 1 }, { energia: umbral, maxEnergia: umbral }), false), auto: { ...estadoInicial().auto, ...Object.fromEntries(AUTOS.map((k) => [k, k === 'compresion_auto'])) } }

  it('al llegar al umbral comprime enseguida; apagada, nunca', () => {
    expect(tick(lista, 0.05).compresiones).toBe(1)
    expect(tick(apagado(lista, 'compresion_auto'), 0.05).compresiones).toBe(0)
  })

  it('esperar 5 s más: no antes, sí a los 5 s; la espera vuelve a 0', () => {
    let t = conAuto(lista, { compresion: { modo: 'esperar', segundos: 5 } })
    for (let i = 0; i < 4; i++) t = tick(t, 1)
    expect(t.compresiones).toBe(0)
    expect(t.automat.espera).toBe(4)
    t = tick(t, 1)
    expect(t.compresiones).toBe(1)
    expect(t.automat.espera).toBe(0)
  })
})

describe('Automatización: Infinito automático', () => {
  const lleno = conRed({ memoria: 4 }, { energia: INFINITO, maxEnergia: INFINITO, infinitos: 1 })
  const hizo = (s: State) => tick(s, 0.05).infinitos === 2

  it('apenas llega; apagado o sin Memoria nv4, espera al jugador', () => {
    expect(hizo(lleno)).toBe(true)
    expect(hizo(apagado(lleno, 'infinito'))).toBe(false)
    expect(hizo({ ...lleno, red: { ...lleno.red, memoria: 3 } })).toBe(false)
  })

  it('al llegar a X Cristales: solo con Romper el Infinito (Ruptura nv1); sin él, igual apenas llega', () => {
    const con = (x: number, ruptura: number) =>
      conAuto({ ...lleno, red: { ...lleno.red, ruptura } }, { infinito: { modo: 'cristales', log10: Math.log10(x), mult: 1 } })
    expect(hizo(con(3, 0))).toBe(true) // sin la mejora el modo no cuenta
    expect(hizo(con(2, 1))).toBe(true) // hoy da 2
    expect(hizo(con(3, 1))).toBe(false)
  })
})

describe('Automatización: regla de reliquias del Infinito automático', () => {
  let id = 0
  const pz = (tipo: string, nivel = 0): Pieza => ({ id: ++id, tipo, nivel, foto: '', inf: 1 })
  const lleno = conRed({ memoria: 4, engarces: 3 }, { energia: INFINITO, maxEnergia: INFINITO, infinitos: 1 })
  /** El tipo de la reliquia que el Infinito automático eligió con la regla. */
  const elige = (r: Partial<Regla>, rel: Partial<State['relicario']> = {}) => {
    const s = { ...lleno, relicario: { ...lleno.relicario, ...rel, regla: { ...lleno.relicario.regla, ...r } } }
    const t = tick(s, 0.05)
    expect(t.relicario.pendiente).toBe(0)
    return t.relicario.piezas.at(-1)!.tipo
  }

  it('tipo fijo: siempre el primero del orden', () => {
    expect(elige({ modo: 'fijo', orden: ['mutaciones', 'cauce', 'cascada'] })).toBe('mutaciones')
    expect(elige({ modo: 'fijo', orden: ['cascada', 'cauce', 'mutaciones'] })).toBe('cascada')
  })

  it('rotar: el siguiente al último elegido', () => {
    expect(elige({ modo: 'rotar' }, { ultimo: 'cauce' })).toBe('cascada')
    expect(elige({ modo: 'rotar' }, { ultimo: 'mutaciones' })).toBe('cauce')
  })

  it('completar fusiones: el tipo al que le falta menos para la próxima', () => {
    expect(elige({ modo: 'completar' }, { piezas: [pz('mutaciones'), pz('mutaciones'), pz('cauce')] })).toBe('mutaciones')
  })

  it('subir el más bajo: el tipo cuya mejor engarzada tiene menor nivel', () => {
    const ps = [pz('cauce', 2), pz('cascada', 0), pz('mutaciones', 1)]
    expect(elige({ modo: 'subir' }, { piezas: ps, equipadas: ps.map((p) => p.id) })).toBe('cascada')
  })

  it('prioridad: el primero de la lista hasta que lleva un nivel al segundo', () => {
    const orden = ['mutaciones', 'cauce', 'cascada']
    expect(elige({ modo: 'prioridad', orden })).toBe('mutaciones')
    expect(elige({ modo: 'prioridad', orden }, { piezas: [pz('mutaciones', 1)] })).toBe('cauce')
  })

  it('fusionar solas (con Engarces II) y engarzar siempre las mejores', () => {
    const dos = [pz('cauce'), pz('cauce')]
    const e2 = { ...lleno, red: { ...lleno.red, engarces2: 1 } }
    const r = (x: Partial<Regla>) => ({ ...lleno.relicario.regla, modo: 'fijo' as const, orden: ['cauce', 'cascada', 'mutaciones'], ...x })
    const fusiona = tick({ ...e2, relicario: { ...e2.relicario, piezas: dos, regla: r({ fusionar: true }) } }, 0.05)
    expect(fusiona.relicario.piezas.map((p) => p.nivel)).toEqual([1])
    const no = tick({ ...e2, relicario: { ...e2.relicario, piezas: dos, regla: r({ fusionar: false }) } }, 0.05)
    expect(no.relicario.piezas).toHaveLength(3)
    const engarza = tick({ ...lleno, relicario: { ...lleno.relicario, regla: r({ equipar: true }) } }, 0.05)
    expect(engarza.relicario.equipadas).toHaveLength(1)
    const sin = tick({ ...lleno, relicario: { ...lleno.relicario, regla: r({ equipar: false }) } }, 0.05)
    expect(sin.relicario.equipadas).toHaveLength(0)
  })
})

describe('Automatización: guardado', () => {
  const ida = (e: unknown) => deserializar(JSON.stringify({ version: 3, estado: e, guardadoEn: 0, vistos: {}, record: 0, logros: {} })).estado
  const plano = (s: State) => JSON.parse(serializar({ estado: s, guardadoEn: 0, vistos: {}, record: 0, logros: {} })).estado

  it('se conserva con el Infinito y en el guardado; lo imposible se limpia; un guardado viejo arranca con todo prendido', () => {
    const s = conAuto(apagado(conRed({ memoria: 4 }), 'jade'), {
      intervalo: { ...estadoInicial().automat.intervalo, coral: 7 },
      cantidad: { ...estadoInicial().automat.cantidad, ambar: 10 },
      compresion: { modo: 'esperar', segundos: 30 },
      infinito: { modo: 'cristales', log10: 6, mult: 1 },
    })
    expect(ida(plano(s)).automat).toEqual(s.automat)
    expect(ida(plano(s)).auto.jade).toBe(false)
    const inf = tick({ ...s, energia: INFINITO, maxEnergia: INFINITO, infinitos: 1, automat: { ...s.automat, infinito: { modo: 'llegar', log10: 0, mult: 1 } } }, 0.05)
    expect(inf.automat.compresion).toEqual(s.automat.compresion)
    expect(inf.auto.jade).toBe(false)

    const p = plano(s)
    const roto = ida({ ...p, automat: { ...p.automat, intervalo: { ...p.automat.intervalo, caudal: -4, ambar: 2.7 }, cantidad: { ...p.automat.cantidad, coral: 7 },
      compresion: { modo: 'nunca', segundos: -1 }, infinito: { modo: 'ya', log10: -3 } } })
    expect(roto.automat.intervalo).toMatchObject({ caudal: CFG.automatizacion.intervalo_s, ambar: 2 })
    expect(roto.automat.cantidad.coral).toBe(0)
    expect(roto.automat.compresion).toEqual({ modo: 'umbral', segundos: 0 })
    expect(roto.automat.infinito).toEqual({ modo: 'llegar', log10: 0, mult: 1 })

    const { automat: _, ...viejo } = p
    const v = ida({ ...viejo, auto: { caudal: false } })
    expect(v.automat).toEqual(estadoInicial().automat)
    expect(v.auto).toMatchObject({ caudal: false, cascada: true, mutaciones: true, infinito: true })
  })
})
