// Hito 5a: progreso fuera de línea y guardado, con el núcleo real.
import { describe, expect, it } from 'vitest'
import { CFG, comprarTodo, disponibles, estadoInicial, fueraDeLinea, tick, type State } from '../src/core'
import type { Almacen } from '../src/guardado/almacen'
import { CLAVE, RESPALDO, cargar, deserializar, guardar, serializar, type Partida } from '../src/guardado/guardado'

const partida = (estado: State): Partida => ({ estado, guardadoEn: 1.7e12, vistos: { tienda: true }, record: 12345 })

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

  // 8 h son 10.000 pasos de 2,88 s contra 28.800 de 1 s. Sin Compresión automática la Energía coincide al ±1 %.
  // Con ella (desde la 6) las compresiones se atrasan ~0,4 % en tiempo y, como después de cada una la Energía sube
  // ~2 décadas por hora, eso es hasta ~35 % de Energía: ahí el ±1 % se mide en log10, la escala del juego.
  for (const c of [0, 3, CFG.autocompradores.compresion_auto]) {
    const lineal = c < CFG.autocompradores.compresion_auto
    it(`8 h fuera de línea = 8 h de tick normal (±1 %${lineal ? '' : ' en log10'}), desde la Compresión ${c}`, () => {
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
      const error = lineal
        ? [a.s.energia.div(normal.energia).toNumber() - 1, a.s.granos / normal.granos - 1]
        : [a.s.energia.log10() / normal.energia.log10() - 1, Math.log10(a.s.granos) / Math.log10(normal.granos) - 1]
      for (const e of error) expect(Math.abs(e)).toBeLessThanOrEqual(0.01)
      expect(a.s.tiempoTotal).toBeCloseTo(normal.tiempoTotal, 6)
    })
  }

  it('hasta 10.000 s usa pasos de 1 s: idéntico al tick normal', () => {
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

  it('sin guardado: null', () => expect(cargar(memoria().a)).toBeNull())

  it('guardar y cargar por el almacén', () => {
    const { a } = memoria()
    const p = partida(jugar(estadoInicial(), 60))
    guardar(a, p)
    expect(cargar(a)).toEqual(p)
  })

  const bueno = serializar(partida(jugar(estadoInicial(), 60)))
  const rotos = {
    'no es JSON': 'hola',
    vacío: '',
    'JSON cortado': bueno.slice(0, bueno.length / 2),
    'otra cosa': '{"version":1}',
    null: 'null',
    'versión del futuro': bueno.replace('"version":1', '"version":99'),
    'un campo con otro tipo': bueno.replace(/"caudal":\d+/, '"caudal":"mucho"'),
    'falta un campo': bueno.replace(/"granos":[^,]+,/, ''),
    'un número que no es número': bueno.replace(/"granos":[^,]+,/, '"granos":null,'),
  }
  for (const [nombre, texto] of Object.entries(rotos)) {
    it(`un guardado corrupto (${nombre}) no rompe nada y queda de respaldo`, () => {
      const { a, m } = memoria({ [CLAVE]: texto })
      expect(cargar(a)).toBe('corrupto')
      expect(m.get(RESPALDO)).toBe(texto)
      expect(m.get(CLAVE)).toBe(texto) // cargar no pisa el guardado
      // Empezar de nuevo: el guardado nuevo no borra el respaldo.
      guardar(a, partida(estadoInicial()))
      expect(m.get(RESPALDO)).toBe(texto)
      expect(cargar(a)).toEqual(partida(estadoInicial()))
    })
  }
})
