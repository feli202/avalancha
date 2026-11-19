// Los 24 logros de la Capa 0: cada uno con textos, mini pila y una recompensa cosmética; 8 de cada tipo, sin repetir.
import { describe, expect, it } from 'vitest'
import { estadoInicial } from '../src/core'
import { EFECTOS, MARCOS, PALETAS } from '../src/render/paletas'
import { ESCENAS } from '../src/render/miniPilas'
import { en } from '../src/strings/en'
import { es } from '../src/strings/es'
import { CAPAS, LOGROS, LOGROS_C1, RECOMPENSA, desbloqueados, elegido, nuevosLogros } from '../src/ui/logros'
import { ANILLO3, INFINITO, NIVEL_MAX_RED } from '../src/core'
import { FONDOS } from '../src/render/paletas'

const claves = Object.keys(LOGROS)

describe('logros', () => {
  it('son 24, con textos, escena y recompensa', () => {
    expect(claves).toHaveLength(24)
    for (const k of claves) {
      expect(es.logros.lista[k], k).toBeDefined()
      expect(ESCENAS[k], k).toBeDefined()
      expect(RECOMPENSA[k], k).toBeDefined()
    }
    expect(Object.keys(RECOMPENSA).sort()).toEqual([...claves, ...Object.keys(LOGROS_C1)].sort())
  })

  it('las recompensas son 8 paletas, 8 efectos y 8 marcos, todas distintas y existentes', () => {
    const todos = { paleta: Object.keys(PALETAS), efecto: EFECTOS, marco: MARCOS }
    for (const tipo of ['paleta', 'efecto', 'marco'] as const) {
      const ids = claves.map((k) => RECOMPENSA[k]).filter(([t]) => t === tipo).map(([, id]) => id)
      expect(ids, tipo).toHaveLength(8)
      expect(new Set(ids).size, tipo).toBe(8)
      for (const id of ids) {
        expect(todos[tipo].slice(1), `${tipo} ${id}`).toContain(id) // el primero es el de siempre, no se gana
        expect(es.cosmeticos[tipo][id], `${tipo} ${id}`).toBeDefined()
      }
    }
  })

  it('Capa 1: Primer Cristal y los 8 de la 1.2, con textos, escena y recompensa nueva que existe', () => {
    const c1 = Object.keys(LOGROS_C1)
    expect(c1).toHaveLength(9)
    expect(CAPAS[1].logros).toEqual(c1)
    const todos: Record<string, string[]> = { paleta: Object.keys(PALETAS), efecto: EFECTOS, marco: MARCOS, fondo: FONDOS }
    const usados = new Set(claves.map((k) => RECOMPENSA[k].join(':')))
    for (const k of c1) {
      expect([es.logros.lista[k], en.logros.lista[k], ESCENAS[k]], k).not.toContain(undefined)
      const [tipo, id] = RECOMPENSA[k]
      expect(todos[tipo], `${k}: ${tipo}:${id}`).toContain(id)
      expect(usados.has(`${tipo}:${id}`), `${tipo}:${id} repetido`).toBe(false)
      usados.add(`${tipo}:${id}`)
    }
  })

  it('Capa 1: cada condición', () => {
    const s = estadoInicial()
    const ganados = (x: typeof s) => nuevosLogros(x, 0, {}).filter((k) => k in LOGROS_C1)
    expect(ganados(s)).toEqual([])
    expect(CAPAS[1].abierta(s)).toBe(false)
    expect(ganados({ ...s, infinitos: 1 })).toContain('cristal')
    expect(CAPAS[1].abierta({ ...s, infinitos: 1 })).toBe(true)
    const esc = { ...s.escarcha, abierta: true }
    expect(ganados({ ...s, escarcha: esc })).toEqual(['escarcha'])
    expect(ganados({ ...s, escarcha: { ...esc, esquirlas: 1 } })).toContain('romper')
    expect(ganados({ ...s, escarcha: { ...esc, mejoras: { ...esc.mejoras, brillo: 1 } } })).toContain('romper')
    const red = Object.fromEntries([...ANILLO3].map((id) => [id, NIVEL_MAX_RED]))
    expect(ganados({ ...s, red: { ...s.red, ...red } })).toContain('anillo3')
    expect(ganados({ ...s, red: { ...s.red, ...red, [[...ANILLO3][0]]: NIVEL_MAX_RED - 1 } })).not.toContain('anillo3')
    for (const d of ['fatiga', 'frontera', 'inclusion', 'vidrio'])
      expect(ganados({ ...s, defectos: { ...s.defectos, completos: [d] } })).toEqual([d])
    expect(ganados({ ...s, cristalesTotales: INFINITO.div(10) })).not.toContain('finCapa')
    expect(ganados({ ...s, cristalesTotales: INFINITO })).toContain('finCapa')
  })

  it('una partida nueva no tiene logros y solo los cosméticos de siempre', () => {
    expect(nuevosLogros(estadoInicial(), 0, {})).toEqual([])
    expect(desbloqueados('paleta', Object.keys(PALETAS), {})).toEqual(['arena'])
    expect(desbloqueados('paleta', Object.keys(PALETAS), { granos: true })).toEqual(['arena', 'brasa'])
    expect(elegido('paleta', Object.keys(PALETAS), 'brasa', {})).toBe('arena') // elegida pero no ganada
  })
})

// shortcut: solo compara claves, no que el texto esté bien traducido.
describe('en.ts', () => {
  const claves = (o: unknown, p = ''): string[] =>
    o && typeof o === 'object' ? Object.entries(o).flatMap(([k, v]) => [p + k, ...claves(v, `${p}${k}.`)]) : []
  it('tiene las mismas claves que es.ts', () => expect(claves(en).sort()).toEqual(claves(es).sort()))
})

describe('logros secretos (I10)', async () => {
  const { SISTEMA, secreto } = await import('../src/ui/logros')
  it('todo SISTEMA apunta a logros que existen', () => for_(Object.keys(SISTEMA)))
  const for_ = (ks: string[]) => ks.forEach((k) => expect(LOGROS[k] ?? LOGROS_C1[k], k).toBeDefined())
  it('sin el sistema visto y sin conseguir: secreto; conseguido o visto: no', () => {
    expect(secreto('cascada', {}, {})).toBe(true)
    expect(secreto('cascada', {}, { cascada: true })).toBe(false)
    expect(secreto('cascada', { cascada: true }, {})).toBe(false)
    expect(secreto('derrumbe', {}, {})).toBe(false)
  })
})
