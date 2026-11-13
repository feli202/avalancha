// Hito 5a: progreso fuera de línea y guardado, con el núcleo real.
import { describe, expect, it } from 'vitest'
import { CFG, comprar, comprarTodo, comprimir, disponibles, estadoInicial, fueraDeLinea, tick, type State } from '../src/core'
import type { Almacen } from '../src/guardado/almacen'
import {
  CLAVE, RESPALDO, VERSION, cargar, deserializar, exportar, guardar, importar, serializar, type Partida,
} from '../src/guardado/guardado'

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
    it(`8 h fuera de línea = 8 h de tick normal (±1 %), desde la Compresión ${c}`, () => {
      let normal = desde(c)
      for (let i = 0; i < HORAS8; i++) normal = tick(normal, 1)
      const a = fueraDeLinea(desde(c), HORAS8)
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
    })
  }

  it('hasta max_pasos usa pasos de 1 s: idéntico al tick normal', () => {
    let normal = desde(3)
    for (let i = 0; i < 5000; i++) normal = tick(normal, 1)
    expect(serializar(partida(fueraDeLinea(desde(3), 5000).s))).toBe(serializar(partida(normal)))
  })

  it('tope de 24 h', () => {
    const tope = CFG.fuera_de_linea.tope_horas * 3600
    const a = fueraDeLinea(desde(3), 10 * tope)
    expect(a.segundos).toBe(tope)
    expect(a.s.tiempoTotal).toBeCloseTo(tope, 6)
  })

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
