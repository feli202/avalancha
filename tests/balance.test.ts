// SPEC.md sección 10: el bot de balance/sim.py jugando con el núcleo real.
import { beforeAll, describe, expect, it } from 'vitest'
import {
  CFG, aplicar, comprar, comprimir, costo, disponibles, estadoInicial, produccion, puedeComprimir, tick,
  enInfinito, type ItemId,
} from '../src/core'

interface Partida { infinito: number; compresiones: number[]; primeraMutacion: number; corridas: number[] }

/** Port de play() de sim.py. Tiempos en minutos. El "humano" revisa cada `revisaCada` segundos y compra
 *  lo de mejor retorno; los autocompradores y la Compresión automática los hace tick(). */
function jugar(revisaCada: number, tmax = 30 * 3600): Partida {
  let s = estadoInicial()
  let t = 0
  let proxima = 0
  let primeraMutacion = Infinity
  const comps: number[] = []
  const fin = (infinito: number): Partida => {
    const bordes = [0, ...comps, infinito]
    return {
      infinito: infinito / 60,
      primeraMutacion: primeraMutacion / 60,
      compresiones: comps.map((c) => c / 60),
      corridas: bordes.slice(1).map((b, i) => (b - bordes[i]) / 60),
    }
  }
  while (t < tmax) {
    const dt = s.tiempoCorrida < 300 ? 0.2 : 1 // mismo paso que sim.py
    const antes = s.compresiones
    s = tick(s, dt)
    t += dt
    if (enInfinito(s)) return fin(t)
    if (s.compresiones > antes) comps.push(t)
    if (t < proxima) continue
    proxima = t + revisaCada
    for (;;) {
      const r0 = produccion(s).log10()
      let mejor: { pago: number; id: ItemId } | null = null
      for (const id of disponibles(s)) {
        const c = costo(s, id)
        if (c.gt(s.energia)) continue
        let dl = produccion(aplicar(s, id)).log10() - r0
        if (id === 'caudal') dl *= 2 // más caudal también hace crecer la pila: vale ~doble
        if (!(dl > 1e-12)) continue
        const pago = 10 ** (c.log10() - r0) / (10 ** dl - 1)
        if (!mejor || pago < mejor.pago) mejor = { pago, id }
      }
      if (!mejor) break
      if (mejor.id.startsWith('mut_')) primeraMutacion = Math.min(primeraMutacion, t)
      s = comprar(s, mejor.id)
    }
    if (puedeComprimir(s)) {
      s = comprimir(s)
      comps.push(t)
    }
  }
  return fin(Infinity)
}

describe('balance: jugador atento (revisa cada 15 s, con autocompradores)', () => {
  let p: Partida
  beforeAll(() => {
    p = jugar(15)
    const f = (x: number) => x.toFixed(1)
    console.log(
      `revisa cada 15 s: Infinito a los ${f(p.infinito)} min | ${p.compresiones.length} compresiones | ` +
        `primera Mutación ${f(p.primeraMutacion)} min | corridas [${p.corridas.map(f).join(', ')}]`,
    )
  })

  it('primera Compresión entre 13 y 17 min', () => {
    expect(p.compresiones[0]).toBeGreaterThanOrEqual(13)
    expect(p.compresiones[0]).toBeLessThanOrEqual(17)
  })
  it('17 compresiones en total', () => expect(p.compresiones.length).toBe(17))
  it('primera Mutación entre 110 y 130 min', () => {
    expect(p.primeraMutacion).toBeGreaterThanOrEqual(110)
    expect(p.primeraMutacion).toBeLessThanOrEqual(130)
  })
  it('Infinito entre 180 y 210 min', () => {
    expect(p.infinito).toBeGreaterThanOrEqual(180)
    expect(p.infinito).toBeLessThanOrEqual(210)
  })
  it('ninguna corrida de más de 16 min', () => expect(Math.max(...p.corridas)).toBeLessThanOrEqual(16))
  it('Infinito a ±5 % del objetivo de config.json', () => {
    const objetivo = CFG.objetivo_minutos.jugador_activo_revisa_cada_15s
    expect(Math.abs(p.infinito / objetivo - 1)).toBeLessThanOrEqual(0.05)
  })
})
