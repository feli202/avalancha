// Capa 2, migración (docs/capa2/migracion.md): tope duro de Cristales en 1e308 y partidas que lo pasaron.
import Decimal from 'break_infinity.js'
import { describe, expect, it } from 'vitest'
import REAL from '../docs/capa2/partidas/mi_partida_fin_capa1.txt?raw'
import MITAD_CAPA1 from './fixtures/mitad_capa1.json?raw'
import {
  INFINITO, campoInvalido, comprarRed, estadoInicial, finCapa1, gastado, infinito, mejorarEstrato, tick, topeCristales, toparCristales,
  type State,
} from '../src/core'
import type { Almacen } from '../src/guardado/almacen'
import { CLAVE, COPIA_TOPE, cargar, deserializar, exportar, importar, leerCopias, serializar } from '../src/guardado/guardado'

const memoria = (inicial: Record<string, string> = {}) => {
  const m = new Map(Object.entries(inicial))
  const a: Almacen = { leer: (k) => m.get(k) ?? null, escribir: (k, t) => void m.set(k, t) }
  return { a, m }
}
const jsonDe = (base64: string) => new TextDecoder().decode(Uint8Array.from(atob(base64.replace(/\s/g, '')), (c) => c.charCodeAt(0)))
const conEstado = (texto: string, cambio: (e: any) => void) => { const d = JSON.parse(texto); cambio(d.estado); return JSON.stringify(d) }

describe('el tope', () => {
  it('es mayor o igual al umbral del fin de la Capa 1 (si no, el fin no llega nunca: el bug del 99 %)', () => {
    expect(topeCristales(estadoInicial()).gte(INFINITO)).toBe(true)
  })
  it('un Infinito que lo pasaría deja los Cristales en el tope, y el fin de la Capa 1 llega', () => {
    const real = importar(REAL).estado
    const s = infinito({ ...real, cristales: INFINITO.div(10), cristalesTotales: INFINITO.div(10) })
    expect(s.infinitos).toBe(real.infinitos + 1)
    expect(s.cristales.eq(topeCristales(s))).toBe(true)
    expect(s.cristalesTotales.eq(topeCristales(s))).toBe(true)
    expect(finCapa1(s)).toBe(true)
  })
})

describe('mi partida real de fin de la Capa 1 (1,4e1672 Cristales)', () => {
  const crudo = JSON.parse(jsonDe(REAL)).estado
  const p = importar(REAL)
  const s = p.estado
  it('queda en el tope y lo gastado entra en él', () => {
    expect(p.tope).toBeDefined()
    expect(s.cristales.eq(INFINITO)).toBe(true)
    expect(s.cristalesTotales.eq(INFINITO)).toBe(true)
    expect(gastado(s).lte(INFINITO)).toBe(true)
    expect(finCapa1(s)).toBe(true)
    expect(campoInvalido(s)).toBe('')
  })
  it('solo baja niveles (nada sube, nada más cambia)', () => {
    for (const k of Object.keys(crudo.red)) expect(s.red[k]).toBeLessThanOrEqual(crudo.red[k])
    for (const q of ['perm', 'pres'] as const) s.estratos[q].forEach((n, k) => expect(n).toBeLessThanOrEqual(crudo.estratos[q][k]))
    expect(s.estratos.abiertos).toBeLessThanOrEqual(crudo.estratos.abiertos)
    expect(s.infinitos).toBe(crudo.infinitos)
    expect(s.escarcha.esquirlas).toBe(crudo.escarcha.esquirlas)
    expect(s.defectos.completos).toEqual(crudo.defectos.completos)
  })
  it('devuelve compras y las anota', () => {
    console.log('devueltas:', p.tope!.join(', '))
    expect(p.tope!.length).toBeGreaterThan(0)
  })
  it('su Infinito automático ×10 no se dispara en el tope (no hay Cristales que multiplicar)', () => {
    expect(s.automat.infinito.modo).toBe('multiplicar')
    let t: State = s
    for (let i = 0; i < 20 * 30; i++) t = tick(t, 0.05)
    expect(t.infinitos).toBe(s.infinitos)
  })
  it('sigue andando: Infinitos automáticos, compras y autocompradores, sin pasar el tope', () => {
    let t: State = { ...s, automat: { ...s.automat, infinito: { ...s.automat.infinito, modo: 'llegar' } } }
    for (let i = 0; i < 20 * 120; i++) t = tick(t, 0.05)
    expect(t.infinitos).toBeGreaterThan(s.infinitos)
    expect(t.cristales.lte(INFINITO)).toBe(true)
    expect(t.cristalesTotales.eq(INFINITO)).toBe(true)
    expect(campoInvalido(t)).toBe('')
    // los autocompradores (con el Infinito automático apagado: si no, en el tope cada Infinito ×10 ya se cumple y la Arena
    // se reinicia antes del primer segundo de autocompra)
    let u: State = { ...s, caudal: 0, auto: { ...s.auto, infinito: false } }
    for (let i = 0; i < 20 * 10; i++) u = tick(u, 0.05)
    expect(u.automat.segundos).toBe(s.automat.segundos + 10)
    expect(u.caudal).toBeGreaterThan(0)
    // con los Cristales del tope se vuelve a comprar algo de lo devuelto, y no se pasa de lo que hay
    const compras = [...Object.keys(t.red).map((id) => comprarRed(t, id)),
      ...[0, 1, 2, 3, 4, 5, 6, 7].flatMap((k) => [mejorarEstrato(t, 'perm', k), mejorarEstrato(t, 'pres', k)])].filter((c) => c !== t)
    expect(compras.length).toBeGreaterThan(0)
    for (const c of compras) expect(c.cristales.gte(0) && gastado(c).lte(INFINITO)).toBe(true)
  })
  it('una ya migrada no migra dos veces', () => {
    const otra = deserializar(serializar(p))
    expect(otra.tope).toBeUndefined()
    expect(otra.estado).toEqual(s)
  })
  it('al cargar: respaldo de la original en los respaldos, una sola vez', () => {
    const texto = jsonDe(REAL)
    const { a, m } = memoria({ [CLAVE]: texto })
    const cargada = cargar(a, 0)
    expect(cargada !== null && cargada !== 'corrupto' && cargada.tope).toBeTruthy()
    expect(m.get(COPIA_TOPE)).toBe(texto)
    expect(leerCopias(a).map((c) => c.clave)).toContain(COPIA_TOPE)
    // la original se carga otra vez (recuperar ese respaldo, o no se llegó a guardar): el respaldo no se pisa
    m.set(CLAVE, serializar({ ...p, guardadoEn: 1 }))
    expect((cargar(a, 0) as any).tope).toBeUndefined()
    m.set(CLAVE, conEstado(texto, (e) => (e.cristales = [9, 2000])))
    cargar(a, 0)
    expect(m.get(COPIA_TOPE)).toBe(texto)
  })
})

describe('partidas que no llegaron al tope no se tocan', () => {
  it('mitad de la Capa 1', () => {
    const p = deserializar(MITAD_CAPA1)
    const e = JSON.parse(MITAD_CAPA1).estado
    expect(p.tope).toBeUndefined()
    expect(p.estado.red).toEqual(e.red)
    expect(p.estado.estratos).toEqual(e.estratos)
    expect(p.estado.cristales.eq(Decimal.fromMantissaExponent(e.cristales[0], e.cristales[1]))).toBe(true)
    const { a, m } = memoria({ [CLAVE]: MITAD_CAPA1 })
    cargar(a, 0)
    expect(m.has(COPIA_TOPE)).toBe(false)
  })
  it('justo en el tope, tampoco', () => {
    const s = { ...estadoInicial(), cristales: INFINITO, cristalesTotales: INFINITO }
    expect(toparCristales(s).estado).toBe(s)
  })
})

describe('valores rotos', () => {
  it('1e400 Cristales: al tope', () => {
    const p = deserializar(conEstado(MITAD_CAPA1, (e) => { e.cristales = [1, 400]; e.cristalesTotales = [1, 400] }))
    expect(p.estado.cristales.eq(INFINITO)).toBe(true)
    expect(p.tope).toEqual([]) // lo gastado de la mitad de la Capa 1 entra de sobra
  })
  it('un nivel absurdo (1e9) se devuelve sin recorrerlo de a uno', () => {
    const p = deserializar(conEstado(MITAD_CAPA1, (e) => { e.cristales = [1, 400]; e.estratos.perm[0] = 1e9 }))
    expect(p.estado.estratos.perm[0]).toBeLessThan(40)
    expect(gastado(p.estado).lte(INFINITO)).toBe(true)
  })
  it('NaN o Infinity: guardado inválido, el original queda y no se escribe respaldo del tope', () => {
    for (const malo of ['[null, 400]', '["NaN", 400]', '[1, 1e400]']) {
      const texto = MITAD_CAPA1.replace(/"cristales":\[[^\]]*\]/, `"cristales":${malo}`)
      const { a, m } = memoria({ [CLAVE]: texto })
      expect(cargar(a, 0)).toBe('corrupto')
      expect(m.get(CLAVE)).toBe(texto)
      expect(m.has(COPIA_TOPE)).toBe(false)
    }
  })
  it('exportar e importar la migrada da lo mismo', () => {
    const p = importar(REAL)
    expect(importar(exportar(p)).estado).toEqual(p.estado)
  })
})
