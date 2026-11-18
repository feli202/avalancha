import Decimal from 'break_infinity.js'
import { describe, expect, it } from 'vitest'
import {
  CFG, CFG1, aguanteEscarcha, autoActivo, brilloEscarcha, costoMejoraEscarcha, crecerEscarcha, crecimientoEscarcha, densidad,
  INFINITO, estadoInicial, fueraDeLinea, infinito, mejorarEscarcha, produccion, puedeRomperEscarcha, romperEscarcha, tick, type State,
} from '../src/core'
import { deserializar, serializar } from '../src/guardado/guardado'
// Lo escribe `python balance/ref_escarcha.py` con el bloque de escarcha de play_arena y Player.esc_params de sim_capa1.py.
import SIM from './fixtures/escarcha_sim.json'

const sinAutos = Object.fromEntries(Object.keys(CFG.autocompradores).map((k) => [k, false]))
const con = (c: (typeof SIM)[number]): State => {
  const s = estadoInicial()
  return {
    ...s, auto: { ...sinAutos, escarcha: true }, red: { ...s.red, ...(c.red as unknown as Record<string, number>) },
    estratos: { ...s.estratos, abiertos: c.abiertos, s: c.s0 },
    escarcha: { ...s.escarcha, abierta: true, logX: c.logX0, mejoras: { ...s.escarcha.mejoras, ...(c.mejoras as unknown as State["escarcha"]["mejoras"]) } },
    defectos: { ...s.defectos, completos: c.done }, cristalesTotales: Decimal.pow10(c.Ctot), cristales: Decimal.pow10(c.Ctot),
  }
}

describe('Escarcha', () => {
  for (const c of SIM)
    it(`igual que sim_capa1.py tras 1 h con el mismo estado: ${c.nombre} (logX, Esquirlas, g, H, m)`, () => {
      let s = con(c)
      expect(crecimientoEscarcha(s)).toBeCloseTo(c.g, 12)
      expect(aguanteEscarcha(s)).toBeCloseTo(c.H, 9)
      expect(brilloEscarcha(s)).toBeCloseTo(c.m, 12)
      // Los mismos pasos que play_arena (0,5 / 1 / 2 s) y el jugador que revisa cada 15 s: rompe a mano en la primera
      // revisión con 30 min cumplidos; con Deshielo, sola apenas se puede (en el juego lo hace tick).
      let t = 0, revision = 0, rupturas = 0
      while (t < c.segundos) {
        const dt = t < 30 ? 0.5 : t < 300 ? 1 : 2
        t += dt
        s = { ...s, escarcha: crecerEscarcha(s, dt) }
        const aMano = t >= revision
        if (aMano) revision = t + c.check
        if ((aMano || autoActivo(s, 'escarcha')) && puedeRomperEscarcha(s)) (s = romperEscarcha(s)), rupturas++
      }
      expect(s.escarcha.logX).toBeCloseTo(c.logX, 9)
      expect(s.escarcha.esquirlas).toBe(c.esquirlas)
      expect(rupturas).toBe(c.rupturas)
    })

  const abierta = (logX: number, extra: Partial<State> = {}): State => {
    const s = estadoInicial()
    return { ...s, auto: sinAutos, granos: 1e6, colores: [40, 20, 10, 5], ...extra, escarcha: { ...s.escarcha, abierta: true, logX } }
  }

  it('la producción gana D × m × logX y pierde log10(1 + logX / H)', () => {
    const sin = abierta(0), conX = abierta(80)
    const dif = produccion(conX).log10() - produccion(sin).log10()
    expect(dif).toBeCloseTo(densidad(sin) * brilloEscarcha(conX) * 80 - Math.log10(1 + 80 / aguanteEscarcha(conX)), 6)
  })

  it('tick la hace crecer g × dt; no corre en el Defecto Vidrio ni antes de abrirse', () => {
    const s = abierta(10)
    expect(tick(s, 2).escarcha.logX).toBeCloseTo(10 + 2 * crecimientoEscarcha(s), 12)
    const vidrio = { ...s, defectos: { ...s.defectos, actual: 'vidrio' } }
    expect(tick(vidrio, 2).escarcha).toEqual(vidrio.escarcha)
    expect(produccion(vidrio).log10()).toBeCloseTo(produccion(abierta(0)).log10(), 9) // ni suma ni frena
    const cerrada = { ...s, escarcha: { ...s.escarcha, abierta: false } }
    // Persiste en el Infinito (§13).
    expect(infinito({ ...s, energia: INFINITO }).escarcha).toEqual(s.escarcha)
    expect(tick(cerrada, 2).escarcha.logX).toBe(10)
  })

  it('se abre con el Estrato 8 lleno y los 4 primeros Defectos, y queda abierta', () => {
    const s = estadoInicial()
    const casi: State = {
      ...s, auto: sinAutos, granos: 1e6,
      estratos: { ...s.estratos, abiertos: 8, s: [200, 190, 180, 170, 160, 150, 140, CFG1.estratos.meta_1_1_estrato8_log10] },
      defectos: { ...s.defectos, completos: ['vacancia', 'dislocacion', 'macla'] },
    }
    expect(tick(casi, 1).escarcha.abierta).toBe(false)
    const listo = { ...casi, defectos: { ...casi.defectos, completos: [...casi.defectos.completos, 'impureza'] } }
    const n = tick(listo, 1)
    expect(n.escarcha.abierta).toBe(true)
    expect(tick({ ...n, estratos: s.estratos }, 1).escarcha.abierta).toBe(true)
  })

  it('romper: cada 30 min como mínimo, conserva la mitad y da ⌊logX × 0,5 / 10⌋ Esquirlas', () => {
    const s = abierta(100)
    expect(romperEscarcha(s)).toBe(s) // recién abierta: reloj en 0
    const listo = { ...s, escarcha: { ...s.escarcha, reloj: CFG1.escarcha.ruptura_bot_min * 60 } }
    const r = romperEscarcha(listo)
    expect(r.escarcha).toMatchObject({ logX: 50, esquirlas: 5, reloj: 0 })
    // Sin Deshielo, tick no la rompe sola.
    expect(tick({ ...listo, auto: { ...listo.auto, escarcha: true } }, 1).escarcha.esquirlas).toBe(0)
  })

  it('mejoras: cuestan 10^round(c0 + paso × L) Esquirlas', () => {
    const s = { ...abierta(0), escarcha: { ...abierta(0).escarcha, esquirlas: 13 } }
    expect(costoMejoraEscarcha(s, 'crecimiento')).toBe(1) // 10^0
    expect(costoMejoraEscarcha(s, 'brillo')).toBe(10) // 10^round(0,5)
    const n = mejorarEscarcha(mejorarEscarcha(s, 'crecimiento'), 'brillo')
    expect(n.escarcha.mejoras).toMatchObject({ crecimiento: 1, brillo: 1 })
    expect(n.escarcha.esquirlas).toBe(2)
    expect(mejorarEscarcha(n, 'aguante')).toBe(n) // 10 > 2
  })

  it('fuera de línea crece con el ×0,7 del tiempo, y se guarda', () => {
    const s = abierta(10)
    const a = fueraDeLinea(s, 3600, CFG1.fuera_de_linea_eficiencia)
    expect(a.s.escarcha.logX).toBeCloseTo(10 + 3600 * CFG1.fuera_de_linea_eficiencia * crecimientoEscarcha(s), 6)
    expect(a.escarchaAntes).toBe(10)
    const p = deserializar(serializar({ estado: a.s, guardadoEn: 0, vistos: {}, record: 0, logros: {} }))
    expect(p.estado.escarcha).toEqual(a.s.escarcha)
  })
})
