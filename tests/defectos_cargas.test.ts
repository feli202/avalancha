// Capa 2, fase 8: los Defectos con 5 cargas (docs/capa2/defectos_cargas.md). Reglas, metas, recompensas, Brasas y guardado.
import Decimal from 'break_infinity.js'
import { describe, expect, it } from 'vitest'
import {
  CFG1, CFG2, DEFECTOS, abandonarDefecto, baseAnillo, brasasAlFundir, cargaActual, cargaHecha, cargasCompletas, cascadaCExtra,
  colorSinEfecto, colorSX, coloresX, crecimientoEscarcha, cristalesVidrioLog10, densidadExtra, densidadFija, densidadX, enVidrio,
  entrarDefecto, estadoInicial, falta, fatigaLog10, fundir, ganarDefecto, hitoColor, metaLog10, multBrasas, presionX, puntoRuptura,
  sinPresion, type DefectoId, type State,
} from '../src/core'
import { deserializar, serializar, type Partida } from '../src/guardado/guardado'

const D = CFG1.defectos, DC = CFG2.defectos
const MARCA = { codigo: 'ABCD2345', desde: 1.71e12 }
const i0 = estadoInicial()
const conCargas = (c: Partial<Record<DefectoId, number>>) => DEFECTOS.map((d) => c[d] ?? 0)
/** Partida beta con Fallas y Fallas profundas, todos los Defectos superados en esta vuelta y las cargas dadas. */
const beta = (c: Partial<Record<DefectoId, number>> = {}, nodos = ['defectos', 'defectos2'], x: Partial<State> = {}): State => ({
  ...i0, infinitos: 5, ...x, defectos: { completos: [...DEFECTOS], actual: '', reintento: {} },
  fuego: { ...i0.fuego, fundiciones: 1, nodos, cargas: conCargas(c) },
})
/** Adentro de la carga n del Defecto (la n − 1 hecha). */
const enCarga = (id: DefectoId, n: number, x: Partial<State> = {}): State => {
  const s = beta({ [id]: n > 2 ? n - 1 : 0 }, undefined, x)
  return { ...s, defectos: { ...s.defectos, actual: id } }
}

describe('reglas de la carga n', () => {
  it('la meta sube k por carga (log10 de Energía)', () => {
    for (const d of DEFECTOS) for (let n = 1; n <= 5; n++) expect(metaLog10(d, n)).toBe(D[d].meta_log10 + DC.k[d] * (n - 1))
  })
  it('se entra a la carga siguiente a la hecha', () => {
    for (let n = 2; n <= 5; n++) expect(cargaActual(enCarga('macla', n))).toBe(n)
    expect(cargaActual(beta())).toBe(0)
    const c1 = { ...beta(), defectos: { completos: [], actual: 'macla', reintento: {} } }
    expect(cargaActual(c1)).toBe(1) // la de la Capa 1
  })
  it('Vacancia: los n colores más caros no multiplican', () => {
    for (let n = 1; n <= 5; n++) {
      const s = n === 1 ? { ...i0, defectos: { completos: [], actual: 'vacancia', reintento: {} } } : enCarga('vacancia', n)
      expect([0, 1, 2, 3].filter((i) => colorSinEfecto(s, i))).toEqual([3, 2, 1, 0].slice(0, Math.min(4, n)).reverse())
    }
  })
  it('Dislocación ×0,5^n de Presión, Macla ×0,85^n de Densidad, Impureza ×0,5^n de colores, Fatiga ÷10 cada 600/n s', () => {
    for (let n = 2; n <= 5; n++) {
      expect(presionX(enCarga('dislocacion', n))).toBeCloseTo(D.dislocacion.presion_x ** n, 12)
      expect(densidadX(enCarga('macla', n))).toBeCloseTo(D.macla.densidad_x ** n, 12)
      expect(coloresX(enCarga('impureza', n))).toBeCloseTo(D.impureza.colores_x ** n, 12)
      expect(fatigaLog10(enCarga('fatiga', n, { tiempoCorrida: 300 }))).toBeCloseTo((n * 300) / D.fatiga.decada_s, 12)
    }
  })
  it('Frontera, Inclusión y Vidrio: la misma regla, solo sube la meta', () => {
    expect([densidadFija(enCarga('frontera', 4)), sinPresion(enCarga('inclusion', 4)), enVidrio(enCarga('vidrio', 4))]).toEqual([true, true, true])
  })
  it('fuera del Defecto ninguna regla actúa, aunque haya cargas hechas', () => {
    const s = beta({ dislocacion: 5, macla: 5, impureza: 5, fatiga: 5 })
    expect([presionX(s), densidadX(s), coloresX(s), fatigaLog10({ ...s, tiempoCorrida: 900 }), colorSinEfecto(s, 3)]).toEqual([1, 1, 1, 0, false])
  })
})

describe('abrir, ganar, conservar', () => {
  it('Fallas abre las cargas de los Defectos 1–4; Fallas profundas, las de los 5–8', () => {
    expect([falta(beta({}, []), 'vacancia'), falta(beta({}, ['defectos']), 'vacancia'), falta(beta({}, ['defectos']), 'fatiga')]).toEqual(['hecho', '', 'hecho'])
    expect(falta(beta({}, ['defectos2']), 'vidrio')).toBe('')
    expect(falta(beta({ vacancia: 5 }), 'vacancia')).toBe('hecho') // las 5 hechas
    expect(falta(enCarga('macla', 2), 'vacancia')).toBe('otro')
    expect(entrarDefecto(beta(), 'impureza').defectos.actual).toBe('impureza')
  })
  it('ganar la carga n la deja hecha para siempre y da sus Brasas una vez', () => {
    for (let n = 2; n <= 5; n++) {
      const s = enCarga('frontera', n, { energia: Decimal.pow10(metaLog10('frontera', n)) })
      const g = ganarDefecto(s)
      expect(g.fuego.cargas[DEFECTOS.indexOf('frontera')]).toBe(n)
      expect([g.fuego.brasas, g.fuego.brasasTotales]).toEqual([DC.brasas_por_carga[n], DC.brasas_por_carga[n]])
      expect(g.defectos.completos.filter((d) => d === 'frontera')).toHaveLength(1)
      expect([g.defectos.actual, g.infinitos]).toEqual(['', s.infinitos + 1])
      expect(ganarDefecto({ ...s, energia: Decimal.pow10(metaLog10('frontera', n) - 1) })).not.toBe(g) // sin la meta, nada
    }
  })
  it('abandonar una carga no deja sugerencia de Cristales (es de la carga 1)', () => {
    expect(abandonarDefecto(enCarga('macla', 3)).defectos.reintento).toEqual({})
  })
  it('al fundir: las cargas quedan, los Defectos con carga 2+ arrancan completos y la carga 1 se rehace', () => {
    const s = { ...beta({ vacancia: 3, vidrio: 2 }), cristalesTotales: Decimal.pow10(CFG2.fundicion.requisito_log10) }
    const f = fundir(s)
    expect(f.fuego.cargas).toEqual(s.fuego.cargas)
    expect(f.defectos.completos).toEqual(['vacancia', 'vidrio'])
    expect([cargaHecha(f, 'vacancia'), cargaHecha(f, 'macla')]).toEqual([3, 0])
  })
})

describe('recompensas', () => {
  const e = (n: number) => 1 + (DC.recompensa_exp_carga5 - 1) * (n - 1) / 4
  it('la recompensa de la Capa 1 se eleva a 1 + 0,375 (n − 1); las que suman, multiplicadas', () => {
    for (let n = 1; n <= 5; n++) {
      const s = beta(Object.fromEntries(DEFECTOS.map((d) => [d, n > 1 ? n : 0])))
      expect(hitoColor(s)).toBeCloseTo(D.vacancia.recompensa_hito_mult ** e(n), 9)
      expect(baseAnillo(s)).toBeCloseTo(D.dislocacion.recompensa_anillo_mult ** e(n), 9)
      expect(colorSX(s)).toBeCloseTo(D.macla.recompensa_color_s_x ** e(n), 9)
      expect(cascadaCExtra(s)).toBeCloseTo(D.impureza.recompensa_cascada_c * e(n), 9)
      expect(densidadExtra(s)).toBeCloseTo(D.frontera.recompensa_densidad * e(n), 9)
      expect(cristalesVidrioLog10(s)).toBeCloseTo(D.vidrio.cristales_log10 * e(n), 9)
      const base = beta() // solo carga 1: las de la Escarcha, contra ella
      expect(crecimientoEscarcha(s) / crecimientoEscarcha(base)).toBeCloseTo(D.fatiga.recompensa_escarcha_g_x ** (e(n) - 1), 9)
      expect(puntoRuptura(s) / puntoRuptura(base)).toBeCloseTo(D.inclusion.recompensa_escarcha_P_x ** (e(n) - 1), 9)
    }
  })
  it('M_B ×1,002 por carga completa; Facetas de fuego ×(1 + 0,05 × cargas)', () => {
    const s = beta({ vacancia: 5, fatiga: 3 }) // 4 + 2 cargas
    expect(cargasCompletas(s)).toBe(6)
    expect(multBrasas(s)).toBeCloseTo(DC.MB_x_por_carga ** 6, 12)
    const f = beta({ vacancia: 5, fatiga: 3 }, ['defectos', 'cristalografia2'])
    expect(multBrasas(f)).toBeCloseTo(DC.MB_x_por_carga ** 6 * (1 + CFG2.red_fuego.cristalografia2.MB_por_carga * 6), 12)
    expect(brasasAlFundir({ ...f, cristalesTotales: Decimal.pow10(308) })).toBe(1) // ⌊1,31⌋
  })
})

describe('guardado', () => {
  const partida = (estado: State, b = true): Partida => ({ estado, guardadoEn: 1.7e12, vistos: {}, record: 0, logros: {}, ...(b && { beta: MARCA }) })
  it('las cargas se guardan en la beta; una partida de la fase 7 (sin cargas) arranca en 0; la pública no tiene', () => {
    const s = beta({ macla: 4, vidrio: 2 })
    expect(deserializar(serializar(partida(s))).estado.fuego.cargas).toEqual(s.fuego.cargas)
    const vieja = JSON.parse(serializar(partida(s)))
    delete vieja.estado.fuego.cargas
    expect(deserializar(JSON.stringify(vieja)).estado.fuego.cargas).toEqual(conCargas({}))
    expect(deserializar(serializar(partida(s, false))).estado.fuego.cargas).toEqual(conCargas({}))
    vieja.estado.fuego.cargas = [9, -1, 2.5, 0, 0, 0, 0, 0] // editada a mano: a 0–5
    expect(deserializar(JSON.stringify(vieja)).estado.fuego.cargas).toEqual([5, 0, 2, 0, 0, 0, 0, 0])
  })
})
