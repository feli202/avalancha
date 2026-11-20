// Pase de partida itch.io → GitHub Pages por el hash de la URL (src/guardado/pase.ts).
import Decimal from 'break_infinity.js'
import { describe, expect, it } from 'vitest'
import { INFINITO, estadoInicial, infinito, tick } from '../src/core'
import type { Almacen } from '../src/guardado/almacen'
import { CLAVE, VERSION, guardar, serializar, type Partida } from '../src/guardado/guardado'
import {
  FalloPase, RESPALDO_PASE, codificarPase, decodificarPase, leerRespaldoPase, paseDeHash, reemplazarConRespaldo, restaurarRespaldo, urlConPase,
} from '../src/guardado/pase'

const partida = (estado = estadoInicial(), extra: Partial<Partida> = {}): Partida => ({ estado, guardadoEn: 1_700_000_000_000, vistos: { guias: true }, record: 12, logros: { granos: true }, ...extra })
const conCristales = () => partida({ ...infinito({ ...tick(estadoInicial(), 60), energia: INFINITO }), cristalesTotales: new Decimal('3.3e142') })
const memoria = (inicial: Record<string, string> = {}) => {
  const m = new Map(Object.entries(inicial))
  const a: Almacen = { leer: (k) => m.get(k) ?? null, escribir: (k, t) => void m.set(k, t) }
  return { a, m }
}
const motivo = (p: Promise<unknown>) => p.then(() => 'ok', (e) => (e instanceof FalloPase ? e.motivo : `otro: ${e}`))
/** Arma un código con un JSON cualquiera (para probar versiones y partidas inválidas con checksum correcto). */
async function codigoDe(json: string, version = VERSION) {
  const bytes = new Uint8Array(await new Response(new Blob([new TextEncoder().encode(json)]).stream().pipeThrough(new CompressionStream('deflate-raw'))).arrayBuffer())
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  let h = 0x811c9dc5
  for (const b of new TextEncoder().encode(json)) h = Math.imul(h ^ b, 0x01000193)
  return `A${version}-${(h >>> 0).toString(16).padStart(8, '0')}-${btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}`
}

describe('pase de partida por URL', () => {
  it('ida y vuelta: codificar → URL → hash → decodificar da la misma partida', async () => {
    const p = conCristales()
    const url = urlConPase('https://feli202.github.io/avalancha/', await codificarPase(p))!
    expect(url.startsWith('https://feli202.github.io/avalancha/#import=A')).toBe(true)
    const u = new URL(url)
    expect(u.search).toBe('') // nunca en la query: el hash no viaja al servidor
    const vuelta = await decodificarPase(paseDeHash(u.hash)!)
    expect(serializar(vuelta)).toBe(serializar(p))
    expect(vuelta.estado.cristalesTotales.eq(p.estado.cristalesTotales)).toBe(true)
  })

  it('el código solo usa caracteres seguros en una URL y comprime', async () => {
    const p = conCristales()
    const c = await codificarPase(p)
    expect(c).toMatch(/^A\d+-[0-9a-f]{8}-[A-Za-z0-9_-]+$/)
    expect(c.length).toBeLessThan(serializar(p).length)
  })

  it('un hash que no es un pase no se toma', () => {
    expect(paseDeHash('')).toBeNull()
    expect(paseDeHash('#otra=1')).toBeNull()
    expect(paseDeHash('#import=')).toBeNull()
  })

  it('demasiado largo para una URL: null (se usa exportar/importar a mano)', () => {
    expect(urlConPase('https://x/', 'A3-00000000-' + 'a'.repeat(70_000))).toBeNull()
  })

  it('código roto, cortado o alterado: corrupto o formato, nunca una partida', async () => {
    const c = await codificarPase(conCristales())
    expect(await motivo(decodificarPase('hola'))).toBe('formato')
    expect(await motivo(decodificarPase(c.slice(0, c.length - 40)))).toBe('corrupto')
    const i = c.length - 30
    const cambiado = c.slice(0, i) + (c[i] === 'A' ? 'B' : 'A') + c.slice(i + 1)
    expect(await motivo(decodificarPase(cambiado))).toBe('corrupto')
    expect(await motivo(decodificarPase(c.replace(/-[0-9a-f]{8}-/, '-00000000-')))).toBe('corrupto')
  })

  it('checksum bien pero no es una partida: invalida', async () => {
    expect(await motivo(decodificarPase(await codigoDe('{"version":3,"hola":1}')))).toBe('invalida')
    expect(await motivo(decodificarPase(await codigoDe('no es json')))).toBe('corrupto')
  })

  it('partida de una versión más nueva que el juego: nueva (por el prefijo o por el JSON)', async () => {
    const json = serializar(partida())
    expect(await motivo(decodificarPase(await codigoDe(json, VERSION + 1)))).toBe('nueva')
    expect(await motivo(decodificarPase(await codigoDe(json.replace(`"version":${VERSION}`, `"version":${VERSION + 1}`))))).toBe('nueva')
  })

  it('una partida vieja (versión 2, Capa 0) se migra', async () => {
    const d = JSON.parse(serializar(partida(tick(estadoInicial(), 30))))
    d.version = 2
    const p = await decodificarPase(await codigoDe(JSON.stringify(d), 2))
    expect(p.estado.tiempoTotal).toBe(30)
  })
})

describe('nunca se pisa una partida sin confirmar', () => {
  it('decodificar no toca el almacenamiento', async () => {
    const { a, m } = memoria()
    guardar(a, partida(tick(estadoInicial(), 100)))
    const antes = new Map(m)
    await decodificarPase(await codificarPase(conCristales()))
    expect(m).toEqual(antes)
  })

  it('reemplazar guarda primero la partida que había, y se puede volver a ella (y deshacer)', async () => {
    const { a, m } = memoria()
    const vieja = partida(tick(estadoInicial(), 100))
    guardar(a, vieja)
    const textoViejo = m.get(CLAVE)!
    const nueva = await decodificarPase(await codificarPase(conCristales()))
    reemplazarConRespaldo(a, nueva)
    expect(m.get(RESPALDO_PASE)).toBe(textoViejo)
    expect(m.get(CLAVE)).toBe(serializar(nueva))
    expect(serializar(leerRespaldoPase(a)!)).toBe(textoViejo)
    restaurarRespaldo(a)
    expect(m.get(CLAVE)).toBe(textoViejo)
    expect(m.get(RESPALDO_PASE)).toBe(serializar(nueva))
  })

  it('sin partida previa no deja respaldo', () => {
    const { a, m } = memoria()
    reemplazarConRespaldo(a, partida())
    expect(m.has(RESPALDO_PASE)).toBe(false)
    expect(leerRespaldoPase(a)).toBeNull()
  })

  it('si el respaldo no se puede escribir, la partida que había queda intacta', () => {
    const { a, m } = memoria()
    guardar(a, partida(tick(estadoInicial(), 100)))
    const antes = m.get(CLAVE)
    const lleno: Almacen = { leer: a.leer, escribir: (k, t) => { if (k === RESPALDO_PASE) throw new Error('lleno'); a.escribir(k, t) } }
    expect(() => reemplazarConRespaldo(lleno, partida())).toThrow()
    expect(m.get(CLAVE)).toBe(antes)
  })
})
