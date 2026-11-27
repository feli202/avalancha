// SPEC_CAPA1 §17: el bot de balance/sim_capa1.py jugando la Capa 1 entera con el núcleo real, hasta 1e308 Cristales totales.
// Lento (unos segundos acá, pero recorre horas de juego): no corre con `npm test`; correrlo con `npm run test:lento` al cerrar cada hito.
import { beforeAll, describe, expect, it } from 'vitest'
import {
  CFG1, DEFECTOS, finCapa1, puedeRomperEscarcha, puntoRuptura, romperEscarcha, INFINITO, abandonarDefecto, colorSinEfecto, comprarConMargen, comprarTodo,
  comprimir, completo, disponibles, elegirSola, enDefecto, enInfinito, entrarDefecto, equiparMejores, estadoInicial, fueraDeLinea, fusionAutomatica,
  fusionarTodo, infinito, inventarioLleno, memoria, metaLog10, puedeComprimir, puedeEntrar, tick, MUTACIONES,
  type DefectoId, type ItemId, type State,
} from '../src/core'
import { desgloseV } from '../src/ui/desglose'
import { esquirlas, tienda } from './bot'

const lento = import.meta.env.MODE !== 'lento'
const H = 3600

export interface Partida1 { eventos: Record<string, number>; hueco: number; t: number; s: State; final: State | null }

/** Port de simulate() hasta `hasta` (el fin de la 1.1 o el de la capa). Tiempos en segundos desde el primer Infinito. El humano revisa cada `revisa` s;
 * los autocompradores, la Compresión y el Infinito automáticos (en el óptimo) los hace tick(). Las reliquias las elige la regla
 * del panel de Automatización (Completar fusiones); el bot fusiona y engarza las mejores como haría una persona. */
export function jugar1(revisa = 15, tmax = 17 * H, hasta: 'fin11' | 'fin' = 'fin'): Partida1 {
  let s: State = { ...estadoInicial(), energia: INFINITO }
  s = elegirSola(infinito(s)) // el primer Infinito
  s = {
    ...s,
    automat: { ...s.automat, infinito: { modo: 'optimo', log10: 0, mult: 1 } },
    relicario: { ...s.relicario, regla: { ...s.relicario.regla, equipar: true } },
  }
  const eventos: Record<string, number> = {}
  const compras: number[] = []
  const marca = (k: string, t: number) => { if (!(k in eventos)) eventos[k] = t }
  let t = 0, proxima = 0
  let hist: [number, number][] = []
  let ganados = 0
  let antes = s, final: State | null = null // la corrida que llevó a 1e308 Cristales, antes de su Infinito (partes12 del sim)

  const entre = (x: State): State => { // lo que hace el bot entre dos corridas
    if (inventarioLleno(x)) marca('lleno', t) // fusionando siempre, el inventario no debería llenarse nunca
    if (x.relicario.pendiente) x = elegirSola(x)
    if (!fusionAutomatica(x)) x = equiparMejores(fusionarTodo(x))
    x = tienda(x, t, compras)
    x = esquirlas(x, t, compras)
    if (memoria(x) >= 4) marca('memoria', t)
    if (x.red.ruptura >= 1) marca('romper', t)
    if (x.estratos.abiertos >= 1) marca('estratos', t)
    for (const d of x.defectos.completos) marca(d, t)
    if (x.defectos.completos.length > ganados) { ganados = x.defectos.completos.length; compras.push(t) } // ganar un Defecto cuenta como progreso (C12)
    if (x.estratos.s[7] >= CFG1.estratos.meta_1_1_estrato8_log10 && completo(x, 'impureza')) marca('fin11', t)
    if (finCapa1(x) && !('fin' in eventos)) { marca('fin', t); final = antes }
    const ctot = Math.max(0, x.cristalesTotales.log10())
    const d = DEFECTOS.find((d) => puedeEntrar(x, d) && !((x.defectos.reintento[d] ?? -Infinity) > ctot))
    if (d) x = entrarDefecto(x, d)
    proxima = t
    hist = []
    return x
  }
  s = entre(s)
  const basicos = (x: State) => disponibles(x).filter((id) => (id === 'caudal' || id.startsWith('color')) && !colorSinEfecto(x, Number(id.slice(5))))
  const muts = MUTACIONES.map((m): ItemId => `mut_${m}`)

  while (t < tmax && !(hasta in eventos)) {
    const dt = s.tiempoCorrida < 30 ? 0.5 : s.tiempoCorrida < 300 ? 1 : 2
    const inf0 = s.infinitos
    antes = s
    s = tick(s, dt)
    t += dt
    if (s.infinitos !== inf0) {
      if (s.infinitos === 2) marca('segundo', t)
      s = entre(s)
      continue
    }
    if (t >= proxima) {
      proxima = t + revisa
      s = comprarTodo(s, basicos(s))
      s = comprarConMargen(s, ['cascada'], Infinity)
      s = comprarConMargen(s, muts, Infinity)
      if (puedeComprimir(s)) s = comprimir(s)
      if (puedeRomperEscarcha(s)) s = romperEscarcha(s) // sin Deshielo, a mano al llegar al Punto de ruptura (con Deshielo ya la rompió tick)
      if (enInfinito(s) && !enDefecto(s) && memoria(s) < 4) {
        antes = s
        s = infinito(s)
        if (s.infinitos === 2) marca('segundo', t)
        s = entre(s)
        continue
      }
    }
    if (enDefecto(s)) { // desde los 10 min: si al ritmo de los últimos 3 min la meta queda a más de 30 min, abandona
      const D = CFG1.defectos, e = s.maxEnergia.log10()
      hist.push([t, e])
      while (hist.length > 1 && hist[1][0] <= t - D.abandono_ventana_min * 60) hist.shift()
      if (s.tiempoInfinito >= D.abandono_revisar_min * 60) {
        const ritmo = (e - hist[0][1]) / Math.max(1e-9, (t - hist[0][0]) / 60)
        const falta = metaLog10(s.defectos.actual as DefectoId) - e
        if (ritmo <= 0 || falta / ritmo > D.abandono_meta_max_min || s.tiempoInfinito >= D.abandono_min * 60) s = entre(abandonarDefecto(s))
      }
    }
  }
  const ts = compras.filter((x) => x > 1.5 * H)
  const hueco = ts.slice(1).reduce((m, x, i) => Math.max(m, x - ts[i]), 0)
  return { eventos, hueco, t, s, final }
}

// SPEC_CAPA1 §2 (revisa cada 15 s), en horas.
const TABLA: [string, number][] = [
  ['segundo', 0.89], ['memoria', 2.56], ['romper', 1.39], ['estratos', 1.89], ['vacancia', 2.60],
  ['dislocacion', 3.99], ['macla', 4.65], ['impureza', 5.92], ['fin11', 7.39],
  ['fatiga', 10.40], ['frontera', 12.66], ['inclusion', 13.33], ['vidrio', 13.94], ['fin', 14.94],
]

/** Peso de cada fuente de log10 V (las que suman), como la pestaña Valor de Estadísticas. La Escarcha va de 1 al Punto de
 * ruptura y el Infinito óptimo cae justo cuando se rompe (ahí baja la producción): se mide a mitad de su ciclo (P / 2). */
function pesos(s: State): Record<string, number> {
  if (s.escarcha.abierta) s = { ...s, escarcha: { ...s.escarcha, logX: puntoRuptura(s) / 2 } }
  const f = desgloseV(s).filter((x) => x.log > 0), tot = f.reduce((a, x) => a + x.log, 0)
  return Object.fromEntries(f.map((x) => [x.id, x.log / tot]))
}

describe.skipIf(lento)('balance de la Capa 1: núcleo real, revisa cada 15 s (lento)', () => {
  let p: Partida1
  beforeAll(() => {
    p = jugar1(15)
    console.log(TABLA.map(([k, h]) => `${k} ${((p.eventos[k] ?? NaN) / H).toFixed(2)} h (sim ${h})`).join(' | ') +
      ` | hueco máximo ${(p.hueco / 60).toFixed(1)} min` +
      (p.final ? ' | log V: ' + Object.entries(pesos(p.final)).map(([k, x]) => `${k} ${(100 * x).toFixed(0)} %`).join(' ') : ''))
  }, 30 * 60_000)

  for (const [k, h] of TABLA)
    it(`${k} a ±10 % de ${h} h`, () => expect(Math.abs(p.eventos[k] / H / h - 1)).toBeLessThanOrEqual(0.1))
  it('fin de la capa (1e308 Cristales totales) entre 14 y 16 h', () => {
    expect(p.eventos.fin / H).toBeGreaterThanOrEqual(14)
    expect(p.eventos.fin / H).toBeLessThanOrEqual(16)
  })
  it('al final de la 1.2 ninguna fuente de log V pasa del 65 %', () =>
    expect(Math.max(...Object.values(pesos(p.final!)))).toBeLessThanOrEqual(0.65))
  it('jugando y fusionando, el inventario nunca se llena', () => expect(p.eventos.lleno).toBeUndefined())
  it('Estratos nunca antes que Romper', () => expect(p.eventos.estratos).toBeGreaterThanOrEqual(p.eventos.romper))
  it('hueco máximo entre compras de la Capa 1 (desde 1,5 h) < 40 min', () => expect(p.hueco).toBeLessThan(40 * 60))
})

describe.skipIf(lento)('fuera de línea (lento): 12 h ausente rinden menos que 12 h jugando (cuentan 2 h a ×0,1)', () => {
  it('Cristales totales y estratos', () => {
    let base = jugar1(15, 4 * H, 'fin11').s // con el Infinito roto y el Infinito automático en el óptimo
    if (enDefecto(base)) base = abandonarDefecto(base)
    let activo = base
    for (let i = 0; i < 12 * H; i++) activo = tick(activo, 1)
    const afuera = fueraDeLinea(base, 12 * H).s
    expect(afuera.cristalesTotales.lt(activo.cristalesTotales)).toBe(true)
    expect(afuera.estratos.s[0]).toBeLessThan(activo.estratos.s[0])
  }, 30 * 60_000)
})
