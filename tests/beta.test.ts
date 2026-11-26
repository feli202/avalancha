// Capa 2, fase 1B: la marca de beta en el guardado, entrar y volver, y lo que el juego le pide al servicio (estados de la tarjeta).
import { describe, expect, it } from 'vitest'
import { estadoInicial, tick } from '../src/core'
import type { Almacen } from '../src/guardado/almacen'
import { COPIA_ANTES_BETA, entrarBeta, leerAntesDeBeta, volverDeBeta } from '../src/guardado/beta'
import { CLAVE, COPIA_BETA, cargar, deserializar, esBeta, guardar, leerCopias, serializar, type Partida } from '../src/guardado/guardado'
import { mailValido, normalizarCodigo, pedirBeta } from '../src/ui/servicioBeta'
import MITAD_CAPA1 from './fixtures/mitad_capa1.json?raw'

const partida = (extra: Partial<Partida> = {}): Partida => ({ estado: tick(estadoInicial(), 30), guardadoEn: 1.7e12, vistos: { guias: true }, record: 5, logros: {}, ...extra })
const memoria = () => {
  const m = new Map<string, string>()
  const a: Almacen = { leer: (k) => m.get(k) ?? null, escribir: (k, t) => void m.set(k, t) }
  return { a, m }
}
const MARCA = { codigo: 'ABCD2345', desde: 1.71e12 }

describe('marca de beta en la partida', () => {
  it('sin la marca el guardado no cambia: ni el campo aparece, y una partida real de antes no es beta', () => {
    expect(serializar(partida())).not.toContain('beta')
    expect(esBeta(partida())).toBe(false)
    expect(esBeta(deserializar(MITAD_CAPA1))).toBe(false)
    expect(deserializar(MITAD_CAPA1).beta).toBeUndefined()
  })

  it('ida y vuelta con la marca', () => {
    const p = deserializar(serializar(partida({ beta: MARCA })))
    expect(p.beta).toEqual(MARCA)
    expect(esBeta(p)).toBe(true)
  })

  it('una marca rota (editada a mano) se descarta sin invalidar la partida', () => {
    for (const beta of [{ codigo: 'abcd2345', desde: 1 }, { codigo: 'ABCD0123', desde: 1 }, { codigo: 'ABCD2345' }, 'si', { codigo: 'ABCD2345', desde: 'ayer' }]) {
      const texto = serializar(partida()).replace(/}$/, `,"beta":${JSON.stringify(beta)}}`)
      expect(esBeta(deserializar(texto))).toBe(false)
    }
  })
})

describe('entrar y volver de la beta', () => {
  it('entrar: respaldo "Antes de la beta" sin marca y la partida marcada con el código', () => {
    const { a, m } = memoria()
    entrarBeta(a, partida(), 'ABCD2345', 1.8e12)
    const antes = leerAntesDeBeta(a)!
    expect(esBeta(antes)).toBe(false)
    expect(antes.estado.tiempoTotal).toBe(30)
    const ahora = cargar(a, 0) as Partida
    expect(ahora.beta).toEqual({ codigo: 'ABCD2345', desde: 1.8e12 })
    expect(m.has(COPIA_ANTES_BETA)).toBe(true)
  })

  it('un código que no tiene la forma no marca nada', () => {
    const { a, m } = memoria()
    expect(() => entrarBeta(a, partida(), 'abc', 1)).toThrow()
    expect(m.size).toBe(0)
  })

  it('si el respaldo no se puede escribir, la partida no queda marcada', () => {
    const { a, m } = memoria()
    const lleno: Almacen = { leer: a.leer, escribir: (k, t) => { if (k === COPIA_ANTES_BETA) throw new Error('sin lugar'); a.escribir(k, t) } }
    expect(() => entrarBeta(lleno, partida(), 'ABCD2345', 1)).toThrow()
    expect(esBeta(deserializar(m.get(CLAVE)!))).toBe(false)
  })

  it('volver: la de antes con la fecha de ahora, y la beta queda en los respaldos', () => {
    const { a } = memoria()
    entrarBeta(a, partida(), 'ABCD2345', 1.8e12)
    guardar(a, { ...partida({ beta: MARCA }), estado: tick(estadoInicial(), 99) }) // jugó en la beta
    volverDeBeta(a, 1.9e12)
    const p = cargar(a, 0) as Partida
    expect(esBeta(p)).toBe(false)
    expect(p.guardadoEn).toBe(1.9e12) // sin "ausencia" por el tiempo en la beta
    expect(p.estado.tiempoTotal).toBe(30)
    const beta = leerCopias(a).find((c) => c.clave === COPIA_BETA)!
    expect(esBeta(beta.partida)).toBe(true)
    expect(beta.partida.estado.tiempoTotal).toBe(99)
  })

  it('volver sin partida de antes: tira y no toca nada', () => {
    const { a, m } = memoria()
    guardar(a, partida({ beta: MARCA }))
    const antes = m.get(CLAVE)
    expect(() => volverDeBeta(a, 1)).toThrow()
    expect(m.get(CLAVE)).toBe(antes)
  })
})

describe('lo que el juego le pide al servicio (estados de la tarjeta)', () => {
  const responde = (cuerpo: string, pedidos: RequestInit[] = []) =>
    (async (_u: unknown, init: RequestInit) => (pedidos.push(init), new Response(cuerpo))) as unknown as typeof fetch
  const URL_P = 'https://script.google.com/macros/s/X/exec'

  it('POST text/plain (sin preflight de CORS) con el JSON', async () => {
    const pedidos: RequestInit[] = []
    expect(await pedirBeta({ accion: 'verificar', codigo: 'ABCD2345' }, URL_P, responde('{"r":"ok"}', pedidos))).toBe('ok')
    expect(pedidos[0].method).toBe('POST')
    expect((pedidos[0].headers as Record<string, string>)['Content-Type']).toMatch(/^text\/plain/)
    expect(JSON.parse(pedidos[0].body as string)).toEqual({ accion: 'verificar', codigo: 'ABCD2345' })
  })

  it('cada respuesta del servicio da su estado', async () => {
    for (const r of ['ok', 'invalido', 'limite', 'error'] as const) expect(await pedirBeta({}, URL_P, responde(JSON.stringify({ r })))).toBe(r)
    expect(await pedirBeta({}, URL_P, responde('{"r":"raro"}'))).toBe('error')
    expect(await pedirBeta({}, URL_P, responde('<html>Google error</html>'))).toBe('error')
  })

  it('sin red: sinConexion; otro fallo: error; sin URL: error sin pedir nada', async () => {
    const sinRed = (async () => { throw new TypeError('Failed to fetch') }) as unknown as typeof fetch
    expect(await pedirBeta({}, URL_P, sinRed)).toBe('sinConexion')
    const corta = (async () => { throw new DOMException('timeout', 'TimeoutError') }) as unknown as typeof fetch
    expect(await pedirBeta({}, URL_P, corta)).toBe('error')
    const pedidos: RequestInit[] = []
    expect(await pedirBeta({}, '', responde('{"r":"ok"}', pedidos))).toBe('error')
    expect(pedidos).toHaveLength(0)
  })

  it('mail y código como los escribe la gente', () => {
    expect(mailValido('ana@mail.com')).toBe(true)
    for (const m of ['ana', 'ana@mail', 'a b@c.com', `${'x'.repeat(250)}@c.com`]) expect(mailValido(m)).toBe(false)
    expect(normalizarCodigo(' abcd-2345 ')).toBe('ABCD2345')
  })
})
