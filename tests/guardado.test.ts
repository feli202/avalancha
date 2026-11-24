// Hito 5a: progreso fuera de línea y guardado, con el núcleo real.
import Decimal from 'break_infinity.js'
import { describe, expect, it } from 'vitest'
import { CFG, CFG1, INFINITO, infinito, comprar, comprarTodo, comprimir, disponibles, enDefecto, estadoInicial, fueraDeLinea, tick, type State } from '../src/core'
import type { Almacen } from '../src/guardado/almacen'
import {
  CLAVE, COPIAS, COPIA_CADA_MS, RESPALDO, VERSION, cargar, deserializar, exportar, guardar, importar, leerCopias, serializar, type Partida,
} from '../src/guardado/guardado'
import guardadoCapa0 from './fixtures/guardado_capa0_infinito.json'
import MITAD_CAPA1 from './fixtures/mitad_capa1.json?raw'

const partida = (estado: State): Partida =>
  ({ estado, guardadoEn: 1.7e12, vistos: { tienda: true }, record: 12345, logros: { derrumbe: true } })

/** Un jugador que compra todo lo que puede cada 15 s, con pasos de 50 ms como el juego. */
function jugar(s: State, segundos: number): State {
  for (let i = 1; i <= segundos * 20; i++) {
    s = tick(s, 0.05)
    if (i % 300 === 0) s = comprarTodo(s, disponibles(s))
  }
  return s
}

describe('fuera de línea', () => {
  const HORAS8 = 8 * 3600
  // Con todos los autocompradores y la Compresión automática: lo que más puede divergir.
  const desde = (compresiones: number) => ({ ...estadoInicial(), compresiones })

  for (const c of [0, 3, CFG.autocompradores.compresion_auto]) {
    // Sin reglas de ausencia (la pestaña oculta que se atrasó): la simulación por tramos da lo mismo que el tick normal.
    it(`8 h simuladas por tramos = 8 h de tick normal (±1 %), desde la Compresión ${c}`, () => {
      let normal = desde(c)
      for (let i = 0; i < HORAS8; i++) normal = tick(normal, 1)
      const a = fueraDeLinea(desde(c), HORAS8, false)
      console.log(
        `C${c}: normal 1e${normal.energia.log10().toFixed(3)} G ${normal.granos.toExponential(3)} comp ${normal.compresiones}` +
          ` | fuera 1e${a.s.energia.log10().toFixed(3)} G ${a.s.granos.toExponential(3)} comp ${a.s.compresiones}`,
      )
      expect(a.segundos).toBe(HORAS8)
      expect(a.compresiones).toBe(normal.compresiones - c)
      expect(a.s.compresiones).toBe(normal.compresiones)
      expect(a.s.caudal).toBe(normal.caudal)
      expect(a.s.colores).toEqual(normal.colores)
      expect(Math.abs(a.s.energia.div(normal.energia).toNumber() - 1)).toBeLessThanOrEqual(0.01)
      expect(Math.abs(a.s.granos / normal.granos - 1)).toBeLessThanOrEqual(0.01)
      expect(a.s.tiempoTotal).toBeCloseTo(normal.tiempoTotal, 6)
    }, 30_000) // 8 h de ticks de 1 s: 4–5 s solo, más con la suite en paralelo
  }

  it('hasta max_pasos usa pasos de 1 s: idéntico al tick normal', () => {
    let normal = desde(3)
    for (let i = 0; i < 5000; i++) normal = tick(normal, 1)
    expect(serializar(partida(fueraDeLinea(desde(3), 5000, false).s))).toBe(serializar(partida(normal)))
  })

  it('una ausencia cuenta como mucho tope_horas, a ×eficiencia', () => {
    const { tope_horas, eficiencia } = CFG.fuera_de_linea
    const a = fueraDeLinea(desde(3), 10 * tope_horas * 3600)
    expect(a.fuera).toBe(10 * tope_horas * 3600)
    expect(a.segundos).toBeCloseTo(tope_horas * 3600 * eficiencia, 6)
    expect(a.s.tiempoTotal).toBeCloseTo(tope_horas * 3600 * eficiencia, 6)
  })

  // Pedido final: el offline es un empujoncito. Una partida a mitad de la Capa 1 (el bot a las 4 h: Infinito roto, Estratos,
  // Infinito automático prendido) 24 h fuera rinde menos que 30 min jugando, sin ningún Infinito; dentro de un Defecto, nada.
  it('mitad de la Capa 1: 24 h fuera < 30 min de juego activo, sin Infinitos; en un Defecto no avanza', () => {
    const s = deserializar(MITAD_CAPA1).estado
    expect(s.infinitos).toBeGreaterThan(10)
    const a = fueraDeLinea(s, 24 * 3600)
    expect(a.s.tiempoTotal - s.tiempoTotal).toBeLessThan(30 * 60)
    expect(a.s.infinitos).toBe(s.infinitos)
    expect(a.s.cristalesTotales.eq(s.cristalesTotales)).toBe(true)
    expect(a.s.relicario.piezas.length).toBe(s.relicario.piezas.length)
    // 30 min jugando (con sus Infinitos automáticos) dan más que la ausencia, en Cristales y en los Estratos.
    let activo = s
    for (let i = 0; i < 30 * 60; i++) activo = tick(activo, 1)
    expect(activo.infinitos).toBeGreaterThan(s.infinitos)
    expect(activo.cristalesTotales.gt(a.s.cristalesTotales)).toBe(true)
    expect(activo.estratos.s[0]).toBeGreaterThan(a.s.estratos.s[0])
    // Dentro de un Defecto la ausencia no hace nada.
    const d: State = { ...s, defectos: { ...s.defectos, actual: 'vacancia' } }
    expect(enDefecto(d)).toBe(true)
    const b = fueraDeLinea(d, 24 * 3600)
    expect(b.defecto).toBe(true)
    expect(b.s).toBe(d)
  }, 60_000)

  it('sin tiempo (o con el reloj para atrás) no cambia nada', () => {
    const s = desde(3)
    expect(fueraDeLinea(s, 0).s).toBe(s)
    expect(fueraDeLinea(s, -50).s).toBe(s)
  })
})

describe('guardado', () => {
  it('guardar y cargar a mitad de una corrida no pierde ni un nivel ni un decimal', () => {
    const s = jugar(estadoInicial(), 600)
    expect(s.caudal).toBeGreaterThan(0)
    const texto = serializar(partida(s))
    const p = deserializar(texto)
    expect(p).toEqual(partida(s))
    expect(serializar(p)).toBe(texto)
    // Y sigue igual: 5 min más desde lo cargado dan exactamente lo mismo que sin haber guardado.
    expect(serializar(partida(jugar(p.estado, 300)))).toBe(serializar(partida(jugar(s, 300))))
  })

  it('Capa 1: ida y vuelta con Cristales (guardar → cargar → igual), también exportando', () => {
    const s = { ...infinito({ ...jugar(estadoInicial(), 60), energia: INFINITO }), cristales: new Decimal('1.2345678901234e120'), cristalesTotales: new Decimal('9.87e307') }
    const texto = serializar(partida(s))
    const p = deserializar(texto)
    expect(p).toEqual(partida(s))
    expect(p.estado.cristales.eq(s.cristales)).toBe(true)
    expect(serializar(p)).toBe(texto)
    expect(importar(exportar(p))).toEqual(p)
  })

  // Un guardado real de la Capa 0 (versión 2 del archivo), escrito por el código de antes de la Capa 1:
  // el bot de 15 s jugando el núcleo hasta el Infinito (3,3 h de juego).
  const capa0 = JSON.stringify(guardadoCapa0)

  it('migración: quien ya tenía el Infinito de la Capa 0 arranca la Capa 1 con 1 Cristal y la Arena reiniciada', () => {
    const viejo = JSON.parse(capa0)
    expect(viejo.version).toBe(2)
    expect(viejo.estado.infinitos).toBe(1)
    const p = deserializar(capa0)
    const e = p.estado
    expect(e.cristales.toNumber()).toBe(CFG1.cristales.primer_infinito)
    expect(e.cristalesTotales.toNumber()).toBe(1)
    expect(e.infinitos).toBe(1)
    expect([e.energia.toNumber(), e.granos, e.caudal, e.cascada, e.compresiones, e.maxEnergia.toNumber()]).toEqual([0, 0, 0, 0, 0, 0])
    expect(e.colores).toEqual([0, 0, 0, 0])
    expect(e.mutaciones).toEqual(estadoInicial().mutaciones)
    // Lo que no es de la Arena queda como estaba.
    expect([e.tiempoTotal, e.granosTotales, e.mejorCorrida]).toEqual([viejo.estado.tiempoTotal, viejo.estado.granosTotales, viejo.estado.mejorCorrida])
    expect([p.record, p.logros, p.vistos]).toEqual([viejo.record, viejo.logros, viejo.vistos])
    expect(p.secretos).toEqual(viejo.secretos && { abandonos: {}, ...viejo.secretos }) // los de antes no tenían abandonos (Terco)
    // Ya migrado, guardar y cargar no vuelve a cobrar el Infinito, y la Arena anda.
    expect(deserializar(serializar(p))).toEqual(p)
    expect(tick(e, 1).granos).toBeGreaterThan(0)
  })

  it('migración: una partida de la Capa 0 sin Infinito sigue igual, con 0 Cristales', () => {
    const viejo = JSON.parse(capa0)
    viejo.estado = { ...viejo.estado, infinitos: 0, energia: [1, 200], maxEnergia: [1, 200] }
    const e = deserializar(JSON.stringify(viejo)).estado
    expect(e.cristales.toNumber()).toBe(0)
    expect([e.infinitos, e.compresiones, e.caudal, e.energia.log10()]).toEqual([0, 17, viejo.estado.caudal, 200])
  })

  const memoria = (inicial: Record<string, string> = {}) => {
    const m = new Map(Object.entries(inicial))
    const a: Almacen = { leer: (k) => m.get(k) ?? null, escribir: (k, t) => void m.set(k, t) }
    return { a, m }
  }

  it('sin guardado: null', () => expect(cargar(memoria().a, 0)).toBeNull())

  it('guardar y cargar por el almacén', () => {
    const { a } = memoria()
    const p = partida(jugar(estadoInicial(), 60))
    guardar(a, p)
    expect(cargar(a, 0)).toEqual(p)
  })

  const bueno = serializar(partida(jugar(estadoInicial(), 60)))
  const rotos = {
    'no es JSON': 'hola',
    vacío: '',
    'JSON cortado': bueno.slice(0, bueno.length / 2),
    'otra cosa': `{"version":${VERSION}}`,
    'versión 1 sin estado': '{"version":1}',
    null: 'null',
    'versión del futuro': bueno.replace(`"version":${VERSION}`, '"version":99'),
    'un campo con otro tipo': bueno.replace(/"caudal":\d+/, '"caudal":"mucho"'),
    'sin estado': bueno.replace(/"estado":\{.*\},"guardadoEn"/, '"guardadoEn"'),
    'un número que no es número': bueno.replace(/"granos":[^,]+,/, '"granos":null,'),
  }
  for (const [nombre, texto] of Object.entries(rotos)) {
    it(`un guardado corrupto (${nombre}) no rompe nada y queda de respaldo`, () => {
      const { a, m } = memoria({ [CLAVE]: texto })
      expect(cargar(a, 0)).toBe('corrupto')
      expect(m.get(RESPALDO)).toBe(texto)
      expect(m.get(CLAVE)).toBe(texto) // cargar no pisa el guardado
      // Empezar de nuevo: el guardado nuevo no borra el respaldo.
      guardar(a, partida(estadoInicial()))
      expect(m.get(RESPALDO)).toBe(texto)
      expect(cargar(a, 0)).toEqual(partida(estadoInicial()))
    })
  }
})

describe('campos que faltan (I2)', () => {
  const p = partida(jugar(estadoInicial(), 60))
  const sin = (f: (d: any) => void) => { const d = JSON.parse(serializar(p)); f(d); return deserializar(JSON.stringify(d)) }
  it('un campo del estado que falta se completa con el inicial', () =>
    expect(sin((d) => delete d.estado.compresionesSinAmbar)).toEqual({ ...p, estado: { ...p.estado, compresionesSinAmbar: 0 } }))
  it('un autocomprador que falta, también', () =>
    expect(sin((d) => delete d.estado.auto.caudal).estado.auto.caudal).toBe(true))
  it('un color que falta al final, en nivel 0', () =>
    expect(sin((d) => d.estado.colores.pop()).estado.colores).toEqual([...p.estado.colores.slice(0, -1), 0]))
  it('un tipo equivocado sigue rechazado', () => expect(() => sin((d) => (d.estado.granos = 'mucho'))).toThrow())
})

describe('respaldos (I2)', () => {
  it('un segundo guardado dañado no pisa el respaldo del primero', () => {
    const m = new Map([[CLAVE, 'roto 1']])
    const a: Almacen = { leer: (k) => m.get(k) ?? null, escribir: (k, t) => void m.set(k, t) }
    expect(cargar(a, 1)).toBe('corrupto')
    expect(cargar(a, 2)).toBe('corrupto') // el mismo: no duplica
    m.set(CLAVE, 'roto 2')
    expect(cargar(a, 3)).toBe('corrupto')
    expect(m.get(RESPALDO)).toBe('roto 2')
    expect(m.get(`${RESPALDO}.3`)).toBe('roto 1')
    expect(m.has(`${RESPALDO}.2`)).toBe(false)
  })
})

describe('versión 1 → 2 (hito 5b)', () => {
  it('un guardado de la versión 1 carga, con estadísticas en cero y sin logros', () => {
    const s = jugar(estadoInicial(), 60)
    const { granosTotales, mejorCorrida, compresionesSinAmbar, ...viejo } = s
    const v1 = JSON.parse(serializar(partida(s)))
    v1.version = 1
    v1.estado = { ...v1.estado }
    for (const k of ['granosTotales', 'mejorCorrida', 'compresionesSinAmbar']) delete v1.estado[k]
    delete v1.logros
    const p = deserializar(JSON.stringify(v1))
    expect(p.estado).toEqual({ ...viejo, granosTotales: s.granos, mejorCorrida: 0, compresionesSinAmbar: 0, energia: s.energia, maxEnergia: s.maxEnergia })
    expect(p.logros).toEqual({})
  })
})

describe('versión 2 sin logros', () => {
  it('carga, con los logros vacíos', () => {
    const p = partida(jugar(estadoInicial(), 60))
    const d = JSON.parse(serializar(p))
    delete d.logros
    d.version = 2
    expect(deserializar(JSON.stringify(d))).toEqual({ ...p, logros: {} })
  })
})

describe('exportar / importar', () => {
  it('ida y vuelta por base64', () => {
    const p = partida(jugar(estadoInicial(), 120))
    const texto = exportar(p)
    expect(texto).toMatch(/^[A-Za-z0-9+/]+=*$/)
    expect(importar(texto)).toEqual(p)
    expect(importar(`  ${texto.slice(0, 20)}
${texto.slice(20)} `)).toEqual(p) // con espacios y saltos al pegar
  })
  for (const malo of ['', 'hola!', btoa('{"version":2}'), exportar(partida(estadoInicial())).slice(0, 40)])
    it(`un texto que no es partida tira error: ${JSON.stringify(malo.slice(0, 12))}`, () => expect(() => importar(malo)).toThrow())
})

describe('estadísticas del núcleo', () => {
  it('granos totales, corrida más rápida y compresiones sin Ámbar', () => {
    let s: State = { ...estadoInicial(), energia: estadoInicial().energia.add(1e20), tiempoCorrida: 500, granos: 10, granosTotales: 10 }
    s = tick(s, 1)
    expect(s.granosTotales).toBe(s.granos)
    s = comprimir(s)
    expect(s.compresiones).toBe(1)
    expect(s.mejorCorrida).toBe(501)
    expect(s.compresionesSinAmbar).toBe(1)
    // Segunda corrida, más lenta y con Ámbar: la mejor no cambia, sin Ámbar tampoco; los granos totales siguen.
    s = comprar({ ...s, energia: s.energia.add(1e40), tiempoCorrida: 900 }, 'color0')
    expect(s.colores[0]).toBe(1)
    const g = s.granosTotales
    s = comprimir(s)
    expect(s.mejorCorrida).toBe(501)
    expect(s.compresionesSinAmbar).toBe(1)
    expect(s.granos).toBe(0)
    expect(s.granosTotales).toBe(g)
  })
})

describe('rangos al importar (M5) y exportar grande (M7)', () => {
  const p = partida(estadoInicial())
  const con = (f: (d: any) => void) => { const d = JSON.parse(serializar(p)); f(d); return deserializar(JSON.stringify(d)).estado }
  it('granos negativos, 99 compresiones y Energía negativa quedan en rango', () => {
    const e = con((d) => { d.estado.granos = -5; d.estado.compresiones = 99; d.estado.energia = [-3, 10]; d.estado.cascada = 1e9 })
    expect(e.granos).toBe(0)
    expect(e.compresiones).toBe(CFG.compresion.umbrales_log10.length)
    expect(e.energia.toNumber()).toBe(0)
    expect(e.cascada).toBe(CFG.cascada.nivel_max)
  })
  it('un estado válido no cambia', () => { const s = jugar(estadoInicial(), 120); expect(deserializar(serializar(partida(s))).estado).toEqual(s) })
  it('exporta un guardado de 300 KB', () => {
    const grande = { ...p, vistos: Object.fromEntries(Array.from({ length: 20000 }, (_, i) => [`clave${i}`, true])) }
    expect(importar(exportar(grande))).toEqual(grande)
  })
})

describe('zoom de la pila', () => {
  it('se guarda con la partida; lo que no es un número positivo se descarta', () => {
    const p = { estado: estadoInicial(), guardadoEn: 1e12, vistos: {}, record: 0, logros: {} }
    expect(deserializar(serializar({ ...p, zoom: 12.5, zoomMaxS: 61 }))).toMatchObject({ zoom: 12.5, zoomMaxS: 61 })
    const raro = deserializar(JSON.stringify({ ...JSON.parse(serializar(p)), zoom: 'x', zoomMaxS: -3 }))
    expect(raro.zoom).toBeUndefined()
    expect(raro.zoomMaxS).toBeUndefined()
  })
})

describe('contadores de los logros secretos', () => {
  const p = { estado: estadoInicial(), guardadoEn: 1e12, vistos: {}, record: 0, logros: {} }
  it('se guardan; un guardado de antes no los tiene y uno editado mal se corrige', () => {
    const c = { capturas: 37, horas: 0b1011, abandonos: { fatiga: 3 } }
    expect(deserializar(serializar({ ...p, secretos: c })).secretos).toEqual(c)
    expect(deserializar(serializar(p)).secretos).toBeUndefined()
    const raro = deserializar(JSON.stringify({ ...JSON.parse(serializar(p)), secretos: { capturas: -2, horas: 2 ** 30, abandonos: { vidrio: -1, macla: 'x' } } }))
    expect(raro.secretos).toEqual({ capturas: 0, horas: 0, abandonos: {} })
  })
})

describe('v1.0, bloque 2: la partida nunca se pierde', () => {
  const memoria = (inicial: Record<string, string> = {}) => {
    const m = new Map(Object.entries(inicial))
    const a: Almacen = { leer: (k) => m.get(k) ?? null, escribir: (k, t) => void m.set(k, t) }
    return { a, m }
  }
  it('un estado con NaN o Infinity no se escribe y no pisa el guardado bueno', () => {
    const { a, m } = memoria()
    const bueno = partida(jugar(estadoInicial(), 30))
    guardar(a, bueno)
    const antes = m.get(CLAVE)
    expect(() => guardar(a, partida({ ...bueno.estado, granos: NaN }))).toThrow()
    expect(() => guardar(a, partida({ ...bueno.estado, energia: new Decimal(NaN) }))).toThrow()
    expect(() => guardar(a, partida({ ...bueno.estado, tiempoTotal: Infinity }))).toThrow()
    expect(m.get(CLAVE)).toBe(antes)
  })
  it('guarda los últimos 3 válidos, uno por minuto como mucho, el más nuevo primero', () => {
    const { a } = memoria()
    const s = estadoInicial()
    const en = (t: number, tiempoTotal: number) => ({ ...partida({ ...s, tiempoTotal }), guardadoEn: t })
    guardar(a, en(0, 1))
    guardar(a, en(10_000, 2)) // 10 s después: no rota
    expect(leerCopias(a).map((c) => c.partida.estado.tiempoTotal)).toEqual([1])
    guardar(a, en(COPIA_CADA_MS, 3))
    guardar(a, en(2 * COPIA_CADA_MS, 4))
    guardar(a, en(3 * COPIA_CADA_MS, 5))
    expect(leerCopias(a).map((c) => c.partida.estado.tiempoTotal)).toEqual([5, 4, 3])
    expect(leerCopias(a)[0].clave).toBe(COPIAS[0])
  })
  it('un respaldo dañado se saltea al listarlos', () => {
    const { a } = memoria({ [COPIAS[0]]: 'roto' })
    guardar(a, { ...partida(estadoInicial()), guardadoEn: 1e13 })
    expect(leerCopias(a).length).toBe(1) // el nuevo pasó a la 0 y el roto a la 1
  })
  it('sin lugar para los respaldos, el guardado principal igual queda', () => {
    const m = new Map<string, string>()
    const a: Almacen = { leer: (k) => m.get(k) ?? null, escribir: (k, t) => { if (k !== CLAVE) throw new Error('lleno'); m.set(k, t) } }
    guardar(a, partida(estadoInicial()))
    expect(cargar(a, 0)).toEqual(partida(estadoInicial()))
  })
})

describe('v1.0, bloque 10: el modo "En el óptimo" de antes', () => {
  it('pasa a "Apenas llegás" y el multiplicador arranca en ×10', () => {
    const p = partida(estadoInicial())
    const txt = serializar(p).replace(/"infinito":\{"modo":"llegar","log10":0,"mult":1\}/, '"infinito":{"modo":"optimo","log10":0}')
    expect(txt).toContain('"optimo"')
    const inf = deserializar(txt).estado.automat.infinito
    expect(inf.modo).toBe('llegar')
    expect(inf.mult).toBe(1)
  })
})
